use std::collections::HashMap;
use std::sync::{Arc, Mutex, RwLock};
use std::time::Duration;

use axum::extract::{Request, State};
use axum::http::{StatusCode, header};
use axum::middleware::{self, Next};
use axum::response::Response;
use rmcp::model::{
    CallToolRequestParams, CallToolResponse, CallToolResult, ContentBlock, ListToolsResult,
    PaginatedRequestParams, ServerCapabilities, ServerConfig, Tool,
};
use rmcp::service::RequestContext;
use rmcp::transport::streamable_http_server::session::local::LocalSessionManager;
use rmcp::transport::streamable_http_server::{StreamableHttpServerConfig, StreamableHttpService};
use rmcp::{ErrorData, RoleServer, ServerHandler};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::oneshot;

const CALL_TIMEOUT: Duration = Duration::from_secs(30);
/// Providers read our bearer token from this variable, so it isn't on any command line.
pub const TOKEN_ENV: &str = "AVANZA_DESK_MCP_TOKEN";

/// MCP server the AI provider (claude, codex) connects to; the API provider calls it directly. The tools run in the webview, where the avanza-ts
/// session and query cache live: each call is emitted as `mcp-call` and answered by `mcp_result`.
pub struct Mcp {
    pub url: String,
    pub token: String,
    tools: RwLock<Vec<Tool>>,
    pending: Mutex<HashMap<String, oneshot::Sender<(bool, String)>>>,
    app: AppHandle,
}

#[derive(Clone, Serialize)]
struct McpCall {
    id: String,
    name: String,
    args: serde_json::Value,
}

#[derive(Clone)]
struct Handler(Arc<Mcp>);

impl ServerHandler for Handler {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build())
    }

    async fn list_tools(
        &self,
        _request: Option<PaginatedRequestParams>,
        _context: RequestContext<RoleServer>,
    ) -> Result<ListToolsResult, ErrorData> {
        let tools = self
            .0
            .tools
            .read()
            .map_err(|e| ErrorData::internal_error(e.to_string(), None))?;
        Ok(ListToolsResult::with_all_items(tools.clone()))
    }

    async fn call_tool(
        &self,
        request: CallToolRequestParams,
        _context: RequestContext<RoleServer>,
    ) -> Result<CallToolResponse, ErrorData> {
        let args = request
            .arguments
            .map(serde_json::Value::Object)
            .unwrap_or_default();
        let (ok, text) = self.0.call(request.name.into_owned(), args).await;
        let content = vec![ContentBlock::text(text)];
        Ok(if ok {
            CallToolResult::success(content)
        } else {
            CallToolResult::error(content)
        }
        .into())
    }
}

impl Mcp {
    /// The webview's tools in the Messages API's shape, for the API provider (api.rs).
    pub fn api_tools(&self) -> Vec<serde_json::Value> {
        let tools = self.tools.read().unwrap();
        tools
            .iter()
            .map(|t| {
                serde_json::json!({
                    "name": t.name,
                    "description": t.description,
                    "input_schema": t.input_schema,
                })
            })
            .collect()
    }

    /// Runs a tool in the webview: (succeeded, result text).
    pub async fn call(&self, name: String, args: serde_json::Value) -> (bool, String) {
        let id = uuid::Uuid::new_v4().to_string();
        let (tx, rx) = oneshot::channel();
        self.pending.lock().unwrap().insert(id.clone(), tx);
        let call = McpCall {
            id: id.clone(),
            name,
            args,
        };
        if let Err(e) = self.app.emit("mcp-call", call) {
            self.pending.lock().unwrap().remove(&id);
            return (false, e.to_string());
        }
        match tokio::time::timeout(CALL_TIMEOUT, rx).await {
            Ok(Ok(result)) => result,
            _ => {
                self.pending.lock().unwrap().remove(&id);
                (
                    false,
                    "The app did not answer the tool call in time.".into(),
                )
            }
        }
    }

    /// `--mcp-config` JSON for the claude CLI; it expands the token from `TOKEN_ENV`.
    pub fn config(&self) -> String {
        serde_json::json!({ "mcpServers": { "avanza": {
            "type": "http",
            "url": self.url,
            "headers": { "Authorization": format!("Bearer ${{{TOKEN_ENV}}}") },
        }}})
        .to_string()
    }
}

// Only the provider process we spawn gets the token; other local processes can't call the tools.
async fn check_token(State(mcp): State<Arc<Mcp>>, request: Request, next: Next) -> Response {
    let expected = format!("Bearer {}", mcp.token);
    match request.headers().get(header::AUTHORIZATION) {
        Some(value) if value.as_bytes() == expected.as_bytes() => next.run(request).await,
        _ => Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body(Default::default())
            .unwrap(),
    }
}

/// Binds a random localhost port and serves MCP on `/mcp` for the app's lifetime.
pub fn init(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let listener = tauri::async_runtime::block_on(tokio::net::TcpListener::bind("127.0.0.1:0"))?;
    let mcp = Arc::new(Mcp {
        url: format!("http://{}/mcp", listener.local_addr()?),
        token: uuid::Uuid::new_v4().simple().to_string(),
        tools: RwLock::default(),
        pending: Mutex::default(),
        app: app.handle().clone(),
    });
    let handler = Handler(mcp.clone());
    let service = StreamableHttpService::new(
        move || Ok(handler.clone()),
        LocalSessionManager::default().into(),
        StreamableHttpServerConfig::default(),
    );
    let router = axum::Router::new()
        .nest_service("/mcp", service)
        .layer(middleware::from_fn_with_state(mcp.clone(), check_token));
    tauri::async_runtime::spawn(async move {
        if let Err(e) = axum::serve(listener, router).await {
            eprintln!("mcp server stopped: {e}");
        }
    });
    println!("mcp server listening on {}", mcp.url);
    app.manage(mcp);
    Ok(())
}

/// The webview's tool list, registered once at startup.
#[tauri::command]
pub fn mcp_register(mcp: tauri::State<'_, Arc<Mcp>>, tools: Vec<Tool>) -> Result<(), String> {
    *mcp.tools.write().map_err(|e| e.to_string())? = tools;
    Ok(())
}

#[tauri::command]
pub fn mcp_result(mcp: tauri::State<'_, Arc<Mcp>>, id: String, ok: bool, content: String) {
    // A missing id timed out already; the late result is dropped.
    if let Some(tx) = mcp.pending.lock().unwrap().remove(&id) {
        let _ = tx.send((ok, content));
    }
}
