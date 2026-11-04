// The API providers: Claude (Anthropic Messages API) and OpenAI (Responses API) with the user's
// own key, nothing to install. The tool loop runs here and calls the webview's tools through
// `Mcp::call`. Events go to the webview in the claude CLI's stream-json shapes
// (src/lib/ai/claude/stream.ts), so every Claude-shaped provider shares one event mapping; each
// vendor module turns its own stream into those shapes.

mod anthropic;
mod openai;

use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::async_runtime::JoinHandle;
use tauri::ipc::Channel;
use tokio::sync::Mutex;

use super::common::{check_content, system_prompt, valid_model};
use super::mcp::Mcp;

/// Model calls in one turn before it gives up: a guard against a tool loop that never ends.
const MAX_STEPS: usize = 40;
const EFFORTS: [&str; 6] = ["minimal", "low", "medium", "high", "xhigh", "max"];

#[derive(Deserialize, Clone, Copy, PartialEq, Eq, Hash, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Vendor {
    Anthropic,
    Openai,
}

impl Vendor {
    fn name(self) -> &'static str {
        match self {
            Self::Anthropic => "the Claude API",
            Self::Openai => "the OpenAI API",
        }
    }

    fn key_entry(self) -> Result<keyring::Entry, String> {
        let user = match self {
            Self::Anthropic => "anthropic-api-key",
            Self::Openai => "openai-api-key",
        };
        keyring::Entry::new("avanza-desk", user).map_err(|e| e.to_string())
    }

    /// Keys are `sk-…` (Anthropic's `sk-ant-…`); anything else is a paste mistake, and the key
    /// goes into a header.
    fn valid_key(self, key: &str) -> bool {
        let prefix = match self {
            Self::Anthropic => "sk-ant-",
            Self::Openai => "sk-",
        };
        key.starts_with(prefix)
            && key.len() <= 256
            && key
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    }

    fn request(
        self,
        client: &reqwest::Client,
        method: reqwest::Method,
        path: &str,
        key: &str,
    ) -> reqwest::RequestBuilder {
        match self {
            Self::Anthropic => anthropic::request(client, method, path, key),
            Self::Openai => openai::request(client, method, path, key),
        }
    }

    fn load_key(self) -> Result<Option<String>, String> {
        match self.key_entry()?.get_password() {
            Ok(key) => Ok(Some(key)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    /// The API's error message for a failed response; both APIs use `{error: {message}}`.
    async fn error(self, response: reqwest::Response) -> String {
        let status = response.status();
        if status == reqwest::StatusCode::UNAUTHORIZED {
            return "The API key was rejected. Check it or create a new one.".into();
        }
        let body: serde_json::Value = response.json().await.unwrap_or_default();
        body["error"]["message"].as_str().map_or_else(
            || format!("{} answered {status}.", self.name()),
            str::to_owned,
        )
    }
}

/// One model call, put together from its stream.
struct Step {
    id: serde_json::Value,
    /// Claude-shaped content blocks for the webview: text and tool_use.
    content: serde_json::Value,
    /// In the Messages API's words: tool_use, end_turn, max_tokens, pause_turn, refusal.
    stop_reason: String,
    /// What goes into the vendor's history.
    history: Vec<serde_json::Value>,
}

/// A vendor's stream being read: each event becomes Claude-shaped events for the webview.
enum Reader {
    Anthropic(anthropic::Message),
    Openai(openai::Response),
}

impl Reader {
    fn apply(&mut self, event: &serde_json::Value) -> Result<Vec<serde_json::Value>, String> {
        match self {
            Self::Anthropic(m) => m.apply(event),
            Self::Openai(r) => r.apply(event),
        }
    }

    fn finish(self) -> Result<Step, String> {
        match self {
            Self::Anthropic(m) => m.finish(),
            Self::Openai(r) => r.finish(),
        }
    }
}

/// Saves the key in the system keychain; None removes it.
#[tauri::command]
pub fn api_key_set(vendor: Vendor, key: Option<String>) -> Result<(), String> {
    match key.as_deref().map(str::trim) {
        Some(key) if !vendor.valid_key(key) => Err(format!(
            "That doesn't look like a key for {}.",
            vendor.name()
        )),
        Some(key) => vendor
            .key_entry()?
            .set_password(key)
            .map_err(|e| e.to_string()),
        None => match vendor.key_entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        },
    }
}

/// What the setup screen needs (src/lib/ai/api/provider.ts `ApiProbe`). Lists the models, which
/// also checks the key; sends no message, so it costs nothing.
#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ApiProbe {
    has_key: bool,
    /// The key's last characters, to tell keys apart.
    key_hint: Option<String>,
    /// As the vendor's models endpoint lists them.
    models: Vec<serde_json::Value>,
    error: Option<String>,
}

#[tauri::command]
pub async fn api_probe(
    client: tauri::State<'_, reqwest::Client>,
    vendor: Vendor,
) -> Result<ApiProbe, String> {
    let Some(key) = vendor.load_key()? else {
        return Ok(ApiProbe::default());
    };
    let mut probe = ApiProbe {
        has_key: true,
        key_hint: Some(key[key.len().saturating_sub(4)..].to_owned()),
        ..Default::default()
    };
    let path = match vendor {
        Vendor::Anthropic => "/models?limit=100",
        Vendor::Openai => "/models",
    };
    match vendor
        .request(&client, reqwest::Method::GET, path, &key)
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
            probe.models = body["data"].as_array().cloned().unwrap_or_default();
        }
        Ok(response) => probe.error = Some(vendor.error(response).await),
        Err(e) => probe.error = Some(format!("Could not reach {}: {e}", vendor.name())),
    }
    Ok(probe)
}

/// The running conversation per vendor: its history lives here, the webview only shows it.
#[derive(Default)]
pub struct ApiChat(Mutex<HashMap<Vendor, Conversation>>);

struct Conversation {
    settings: Settings,
    history: Arc<Mutex<Vec<serde_json::Value>>>,
    on_event: Channel<String>,
    turn: Option<JoinHandle<()>>,
}

/// How a request is made, besides its history.
#[derive(Clone)]
struct Settings {
    model: String,
    effort: Option<String>,
    system: String,
    web_search: bool,
}

impl Drop for Conversation {
    fn drop(&mut self) {
        if let Some(turn) = self.turn.take() {
            turn.abort();
        }
    }
}

fn emit(channel: &Channel<String>, event: serde_json::Value) {
    let _ = channel.send(event.to_string());
}

fn valid_effort(effort: Option<String>) -> Option<String> {
    effort.filter(|e| EFFORTS.contains(&e.as_str()))
}

/// How the webview wants the conversation run (src/lib/ai/types.ts `SessionOptions`).
#[derive(Deserialize)]
pub struct StartOptions {
    /// None: the vendor's default.
    model: Option<String>,
    effort: Option<String>,
    instructions: Option<String>,
    #[serde(default, rename = "webSearch")]
    web_search: bool,
}

/// Starts a new, empty conversation (replacing the vendor's running one). Its events go to
/// `on_event`.
#[tauri::command]
pub async fn api_start(
    chat: tauri::State<'_, ApiChat>,
    vendor: Vendor,
    on_event: Channel<String>,
    options: StartOptions,
) -> Result<(), String> {
    let model = options.model.filter(|m| valid_model(m)).unwrap_or_else(|| {
        match vendor {
            Vendor::Anthropic => anthropic::DEFAULT_MODEL,
            Vendor::Openai => openai::DEFAULT_MODEL,
        }
        .to_owned()
    });
    emit(
        &on_event,
        serde_json::json!({ "type": "system", "subtype": "init", "model": model }),
    );
    let settings = Settings {
        model,
        effort: valid_effort(options.effort),
        system: system_prompt(options.instructions.as_deref())?,
        web_search: options.web_search,
    };
    let conversation = Conversation {
        settings,
        history: Arc::default(),
        on_event,
        turn: None,
    };
    chat.0.lock().await.insert(vendor, conversation);
    Ok(())
}

/// Adds the user's message and runs the turn: model calls and tool calls until the answer.
#[tauri::command]
pub async fn api_send(
    client: tauri::State<'_, reqwest::Client>,
    mcp: tauri::State<'_, Arc<Mcp>>,
    chat: tauri::State<'_, ApiChat>,
    vendor: Vendor,
    content: serde_json::Value,
) -> Result<(), String> {
    check_content(&content)?;
    let key = vendor.load_key()?.ok_or("No API key saved")?;
    let mut chat = chat.0.lock().await;
    let conversation = chat
        .get_mut(&vendor)
        .ok_or("the conversation is not running")?;
    if conversation
        .turn
        .as_ref()
        .is_some_and(|t| !t.inner().is_finished())
    {
        return Err("The assistant is still answering".into());
    }
    let message = match vendor {
        Vendor::Anthropic => serde_json::json!({ "role": "user", "content": content }),
        Vendor::Openai => openai::user_message(&content),
    };
    conversation.history.lock().await.push(message);
    let turn = Turn {
        vendor,
        client: client.inner().clone(),
        mcp: mcp.inner().clone(),
        key,
        settings: conversation.settings.clone(),
        history: conversation.history.clone(),
        on_event: conversation.on_event.clone(),
    };
    conversation.turn = Some(tauri::async_runtime::spawn(async move {
        let event = match turn.run().await {
            Ok(()) => serde_json::json!({ "type": "result", "subtype": "success" }),
            Err(error) => serde_json::json!({
                "type": "result", "subtype": "error", "is_error": true, "errors": [error],
            }),
        };
        emit(&turn.on_event, event);
    }));
    Ok(())
}

/// Stops the current turn; the conversation keeps what was finished before it.
#[tauri::command]
pub async fn api_interrupt(chat: tauri::State<'_, ApiChat>, vendor: Vendor) -> Result<(), String> {
    let mut chat = chat.0.lock().await;
    let conversation = chat
        .get_mut(&vendor)
        .ok_or("the conversation is not running")?;
    if let Some(turn) = conversation
        .turn
        .take()
        .filter(|t| !t.inner().is_finished())
    {
        turn.abort();
        // What the CLI sends for an interrupted turn: ends it without an error.
        emit(
            &conversation.on_event,
            serde_json::json!({ "type": "result", "subtype": "error_during_execution", "is_error": true }),
        );
    }
    Ok(())
}

/// Switches the model; the next turn uses it.
#[tauri::command]
pub async fn api_set_model(
    chat: tauri::State<'_, ApiChat>,
    vendor: Vendor,
    model: String,
) -> Result<(), String> {
    if !valid_model(&model) {
        return Err(format!("invalid model {model}"));
    }
    if let Some(conversation) = chat.0.lock().await.get_mut(&vendor) {
        conversation.settings.model = model;
    }
    Ok(())
}

/// Sets the effort level (None: the model's default); the next turn uses it.
#[tauri::command]
pub async fn api_set_effort(
    chat: tauri::State<'_, ApiChat>,
    vendor: Vendor,
    effort: Option<String>,
) -> Result<(), String> {
    if let Some(conversation) = chat.0.lock().await.get_mut(&vendor) {
        conversation.settings.effort = valid_effort(effort);
    }
    Ok(())
}

/// Ends the conversation and any running turn.
#[tauri::command]
pub async fn api_stop(chat: tauri::State<'_, ApiChat>, vendor: Vendor) -> Result<(), String> {
    chat.0.lock().await.remove(&vendor);
    Ok(())
}

struct Turn {
    vendor: Vendor,
    client: reqwest::Client,
    mcp: Arc<Mcp>,
    key: String,
    settings: Settings,
    history: Arc<Mutex<Vec<serde_json::Value>>>,
    on_event: Channel<String>,
}

impl Turn {
    async fn run(&self) -> Result<(), String> {
        let tools = self.mcp.api_tools();
        for _ in 0..MAX_STEPS {
            let history = self.history.lock().await.clone();
            let (path, body, reader) = match self.vendor {
                Vendor::Anthropic => (
                    "/messages",
                    anthropic::body(&self.settings, tools.clone(), history),
                    Reader::Anthropic(anthropic::Message::default()),
                ),
                Vendor::Openai => (
                    "/responses",
                    openai::body(&self.settings, &tools, history),
                    Reader::Openai(openai::Response::default()),
                ),
            };
            let step = self.stream(path, &body, reader).await?;
            emit(
                &self.on_event,
                serde_json::json!({ "type": "assistant", "message": { "id": step.id, "content": step.content } }),
            );
            match step.stop_reason.as_str() {
                "tool_use" => {
                    let results = self.run_tools(&step.content).await;
                    emit(
                        &self.on_event,
                        serde_json::json!({ "type": "user", "message": { "content": results } }),
                    );
                    // Added together, so an interrupted tool call never leaves a call without
                    // its result in the history.
                    let mut history = self.history.lock().await;
                    history.extend(step.history);
                    history.extend(match self.vendor {
                        Vendor::Anthropic => {
                            vec![serde_json::json!({ "role": "user", "content": results })]
                        }
                        Vendor::Openai => openai::tool_results(&results),
                    });
                }
                // The server's search loop paused; sending the history again resumes it.
                "pause_turn" => self.history.lock().await.extend(step.history),
                // A declined answer's partial output is dropped, not kept as context.
                "refusal" => return Err("The model declined to answer this.".into()),
                "max_tokens" => {
                    self.history.lock().await.extend(step.history);
                    return Err("The answer was cut off at the length limit.".into());
                }
                _ => {
                    self.history.lock().await.extend(step.history);
                    return Ok(());
                }
            }
        }
        Err("Stopped: the answer took too many steps.".into())
    }

    /// Runs every tool call of one answer, side by side; Claude-shaped results in the calls'
    /// order.
    async fn run_tools(&self, content: &serde_json::Value) -> serde_json::Value {
        let calls: Vec<_> = content
            .as_array()
            .into_iter()
            .flatten()
            .filter(|block| block["type"] == "tool_use")
            .map(|block| {
                let mcp = self.mcp.clone();
                let name = block["name"].as_str().unwrap_or_default().to_owned();
                let input = block["input"].clone();
                (
                    block["id"].clone(),
                    tauri::async_runtime::spawn(async move { mcp.call(name, input).await }),
                )
            })
            .collect();
        let mut results = Vec::with_capacity(calls.len());
        for (id, call) in calls {
            let (ok, text) = call.await.unwrap_or_else(|e| (false, e.to_string()));
            results.push(serde_json::json!({
                "type": "tool_result", "tool_use_id": id, "content": text, "is_error": !ok,
            }));
        }
        serde_json::Value::Array(results)
    }

    /// One streamed model call: forwards its events and returns the finished step.
    async fn stream(
        &self,
        path: &str,
        body: &serde_json::Value,
        mut reader: Reader,
    ) -> Result<Step, String> {
        let name = self.vendor.name();
        let mut response = self
            .vendor
            .request(&self.client, reqwest::Method::POST, path, &self.key)
            .json(body)
            .send()
            .await
            .map_err(|e| format!("Could not reach {name}: {e}"))?;
        if !response.status().is_success() {
            return Err(self.vendor.error(response).await);
        }
        let mut buffer = Vec::new();
        while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
            buffer.extend_from_slice(&chunk);
            while let Some(end) = buffer.iter().position(|&b| b == b'\n') {
                let line: Vec<u8> = buffer.drain(..=end).collect();
                let Some(data) = line.strip_prefix(b"data:") else {
                    continue;
                };
                let Ok(event) = serde_json::from_slice::<serde_json::Value>(data) else {
                    continue;
                };
                for event in reader.apply(&event)? {
                    emit(
                        &self.on_event,
                        serde_json::json!({ "type": "stream_event", "event": event }),
                    );
                }
            }
        }
        reader.finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_vendors_keys_are_saved() {
        assert!(Vendor::Anthropic.valid_key("sk-ant-api03-abc_DEF-123"));
        assert!(!Vendor::Anthropic.valid_key("sk-proj-abc"));
        assert!(!Vendor::Anthropic.valid_key("sk-ant-abc\r\nX-Evil: 1"));
        assert!(Vendor::Openai.valid_key("sk-proj-abc_DEF-123"));
        assert!(!Vendor::Openai.valid_key("Bearer sk-proj-abc"));
    }
}
