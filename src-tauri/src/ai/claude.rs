use std::path::Path;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;

use tauri::Manager;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, Command};
use tokio::sync::Mutex;

use super::common::{
    Probe, Program, check_content, collect_stderr, run_for, system_prompt, valid_model,
};
use super::mcp::{Mcp, TOKEN_ENV};
use crate::db::Db;

const CLAUDE: Program = Program {
    stem: "claude",
    name: "Claude Code",
    setting: "ai:claude:bin",
    home_dirs: &[".claude/local"],
};
const PROBE_TIMEOUT: Duration = Duration::from_secs(20);

/// The running `claude` process: one per chat, kept alive between messages like the Agent SDK
/// does, talking stream-json over stdin/stdout.
#[derive(Default)]
pub struct Chat(Mutex<Option<Session>>);

pub struct Session {
    // Held so dropping the session kills the process (kill_on_drop).
    _child: Child,
    stdin: ChildStdin,
}

/// Everything the setup screen needs: which binary, its version, sign-in and models. Sends no
/// message to Claude, so it costs no usage.
#[tauri::command]
pub async fn claude_probe(db: tauri::State<'_, Db>) -> Result<Probe, String> {
    let (mut probe, started) = Probe::start(&CLAUDE, &db).await;
    let Some((bin, version)) = started else {
        return Ok(probe);
    };
    probe.version = version.split_whitespace().next().map(str::to_owned);
    let status = run_for(Command::new(&bin).args(["auth", "status", "--json"])).await;
    probe.logged_in = status
        .ok()
        .and_then(|out| serde_json::from_slice::<serde_json::Value>(&out.stdout).ok())
        .and_then(|json| json["loggedIn"].as_bool())
        .unwrap_or(false);
    if probe.logged_in {
        match tokio::time::timeout(PROBE_TIMEOUT, initialize(&bin)).await {
            Ok(Ok(init)) => {
                probe.account = Some(init["account"].clone());
                probe.models = init["models"].as_array().cloned().unwrap_or_default();
            }
            Ok(Err(error)) => probe.error = Some(error),
            Err(_) => probe.error = Some("Claude Code did not answer in time".into()),
        }
    }
    Ok(probe)
}

/// Runs the stream-json initialize handshake (what the Agent SDK sends first) and returns its
/// response; the process is killed right after.
async fn initialize(bin: &Path) -> Result<serde_json::Value, String> {
    let mut child = Command::new(bin)
        .args([
            "-p",
            "--input-format",
            "stream-json",
            "--output-format",
            "stream-json",
        ])
        .args([
            "--verbose",
            "--tools",
            "",
            "--setting-sources",
            "",
            "--strict-mcp-config",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| e.to_string())?;
    let mut stdin = child.stdin.take().ok_or("no stdin")?;
    let request =
        r#"{"type":"control_request","request_id":"probe","request":{"subtype":"initialize"}}"#;
    stdin
        .write_all(format!("{request}\n").as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    stdin.flush().await.map_err(|e| e.to_string())?;
    let mut lines = BufReader::new(child.stdout.take().ok_or("no stdout")?).lines();
    while let Ok(Some(line)) = lines.next_line().await {
        let Ok(event) = serde_json::from_str::<serde_json::Value>(&line) else {
            continue;
        };
        if event["type"] == "control_response" && event["response"]["request_id"] == "probe" {
            return Ok(event["response"]["response"].clone());
        }
    }
    Err("Claude Code exited before answering".into())
}

const EFFORTS: [&str; 5] = ["low", "medium", "high", "xhigh", "max"];
/// How the webview wants the conversation run (src/lib/ai/types.ts `SessionOptions`).
#[derive(serde::Deserialize)]
pub struct StartOptions {
    model: Option<String>,
    effort: Option<String>,
    instructions: Option<String>,
    #[serde(default, rename = "webSearch")]
    web_search: bool,
    persist: bool,
    /// A session id to continue.
    resume: Option<String>,
}

/// Starts a new claude process (replacing any running one) and streams its stdout lines,
/// unparsed, to `on_event`. `resume` continues an earlier session.
#[tauri::command]
pub async fn chat_start(
    app: tauri::AppHandle,
    db: tauri::State<'_, Db>,
    chat: tauri::State<'_, Chat>,
    mcp: tauri::State<'_, Arc<Mcp>>,
    on_event: Channel<String>,
    options: StartOptions,
) -> Result<(), String> {
    let StartOptions {
        model,
        effort,
        instructions,
        web_search,
        persist,
        resume,
    } = options;
    let prompt = system_prompt(instructions.as_deref())?;
    // Run outside any project so no CLAUDE.md or project settings leak into the chat.
    let cwd = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let mut command = Command::new(CLAUDE.resolve_or_err(&db)?);
    command
        .args([
            "-p",
            "--input-format",
            "stream-json",
            "--output-format",
            "stream-json",
        ])
        .args(["--verbose", "--include-partial-messages"])
        // Of the built-in tools at most web search (no Bash, Edit, WebFetch, …), no user hooks or
        // plugins' settings. No WebFetch: a page could get the user's data put into a URL.
        .args(["--tools", if web_search { "WebSearch" } else { "" }])
        .args(["--setting-sources", ""])
        .args(["--strict-mcp-config", "--mcp-config", &mcp.config()])
        .env(TOKEN_ENV, &mcp.token)
        .args(["--allowedTools", "mcp__avanza__*,WebSearch"])
        .args(["--append-system-prompt", &prompt])
        .current_dir(cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    if let Some(model) = model.filter(|m| valid_model(m)) {
        command.args(["--model", &model]);
    }
    if let Some(effort) = effort.filter(|e| EFFORTS.contains(&e.as_str())) {
        command.args(["--effort", &effort]);
    }
    if !persist {
        // A temporary chat: nothing written to Claude Code's session files either.
        command.arg("--no-session-persistence");
    }
    if let Some(id) = resume.filter(|id| uuid::Uuid::parse_str(id).is_ok()) {
        command.args(["--resume", &id]);
    }
    let mut child = command
        .spawn()
        .map_err(|e| format!("could not start claude: {e}"))?;
    let stdin = child.stdin.take().ok_or("no stdin")?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;
    *chat.0.lock().await = Some(Session {
        _child: child,
        stdin,
    });

    let stderr_text = collect_stderr(stderr);
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if on_event.send(line).is_err() {
                return;
            }
        }
        // stdout closed: the process exited. Not a stream-json type; the webview handles it.
        let stderr = stderr_text.lock().await.clone();
        let _ = on_event.send(serde_json::json!({ "type": "exit", "stderr": stderr }).to_string());
    });
    Ok(())
}

async fn write_line(chat: &Chat, value: serde_json::Value) -> Result<(), String> {
    let mut session = chat.0.lock().await;
    let session = session.as_mut().ok_or("claude is not running")?;
    let line = format!("{value}\n");
    session
        .stdin
        .write_all(line.as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    session.stdin.flush().await.map_err(|e| e.to_string())
}

fn control_request(request: serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "type": "control_request",
        "request_id": uuid::Uuid::new_v4().to_string(),
        "request": request,
    })
}

#[tauri::command]
pub async fn chat_send(
    chat: tauri::State<'_, Chat>,
    content: serde_json::Value,
) -> Result<(), String> {
    check_content(&content)?;
    let message = serde_json::json!({
        "type": "user",
        "message": { "role": "user", "content": content },
    });
    write_line(&chat, message).await
}

/// Stops the current turn; the process and conversation stay alive.
#[tauri::command]
pub async fn chat_interrupt(chat: tauri::State<'_, Chat>) -> Result<(), String> {
    write_line(
        &chat,
        control_request(serde_json::json!({ "subtype": "interrupt" })),
    )
    .await
}

/// Switches the running chat to another model; the next turn uses it.
#[tauri::command]
pub async fn chat_set_model(chat: tauri::State<'_, Chat>, model: String) -> Result<(), String> {
    if !valid_model(&model) {
        return Err(format!("invalid model {model}"));
    }
    let request = serde_json::json!({ "subtype": "set_model", "model": model });
    write_line(&chat, control_request(request)).await
}

/// Kills the claude process (new chat, the panel closed, or another binary picked).
#[tauri::command]
pub async fn chat_stop(chat: tauri::State<'_, Chat>) -> Result<(), String> {
    chat.0.lock().await.take();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Talks to the real CLI; run with `cargo test -- --ignored` on a machine with claude.
    #[tokio::test]
    #[ignore]
    async fn initialize_lists_models() {
        let bin = CLAUDE.detect().expect("claude installed");
        let init = initialize(&bin).await.unwrap();
        assert!(!init["models"].as_array().unwrap().is_empty());
    }
}
