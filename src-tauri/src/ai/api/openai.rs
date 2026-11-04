// The OpenAI Responses API: requests, and its stream turned into Claude-shaped events.

use super::{Settings, Step};

const API: &str = "https://api.openai.com/v1";
// shortcut: a model every OpenAI API account has; the setup screen lists newer ones to pick.
pub const DEFAULT_MODEL: &str = "gpt-5";

pub fn request(
    client: &reqwest::Client,
    method: reqwest::Method,
    path: &str,
    key: &str,
) -> reqwest::RequestBuilder {
    client
        .request(method, format!("{API}{path}"))
        .bearer_auth(key)
}

/// The webview's checked content blocks (text, base64 images) as a Responses input message.
pub fn user_message(content: &serde_json::Value) -> serde_json::Value {
    let parts: Vec<_> = content
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
                serde_json::json!({ "type": "input_image", "image_url": url })
            }
            _ => serde_json::json!({ "type": "input_text", "text": block["text"] }),
        })
        .collect();
    serde_json::json!({ "role": "user", "content": parts })
}

/// `tools` are the webview's in the Messages API's shape (`Mcp::api_tools`).
pub fn body(
    settings: &Settings,
    tools: &[serde_json::Value],
    history: Vec<serde_json::Value>,
) -> serde_json::Value {
    let mut tools: Vec<_> = tools
        .iter()
        .map(|t| {
            serde_json::json!({
                "type": "function",
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            })
        })
        .collect();
    if settings.web_search {
        tools.push(serde_json::json!({ "type": "web_search" }));
    }
    let mut body = serde_json::json!({
        "model": settings.model,
        "instructions": settings.system,
        "input": history,
        "tools": tools,
        "stream": true,
        // Nothing kept at OpenAI; the history is sent each time, with the model's reasoning
        // encrypted so it can carry on from it.
        "store": false,
        "include": ["reasoning.encrypted_content"],
    });
    if let Some(effort) = &settings.effort {
        body["reasoning"] = serde_json::json!({ "effort": effort });
    }
    body
}

/// Claude-shaped tool results as `function_call_output` items.
pub fn tool_results(results: &serde_json::Value) -> Vec<serde_json::Value> {
    results
        .as_array()
        .into_iter()
        .flatten()
        .map(|r| {
            let text = r["content"].as_str().unwrap_or_default();
            let output = if r["is_error"] == true {
                format!("Error: {text}")
            } else {
                text.to_owned()
            };
            serde_json::json!({ "type": "function_call_output", "call_id": r["tool_use_id"], "output": output })
        })
        .collect()
}

/// A response put together from its stream: the final `response` object carries every item.
#[derive(Default)]
pub struct Response {
    id: serde_json::Value,
    response: Option<serde_json::Value>,
}

impl Response {
    /// Applies one event and returns the Claude-shaped events it stands for.
    pub fn apply(&mut self, event: &serde_json::Value) -> Result<Vec<serde_json::Value>, String> {
        let text = |delta: &serde_json::Value| {
            serde_json::json!({
                "type": "content_block_delta",
                "delta": { "type": "text_delta", "text": delta },
            })
        };
        Ok(match event["type"].as_str().unwrap_or_default() {
            "response.created" => {
                self.id = event["response"]["id"].clone();
                vec![serde_json::json!({ "type": "message_start", "message": { "id": self.id } })]
            }
            // What the model is doing, for the status line.
            "response.output_item.added" => {
                let block = match event["item"]["type"].as_str() {
                    Some("message") => "text",
                    Some("function_call") => "tool_use",
                    _ => "thinking",
                };
                vec![
                    serde_json::json!({ "type": "content_block_start", "content_block": { "type": block } }),
                ]
            }
            "response.output_text.delta" | "response.refusal.delta" => {
                vec![text(&event["delta"])]
            }
            "response.completed" | "response.incomplete" => {
                self.response = Some(event["response"].clone());
                vec![serde_json::json!({ "type": "message_stop" })]
            }
            "response.failed" => {
                return Err(event["response"]["error"]["message"]
                    .as_str()
                    .unwrap_or("The OpenAI API stopped with an error.")
                    .to_owned());
            }
            "error" => {
                return Err(event["message"]
                    .as_str()
                    .or(event["error"]["message"].as_str())
                    .unwrap_or("The OpenAI API stopped with an error.")
                    .to_owned());
            }
            _ => vec![],
        })
    }

    pub fn finish(self) -> Result<Step, String> {
        let response = self
            .response
            .ok_or("The connection to the OpenAI API closed mid-answer.")?;
        let output = response["output"].as_array().cloned().unwrap_or_default();
        let mut content = Vec::new();
        for item in &output {
            match item["type"].as_str() {
                Some("message") => {
                    let text: String = item["content"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(|part| part["text"].as_str().or(part["refusal"].as_str()))
                        .collect();
                    content.push(serde_json::json!({ "type": "text", "text": text }));
                }
                Some("function_call") => {
                    let arguments = item["arguments"].as_str().unwrap_or("{}");
                    let input: serde_json::Value = serde_json::from_str(arguments)
                        .map_err(|e| format!("The model sent a broken tool call: {e}"))?;
                    content.push(serde_json::json!({
                        "type": "tool_use", "id": item["call_id"], "name": item["name"], "input": input,
                    }));
                }
                _ => {}
            }
        }
        let stop_reason = if content.iter().any(|b| b["type"] == "tool_use") {
            "tool_use"
        } else if response["status"] == "incomplete" {
            "max_tokens"
        } else {
            "end_turn"
        };
        Ok(Step {
            id: self.id,
            content: serde_json::Value::Array(content),
            stop_reason: stop_reason.into(),
            history: output,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stream_events_become_a_step() {
        let events = [
            r#"{"type":"response.created","response":{"id":"resp_1"}}"#,
            r#"{"type":"response.output_item.added","item":{"type":"reasoning"}}"#,
            r#"{"type":"response.output_item.added","item":{"type":"message"}}"#,
            r#"{"type":"response.output_text.delta","delta":"Hi"}"#,
            r#"{"type":"response.output_item.added","item":{"type":"function_call"}}"#,
            r#"{"type":"response.completed","response":{"status":"completed","output":[
                {"type":"reasoning","encrypted_content":"x"},
                {"type":"message","content":[{"type":"output_text","text":"Hi"}]},
                {"type":"function_call","call_id":"c1","name":"get_holdings","arguments":"{\"account\":\"1\"}"}]}}"#,
        ];
        let mut response = Response::default();
        let forwarded: Vec<_> = events
            .iter()
            .flat_map(|e| response.apply(&serde_json::from_str(e).unwrap()).unwrap())
            .collect();
        assert_eq!(forwarded[0]["message"]["id"], "resp_1");
        assert_eq!(forwarded[1]["content_block"]["type"], "thinking");
        assert_eq!(forwarded[3]["delta"]["text"], "Hi");
        assert_eq!(forwarded.last().unwrap()["type"], "message_stop");
        let step = response.finish().unwrap();
        assert_eq!(step.stop_reason, "tool_use");
        assert_eq!(step.content[0]["text"], "Hi");
        assert_eq!(step.content[1]["id"], "c1");
        assert_eq!(step.content[1]["input"]["account"], "1");
        assert_eq!(step.history.len(), 3);
    }

    #[test]
    fn results_and_messages_in_the_responses_shape() {
        let results = serde_json::json!([
            { "type": "tool_result", "tool_use_id": "c1", "content": "ok", "is_error": false },
            { "type": "tool_result", "tool_use_id": "c2", "content": "nope", "is_error": true },
        ]);
        let items = tool_results(&results);
        assert_eq!(items[0]["call_id"], "c1");
        assert_eq!(items[1]["output"], "Error: nope");
        let image = serde_json::json!([{ "type": "image", "source": {
            "type": "base64", "media_type": "image/png", "data": "QUJD" } }]);
        assert_eq!(
            user_message(&image)["content"][0]["image_url"],
            "data:image/png;base64,QUJD"
        );
        assert!(Response::default().finish().is_err());
    }
}
