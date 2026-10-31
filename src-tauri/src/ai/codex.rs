use std::collections::HashMap;
use std::path::Path;
use std::process::Stdio;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use serde::Serialize;
use serde_json::{Value, json};
use tauri::Manager;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::{Mutex, oneshot};

use super::common::{Probe, Program, check_content, collect_stderr, system_prompt, valid_model};
use super::mcp::{Mcp, TOKEN_ENV};
use crate::db::Db;

// OpenAI Codex through `codex app-server`: JSON-RPC over stdio, the protocol Codex's own IDE
// extensions use. One long-lived process per chat, like Claude. Codex is a coding agent, so the
// lockdown lives here and the webview can't loosen it: read-only sandbox, never ask for
// approval, every built-in tool family off, and of MCP servers only ours.

const CODEX: Program = Program {
    stem: "codex",
    name: "Codex",
    setting: "ai:codex:bin",
    home_dirs: &[],
};

/// The oldest app-server protocol this was built and checked against. Older versions differ
/// enough to hang a turn (0.128 couldn't read today's model list).
const MIN_VERSION: [u32; 3] = [0, 165, 0];
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);
const LOGIN_TIMEOUT: Duration = Duration::from_secs(10 * 60);

/// Built-in tool families switched off. `code_mode_host` stays on: Codex reaches MCP tools
/// through it, and with the shell off and a read-only sandbox it can't read or write files.
const DISABLED_FEATURES: [&str; 22] = [
    "shell_tool",
    "unified_exec",
    "unified_exec_tty",
    "apps",
    "plugins",
    "remote_plugin",
    "browser_use",
    "browser_use_external",
    "computer_use",
    "in_app_browser",
    "in_app_local_automation",
    "image_generation",
    "multi_agent",
    "hooks",
    "goals",
    "sleep_tool",
    "view_image",
    "skill_search",
    "tool_suggest",
    "skill_mcp_dependency_install",
    "workspace_dependencies",
    "memories",
];

type Pending = Arc<std::sync::Mutex<HashMap<u64, oneshot::Sender<Result<Value, String>>>>>;

/// A running app-server and the requests waiting on it. Dropping it kills the process.
struct Rpc {
    _child: Child,
    stdin: Arc<Mutex<ChildStdin>>,
    next: AtomicU64,
    pending: Pending,
}

async fn write_line(stdin: &Mutex<ChildStdin>, value: &Value) -> Result<(), String> {
    let mut stdin = stdin.lock().await;
    stdin
        .write_all(format!("{value}\n").as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    stdin.flush().await.map_err(|e| e.to_string())
}

impl Rpc {
    /// Starts `codex app-server` and reads its stdout: responses settle their request,
    /// notifications go to `on_event`, and requests from Codex (approvals, questions) are
    /// refused. When the process ends, `on_event` gets `{"method":"exit"}` with its stderr.
    async fn start(
        mut command: Command,
        on_event: impl Fn(String) + Send + 'static,
    ) -> Result<Self, String> {
        let mut child = command
            .arg("app-server")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| format!("could not start codex: {e}"))?;
        let stdin = Arc::new(Mutex::new(child.stdin.take().ok_or("no stdin")?));
        let stdout = child.stdout.take().ok_or("no stdout")?;
        let stderr = child.stderr.take().ok_or("no stderr")?;
        let pending: Pending = Arc::default();

        let stderr_text = collect_stderr(stderr);

        let (reader_pending, reader_stdin) = (pending.clone(), stdin.clone());
        tauri::async_runtime::spawn(async move {
            let mut lines = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let Ok(message) = serde_json::from_str::<Value>(&line) else {
                    continue;
                };
                match (message.get("id"), message.get("method")) {
                    (Some(id), None) => {
                        let waiting = id
                            .as_u64()
                            .and_then(|id| reader_pending.lock().unwrap().remove(&id));
                        if let Some(tx) = waiting {
                            let result = match message.get("error") {
                                Some(error) => Err(error["message"]
                                    .as_str()
                                    .unwrap_or("Codex returned an error")
                                    .to_owned()),
                                None => Ok(message["result"].clone()),
                            };
                            let _ = tx.send(result);
                        }
                    }
                    (Some(id), Some(_)) => {
                        let refusal = json!({ "id": id, "error": {
                            "code": -32601, "message": "Not available in AvanzaDesk" } });
                        let _ = write_line(&reader_stdin, &refusal).await;
                    }
                    _ => on_event(line),
                }
            }
            // stdout closed: the process exited. Waiting requests fail now, not at their timeout.
            for (_, tx) in reader_pending.lock().unwrap().drain() {
                let _ = tx.send(Err("Codex exited".into()));
            }
            let stderr = stderr_text.lock().await.clone();
            on_event(json!({ "method": "exit", "params": { "stderr": stderr } }).to_string());
        });

        let rpc = Self {
            _child: child,
            stdin,
            next: AtomicU64::new(1),
            pending,
        };
        let client = json!({ "name": "avanza-desk", "title": "AvanzaDesk",
            "version": env!("CARGO_PKG_VERSION") });
        rpc.request(
            "initialize",
            json!({ "clientInfo": client, "capabilities": null }),
        )
        .await?;
        write_line(&rpc.stdin, &json!({ "method": "initialized" })).await?;
        Ok(rpc)
    }

    async fn request(&self, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next.fetch_add(1, Ordering::Relaxed);
        let (tx, rx) = oneshot::channel();
        self.pending.lock().unwrap().insert(id, tx);
        let message = json!({ "id": id, "method": method, "params": params });
        if let Err(e) = write_line(&self.stdin, &message).await {
            self.pending.lock().unwrap().remove(&id);
            return Err(e);
        }
        match tokio::time::timeout(REQUEST_TIMEOUT, rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_)) => Err("Codex exited".into()),
            Err(_) => {
                self.pending.lock().unwrap().remove(&id);
                Err(format!("Codex did not answer {method} in time"))
            }
        }
    }
}

/// `codex-cli 0.165.0` → [0, 165, 0]; None when it doesn't read as a version.
fn parse_version(text: &str) -> Option<[u32; 3]> {
    let token = text.split_whitespace().last()?;
    let mut parts = token.split(['.', '-']).map(|p| p.parse::<u32>().ok());
    Some([parts.next()??, parts.next()??, parts.next()??])
}

/// Everything the setup screen needs: which binary, its version, sign-in and models. Sends no
/// message to the model, so it costs no usage.
#[tauri::command]
pub async fn codex_probe(db: tauri::State<'_, Db>) -> Result<Probe, String> {
    let (mut probe, started) = Probe::start(&CODEX, &db).await;
    let Some((bin, text)) = started else {
        return Ok(probe);
    };
    let Some(version) = parse_version(&text) else {
        probe.error = Some(format!("Unexpected version: {}", text.trim()));
        return Ok(probe);
    };
    probe.version = Some(version.map(|n| n.to_string()).join("."));
    if version < MIN_VERSION {
        let min = MIN_VERSION.map(|n| n.to_string()).join(".");
        probe.error = Some(format!(
            "AvanzaDesk needs Codex {min} or later. Run `codex update` in a terminal."
        ));
        return Ok(probe);
    }
    if let Err(error) = read_account(&bin, &mut probe).await {
        probe.error = Some(error);
    }
    Ok(probe)
}

async fn read_account(bin: &Path, probe: &mut Probe) -> Result<(), String> {
    let rpc = Rpc::start(Command::new(bin), |_| {}).await?;
    let account = rpc.request("account/read", json!({})).await?;
    probe.account = Some(account["account"].clone()).filter(|a| !a.is_null());
    probe.logged_in = probe.account.is_some();
    if probe.logged_in {
        let models = rpc.request("model/list", json!({})).await?;
        probe.models = models["data"].as_array().cloned().unwrap_or_default();
    }
    Ok(())
}

/// A sign-in in progress: its app-server waits for the browser to finish, then is dropped.
#[derive(Default)]
pub struct Login(Arc<Mutex<Option<(u64, Rpc)>>>);

static LOGIN_ID: AtomicU64 = AtomicU64::new(0);

/// Starts a ChatGPT sign-in and returns the URL to open in the browser. Codex receives the
/// result itself; the setup screen's re-checks notice when it's done.
#[tauri::command]
pub async fn codex_login(
    db: tauri::State<'_, Db>,
    login: tauri::State<'_, Login>,
) -> Result<String, String> {
    let state = login.0.clone();
    let id = LOGIN_ID.fetch_add(1, Ordering::Relaxed);
    let done = state.clone();
    let rpc = Rpc::start(Command::new(CODEX.resolve_or_err(&db)?), move |line| {
        if line.contains("\"account/login/completed\"") {
            let done = done.clone();
            tauri::async_runtime::spawn(async move {
                let mut current = done.lock().await;
                if current.as_ref().is_some_and(|(current, _)| *current == id) {
                    current.take();
                }
            });
        }
    })
    .await?;
    let started = rpc
        .request("account/login/start", json!({ "type": "chatgpt" }))
        .await?;
    let url = started["authUrl"]
        .as_str()
        .filter(|url| url.starts_with("https://"))
        .ok_or("Codex returned no sign-in link")?
        .to_owned();
    // Replaces (and ends) an earlier, unfinished sign-in.
    *state.lock().await = Some((id, rpc));
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(LOGIN_TIMEOUT).await;
        let mut current = state.lock().await;
        if current.as_ref().is_some_and(|(current, _)| *current == id) {
            current.take();
        }
    });
    Ok(url)
}

/// The running chat: its app-server, thread and the turn in progress.
#[derive(Default)]
pub struct Chat(Mutex<Option<Session>>);

pub struct Session {
    rpc: Rpc,
    thread_id: String,
    /// The model the thread runs on, as Codex reports it.
    model: Option<String>,
    turn_id: Option<String>,
}

/// How the webview wants the conversation run (src/lib/ai/types.ts `SessionOptions`).
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartOptions {
    model: Option<String>,
    instructions: Option<String>,
    #[serde(default)]
    web_search: bool,
    persist: bool,
    /// A thread id to continue.
    resume: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Started {
    thread_id: String,
    model: Option<String>,
}

/// Starts an app-server (replacing any running one) and a thread on it, new or resumed.
/// Notifications stream to `on_event` as raw JSON lines.
#[tauri::command]
pub async fn codex_start(
    app: tauri::AppHandle,
    db: tauri::State<'_, Db>,
    chat: tauri::State<'_, Chat>,
    mcp: tauri::State<'_, Arc<Mcp>>,
    on_event: Channel<String>,
    options: StartOptions,
) -> Result<Started, String> {
    // Run outside any project so no AGENTS.md or project config leaks into the chat.
    let cwd = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&cwd).map_err(|e| e.to_string())?;
    chat.0.lock().await.take();
    let bin = CODEX.resolve_or_err(&db)?;
    let on_event = move |line| {
        let _ = on_event.send(line);
    };
    let session = start_session(&bin, &cwd, (&mcp.url, &mcp.token), options, on_event).await?;
    let started = Started {
        thread_id: session.thread_id.clone(),
        model: session.model.clone(),
    };
    *chat.0.lock().await = Some(session);
    Ok(started)
}

/// What `codex_start` does once it knows where: the locked-down app-server and its thread.
async fn start_session(
    bin: &Path,
    cwd: &Path,
    (mcp_url, mcp_token): (&str, &str),
    options: StartOptions,
    on_event: impl Fn(String) + Send + 'static,
) -> Result<Session, String> {
    let StartOptions {
        model,
        instructions,
        web_search,
        persist,
        resume,
    } = options;
    let prompt = system_prompt(instructions.as_deref())?;
    let mut command = Command::new(bin);
    command
        .args([
            "-c",
            if web_search {
                "web_search=\"live\""
            } else {
                "web_search=\"disabled\""
            },
        ])
        .args(DISABLED_FEATURES.iter().flat_map(|f| ["--disable", f]))
        .env(TOKEN_ENV, mcp_token)
        .current_dir(cwd);
    let rpc = Rpc::start(command, on_event).await?;

    // The user's own MCP servers merge in from their config; switch each off by name.
    let config = rpc
        .request("config/read", json!({ "includeLayers": false, "cwd": cwd }))
        .await?;
    let mut servers: serde_json::Map<String, Value> = config["config"]["mcp_servers"]
        .as_object()
        .map(|servers| {
            servers
                .keys()
                .map(|name| (name.clone(), json!({ "enabled": false })))
                .collect()
        })
        .unwrap_or_default();
    servers.insert(
        "avanza".into(),
        json!({ "url": mcp_url, "bearer_token_env_var": TOKEN_ENV }),
    );

    let mut params = json!({
        "cwd": cwd,
        "approvalPolicy": "never",
        "sandbox": "read-only",
        "developerInstructions": prompt,
        "config": { "mcp_servers": servers },
    });
    if let Some(model) = model.filter(|m| valid_model(m)) {
        params["model"] = json!(model);
    }
    let response = match resume.filter(|id| uuid::Uuid::parse_str(id).is_ok()) {
        Some(id) => {
            params["threadId"] = json!(id);
            rpc.request("thread/resume", params).await?
        }
        None => {
            // A temporary chat: nothing written to Codex's session files either.
            params["ephemeral"] = json!(!persist);
            rpc.request("thread/start", params).await?
        }
    };
    let thread_id = response["thread"]["id"]
        .as_str()
        .ok_or("Codex started no thread")?
        .to_owned();
    Ok(Session {
        rpc,
        thread_id,
        model: response["model"].as_str().map(str::to_owned),
        turn_id: None,
    })
}

/// Our content blocks (text, base64 images) as Codex user input.
fn to_input(content: &Value) -> Vec<Value> {
    content
        .as_array()
        .into_iter()
        .flatten()
        .map(|block| match block["type"].as_str() {
            Some("image") => {
                let source = &block["source"];
                let url = format!(
                    "data:{};base64,{}",
                    source["media_type"].as_str().unwrap_or_default(),
                    source["data"].as_str().unwrap_or_default()
                );
                json!({ "type": "image", "url": url })
            }
            _ => json!({ "type": "text", "text": block["text"], "text_elements": [] }),
        })
        .collect()
}

/// Effort names Codex uses ("low" … "xhigh"): plain words only.
fn valid_effort(effort: &str) -> bool {
    !effort.is_empty() && effort.len() <= 16 && effort.chars().all(|c| c.is_ascii_lowercase())
}

/// Starts a turn with the user's message; `model` and `effort` apply from this turn on.
#[tauri::command]
pub async fn codex_send(
    chat: tauri::State<'_, Chat>,
    content: Value,
    model: Option<String>,
    effort: Option<String>,
) -> Result<(), String> {
    check_content(&content)?;
    let mut session = chat.0.lock().await;
    let session = session.as_mut().ok_or("codex is not running")?;
    let mut params = json!({ "threadId": session.thread_id, "input": to_input(&content) });
    if let Some(model) = model.filter(|m| valid_model(m)) {
        params["model"] = json!(model);
    }
    if let Some(effort) = effort.filter(|e| valid_effort(e)) {
        params["effort"] = json!(effort);
    }
    let response = session.rpc.request("turn/start", params).await?;
    session.turn_id = response["turn"]["id"].as_str().map(str::to_owned);
    Ok(())
}

/// Stops the current turn; the process and thread stay alive.
#[tauri::command]
pub async fn codex_interrupt(chat: tauri::State<'_, Chat>) -> Result<(), String> {
    let session = chat.0.lock().await;
    let session = session.as_ref().ok_or("codex is not running")?;
    let Some(turn_id) = &session.turn_id else {
        return Ok(());
    };
    let params = json!({ "threadId": session.thread_id, "turnId": turn_id });
    session
        .rpc
        .request("turn/interrupt", params)
        .await
        .map(|_| ())
}

/// Ends the app-server (new chat, the panel closed, or another binary picked).
#[tauri::command]
pub async fn codex_stop(chat: tauri::State<'_, Chat>) -> Result<(), String> {
    chat.0.lock().await.take();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn versions_compare_as_numbers() {
        assert_eq!(parse_version("codex-cli 0.165.0"), Some([0, 165, 0]));
        assert_eq!(parse_version("codex-cli 1.2.3-beta.1"), Some([1, 2, 3]));
        assert_eq!(parse_version("codex"), None);
        assert!(parse_version("codex-cli 0.128.0").unwrap() < MIN_VERSION);
        assert!(parse_version("codex-cli 0.200.1").unwrap() >= MIN_VERSION);
    }

    #[test]
    fn content_becomes_codex_input() {
        let content = json!([
            { "type": "text", "text": "hi" },
            { "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "QUJD" } },
        ]);
        assert_eq!(
            to_input(&content),
            vec![
                json!({ "type": "text", "text": "hi", "text_elements": [] }),
                json!({ "type": "image", "url": "data:image/png;base64,QUJD" }),
            ]
        );
    }

    #[test]
    fn efforts_are_plain_words() {
        assert!(valid_effort("xhigh"));
        assert!(!valid_effort("high --x"));
        assert!(!valid_effort(""));
    }

    /// A locked-down session answers a message end to end. No MCP server listens at the URL, so
    /// the model has nothing to call.
    #[tokio::test]
    #[ignore]
    async fn session_answers_a_message() {
        let bin = CODEX.detect().expect("codex installed");
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();
        let options = StartOptions {
            model: None,
            instructions: None,
            web_search: false,
            persist: false,
            resume: None,
        };
        let mcp = ("http://127.0.0.1:9/mcp", "token");
        let mut session = start_session(&bin, &std::env::temp_dir(), mcp, options, move |line| {
            let _ = tx.send(line);
        })
        .await
        .unwrap();
        let input = to_input(&json!([{ "type": "text", "text": "Reply with the word pong." }]));
        let turn = session
            .rpc
            .request(
                "turn/start",
                json!({ "threadId": session.thread_id, "input": input, "effort": "low" }),
            )
            .await
            .unwrap();
        session.turn_id = turn["turn"]["id"].as_str().map(str::to_owned);
        let mut text = String::new();
        let done = tokio::time::timeout(Duration::from_secs(120), async {
            while let Some(line) = rx.recv().await {
                let event: Value = serde_json::from_str(&line).unwrap();
                match event["method"].as_str() {
                    Some("item/agentMessage/delta") => {
                        text.push_str(event["params"]["delta"].as_str().unwrap())
                    }
                    Some("turn/completed") => return event["params"]["turn"]["status"].clone(),
                    Some("exit") => panic!("codex exited: {}", event["params"]["stderr"]),
                    _ => {}
                }
            }
            Value::Null
        })
        .await
        .expect("turn finished in time");
        assert_eq!(done, "completed");
        assert!(text.to_lowercase().contains("pong"), "answer: {text}");
    }

    // Talks to the real CLI; run with `cargo test -- --ignored` on a machine with codex.
    #[tokio::test]
    #[ignore]
    async fn probe_reads_account_and_models() {
        let bin = CODEX.detect().expect("codex installed");
        let mut probe = Probe::default();
        read_account(&bin, &mut probe).await.unwrap();
        assert!(probe.logged_in, "sign in to codex first");
        assert!(!probe.models.is_empty());
    }
}
