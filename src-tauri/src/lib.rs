use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::async_runtime::JoinHandle;
use tauri::ipc::{Channel, InvokeResponseBody};

mod ai;
mod article;
mod csv;
mod db;
#[cfg(target_os = "macos")]
mod mouse_nav;
mod snapshots;

const AVANZA_ORIGIN: &str = "https://www.avanza.se/";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProxyResponse {
    status: u16,
    status_text: String,
    // A list, not a map: Avanza sends several Set-Cookie headers per response.
    headers: Vec<(String, String)>,
    body: String,
}

/// Body pipes of open push streams, keyed by their channel id.
#[derive(Default)]
struct Streams(Mutex<HashMap<u32, JoinHandle<()>>>);

/// Proxies the avanza-ts SDK's requests: the webview can't reach avanza.se (CORS) and
/// browser `Response` objects hide Set-Cookie, which the SDK needs to keep its session.
#[tauri::command]
async fn avanza_fetch(
    client: tauri::State<'_, reqwest::Client>,
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
) -> Result<ProxyResponse, String> {
    let response = send(&client, url, method, headers, body).await?;
    let mut proxied = ProxyResponse::head(&response);
    proxied.body = response.text().await.map_err(|e| e.to_string())?;
    Ok(proxied)
}

/// `avanza_fetch` for Avanza's `/_push` Server-Sent Events (HTTP/2 only): a successful body
/// goes to `channel` as it arrives, as raw chunks, then `null` at its end or an error string.
#[tauri::command]
async fn avanza_stream(
    client: tauri::State<'_, reqwest::Client>,
    streams: tauri::State<'_, Streams>,
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
    channel: Channel<InvokeResponseBody>,
) -> Result<ProxyResponse, String> {
    let response = send(&client, url, method, headers, body).await?;
    let mut proxied = ProxyResponse::head(&response);
    if response.status().is_success() {
        let id = channel.id();
        let pipe = tauri::async_runtime::spawn(pipe_body(response, channel));
        streams.0.lock().unwrap().insert(id, pipe);
    } else {
        proxied.body = response.text().await.map_err(|e| e.to_string())?;
    }
    Ok(proxied)
}

async fn send(
    client: &reqwest::Client,
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
) -> Result<reqwest::Response, String> {
    // Only Avanza: the webview must not get a general-purpose proxy.
    if !url.starts_with(AVANZA_ORIGIN) {
        return Err(format!("blocked request to {url}"));
    }
    let method = reqwest::Method::from_bytes(method.as_bytes()).map_err(|e| e.to_string())?;
    let mut request = client.request(method, &url);
    for (name, value) in headers {
        request = request.header(name, value);
    }
    if let Some(body) = body {
        request = request.body(body);
    }
    request.send().await.map_err(|e| e.to_string())
}

impl ProxyResponse {
    /// Status and headers; the body is left empty.
    fn head(response: &reqwest::Response) -> Self {
        let status = response.status();
        Self {
            status: status.as_u16(),
            status_text: status.canonical_reason().unwrap_or_default().to_owned(),
            headers: response
                .headers()
                .iter()
                .filter_map(|(name, value)| {
                    Some((name.to_string(), value.to_str().ok()?.to_owned()))
                })
                .collect(),
            body: String::new(),
        }
    }
}

async fn pipe_body(mut response: reqwest::Response, channel: Channel<InvokeResponseBody>) {
    let end = loop {
        match response.chunk().await {
            Ok(Some(chunk)) => {
                if channel.send(InvokeResponseBody::Raw(chunk.into())).is_err() {
                    return;
                }
            }
            Ok(None) => break None,
            Err(e) => break Some(e.to_string()),
        }
    };
    let end = serde_json::to_string(&end).unwrap_or_else(|_| "null".into());
    let _ = channel.send(InvokeResponseBody::Json(end));
}

/// Stops a push stream's pipe; the webview calls it whenever a stream ends or is cancelled.
#[tauri::command]
fn avanza_stream_close(streams: tauri::State<'_, Streams>, id: u32) {
    if let Some(pipe) = streams.0.lock().unwrap().remove(&id) {
        pipe.abort();
    }
}

fn session_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new("avanza-desk", "session").map_err(|e| e.to_string())
}

#[tauri::command]
fn session_load() -> Result<Option<String>, String> {
    match session_entry()?.get_password() {
        Ok(session) => Ok(Some(session)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn session_save(session: String) -> Result<(), String> {
    session_entry()?
        .set_password(&session)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn session_clear() -> Result<(), String> {
    match session_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let client = reqwest::Client::builder()
        // The SDK asks for redirect: "error" on auth calls; the webview side enforces it.
        .redirect(reqwest::redirect::Policy::none())
        // No overall timeout (push streams stay open); pings notice a connection that died
        // while the computer slept instead of hanging every request on it.
        .connect_timeout(Duration::from_secs(10))
        .http2_keep_alive_interval(Duration::from_secs(30))
        .http2_keep_alive_timeout(Duration::from_secs(10))
        .http2_keep_alive_while_idle(true)
        .build()
        .expect("failed to build HTTP client");

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(client)
        .manage(Streams::default())
        .manage(ai::claude::Chat::default())
        .manage(ai::codex::Chat::default())
        .manage(ai::codex::Login::default())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            mouse_nav::init(app.handle());
            db::init(app)?;
            ai::mcp::init(app)
        })
        .invoke_handler(tauri::generate_handler![
            avanza_fetch,
            avanza_stream,
            avanza_stream_close,
            article::article_fetch,
            session_load,
            session_save,
            session_clear,
            db::settings_load,
            db::setting_save,
            snapshots::snapshot_save,
            snapshots::snapshot_series,
            ai::claude::claude_probe,
            ai::claude::chat_start,
            ai::claude::chat_send,
            ai::claude::chat_interrupt,
            ai::claude::chat_set_model,
            ai::claude::chat_stop,
            ai::codex::codex_probe,
            ai::codex::codex_login,
            ai::codex::codex_start,
            ai::codex::codex_send,
            ai::codex::codex_interrupt,
            ai::codex::codex_stop,
            ai::history::chats_list,
            ai::history::chat_load,
            ai::history::chat_save,
            ai::history::chat_delete,
            ai::history::chat_rename,
            ai::history::chat_pin,
            ai::history::chat_export,
            csv::csv_write,
            ai::mcp::mcp_register,
            ai::mcp::mcp_result
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
