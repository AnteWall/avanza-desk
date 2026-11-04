// The Anthropic Messages API: requests, and its stream put back together.

use super::{Settings, Step};

const API: &str = "https://api.anthropic.com/v1";
const VERSION: &str = "2026-10-21";
pub const DEFAULT_MODEL: &str = "claude-opus-5-5";
const MAX_TOKENS: u32 = 64_000;

pub fn request(
    client: &reqwest::Client,
    method: reqwest::Method,
    path: &str,
    key: &str,
) -> reqwest::RequestBuilder {
    client
        .request(method, format!("{API}{path}"))
        .header("x-api-key", key)
        .header("anthropic-version", VERSION)
}

/// `tools` are the webview's, already in this API's shape (`Mcp::api_tools`).
pub fn body(
    settings: &Settings,
    mut tools: Vec<serde_json::Value>,
    history: Vec<serde_json::Value>,
) -> serde_json::Value {
    if settings.web_search {
        // shortcut: the basic search tool works on every model; the dynamic-filtering
        // web_search_20260209 is better on newer models, switch per model when that matters.
        tools.push(serde_json::json!({ "type": "web_search_20250305", "name": "web_search", "max_uses": 5 }));
    }
    let mut body = serde_json::json!({
        "model": settings.model,
        "max_tokens": MAX_TOKENS,
        "stream": true,
        "system": settings.system,
        "tools": tools,
        "messages": history,
        // Caches the prompt, tools and history so far; each step and turn reads it back.
        "cache_control": { "type": "ephemeral" },
    });
    if let Some(effort) = &settings.effort {
        body["output_config"] = serde_json::json!({ "effort": effort });
    }
    body
}

/// A message put together from its stream events.
#[derive(Default)]
pub struct Message {
    message: serde_json::Value,
    blocks: Vec<serde_json::Value>,
    /// Tool input JSON as it streams in, per block.
    inputs: Vec<String>,
    stop_reason: Option<String>,
    done: bool,
}

impl Message {
    /// Applies one event and returns it for the webview, unless it has no use for it (pings).
    pub fn apply(&mut self, event: &serde_json::Value) -> Result<Vec<serde_json::Value>, String> {
        let index = event["index"].as_u64().unwrap_or_default() as usize;
        match event["type"].as_str().unwrap_or_default() {
            "message_start" => self.message = event["message"].clone(),
            "content_block_start" => {
                self.blocks.push(event["content_block"].clone());
                self.inputs.push(String::new());
            }
            "content_block_delta" => {
                let (Some(block), Some(input)) =
                    (self.blocks.get_mut(index), self.inputs.get_mut(index))
                else {
                    return Ok(vec![event.clone()]);
                };
                let delta = &event["delta"];
                let text = |field: &str| delta[field].as_str().unwrap_or_default().to_owned();
                match delta["type"].as_str().unwrap_or_default() {
                    "text_delta" => append(block, "text", &text("text")),
                    "thinking_delta" => append(block, "thinking", &text("thinking")),
                    "signature_delta" => block["signature"] = delta["signature"].clone(),
                    "input_json_delta" => input.push_str(&text("partial_json")),
                    "citations_delta" => {
                        if !block["citations"].is_array() {
                            block["citations"] = serde_json::json!([]);
                        }
                        block["citations"]
                            .as_array_mut()
                            .unwrap()
                            .push(delta["citation"].clone());
                    }
                    _ => {}
                }
            }
            "content_block_stop" => {
                if let (Some(block), Some(input)) =
                    (self.blocks.get_mut(index), self.inputs.get(index))
                    && !input.is_empty()
                {
                    block["input"] = serde_json::from_str(input)
                        .map_err(|e| format!("Claude sent a broken tool call: {e}"))?;
                }
            }
            "message_delta" => {
                if let Some(reason) = event["delta"]["stop_reason"].as_str() {
                    self.stop_reason = Some(reason.to_owned());
                }
            }
            "message_stop" => self.done = true,
            "error" => {
                return Err(event["error"]["message"]
                    .as_str()
                    .unwrap_or("The Claude API stopped with an error.")
                    .to_owned());
            }
            _ => return Ok(vec![]),
        }
        Ok(vec![event.clone()])
    }

    pub fn finish(self) -> Result<Step, String> {
        if !self.done {
            return Err("The connection to the Claude API closed mid-answer.".into());
        }
        let stop_reason = self.stop_reason.unwrap_or_default();
        let content = serde_json::Value::Array(self.blocks);
        // An empty answer can't go into the history; a declined one shouldn't.
        let keep = content.as_array().is_some_and(|c| !c.is_empty()) && stop_reason != "refusal";
        let history = if keep {
            vec![serde_json::json!({ "role": "assistant", "content": content })]
        } else {
            vec![]
        };
        Ok(Step {
            id: self.message["id"].clone(),
            content,
            stop_reason,
            history,
        })
    }
}

fn append(block: &mut serde_json::Value, field: &str, text: &str) {
    let joined = format!("{}{text}", block[field].as_str().unwrap_or_default());
    block[field] = joined.into();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stream_events_build_the_message() {
        let events = [
            r#"{"type":"message_start","message":{"id":"msg_1","content":[]}}"#,
            r#"{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}"#,
            r#"{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hel"}}"#,
            r#"{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"lo"}}"#,
            r#"{"type":"content_block_stop","index":0}"#,
            r#"{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"t1","name":"get_holdings","input":{}}}"#,
            r#"{"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"account"}}"#,
            r#"{"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"\":\"1\"}"}}"#,
            r#"{"type":"content_block_stop","index":1}"#,
            r#"{"type":"ping"}"#,
            r#"{"type":"message_delta","delta":{"stop_reason":"tool_use"}}"#,
            r#"{"type":"message_stop"}"#,
        ];
        let mut message = Message::default();
        let forwarded = events
            .iter()
            .map(|e| {
                message
                    .apply(&serde_json::from_str(e).unwrap())
                    .unwrap()
                    .len()
            })
            .sum::<usize>();
        assert_eq!(forwarded, events.len() - 1);
        let step = message.finish().unwrap();
        assert_eq!(step.id, "msg_1");
        assert_eq!(step.stop_reason, "tool_use");
        assert_eq!(step.content[0]["text"], "Hello");
        assert_eq!(step.content[1]["input"]["account"], "1");
        assert_eq!(step.history[0]["role"], "assistant");
    }

    #[test]
    fn a_cut_stream_is_an_error() {
        let mut message = Message::default();
        message
            .apply(&serde_json::json!({ "type": "message_start", "message": { "id": "m" } }))
            .unwrap();
        assert!(message.finish().is_err());
        let error = serde_json::json!({ "type": "error", "error": { "message": "Overloaded" } });
        assert_eq!(Message::default().apply(&error).unwrap_err(), "Overloaded");
    }
}
