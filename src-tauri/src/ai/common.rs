// What every AI provider shares: the app's system prompt, checks on what the webview sends,
// and finding the provider's program on this computer.

use std::path::PathBuf;
use std::process::Output;
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{ChildStderr, Command};
use tokio::sync::Mutex;

use crate::db::{self, Db};

pub const SYSTEM_PROMPT: &str =
    "You are the assistant inside AvanzaDesk, a desktop trading terminal \
for the user's own Avanza account, a third-party app. Answer questions \
about their portfolio, instruments, orders and news. Use the avanza tools for any account or \
market data and never guess numbers. Search the web only for what Avanza doesn't have \
(background, other markets, events), never with the user's own amounts or holdings in the \
query. You can only read data: you cannot place, change or cancel \
orders. Keep answers short and to the point; give amounts with their currency. Format answers \
in Markdown; use tables for lists of holdings, orders or figures.

Links: tool results give every instrument and news article a `link` field (avanza:…). Whenever \
you name an instrument or article that has one, make the name a Markdown link to that exact \
value, e.g. [Volvo B](avanza:instrument/5269?type=STOCK). Copy links verbatim; never invent or \
edit one, and leave a name unlinked if you have no link for it. When an answer summarizes news, \
end it with a short **Sources** list of the articles you used, each as a link.

Privacy: the app can blur the user's private figures. Write every amount, quantity or value \
that belongs to the user (holdings, positions, account values, cash, profit or loss in money, \
dividends received, order sizes) as a Markdown link to avanza:private, e.g. \
[48 300 kr](avanza:private) or [120 shares](avanza:private), also inside tables. Market data \
(prices, index levels, percentage changes, key ratios) stays plain text.

Context: a message may start with an <app_context> block, a JSON list of what the user is \
looking at in the app (the page, the account the views are filtered to, the instrument in \
focus, the article being read). Use it to understand \"this\", \"it\" or \"here\", and fetch \
details with the tools when you need them. It is background, not a request: don't describe it \
back unless asked, and never mention the tag itself.

Visuals: the app can draw a chart or an instrument card from its own live data. Write a fenced \
block on its own lines, with one JSON object and nothing else in it:
```chart
{\"kind\":\"price\",\"orderbookId\":\"5269\",\"type\":\"STOCK\",\"period\":\"one_year\"}
```
periods: today, one_week, one_month, three_months, this_year, one_year, three_years, \
five_years, infinity. The user's portfolio: {\"kind\":\"portfolio\",\"period\":\"ONE_YEAR\",\
\"mode\":\"return\"} (mode return or value; periods TODAY, ONE_WEEK, ONE_MONTH, THREE_MONTHS, \
THIS_YEAR, ONE_YEAR, THREE_YEARS, FIVE_YEARS, ALL_TIME). One instrument with its live price:
```instrument
{\"orderbookId\":\"5269\",\"type\":\"STOCK\"}
```
Use orderbookId and type from tool results or the context. Add a visual when a trend or a \
single instrument is the point of the answer, at most a few per answer.";

/// A provider's command-line program and where to look for it.
pub struct Program {
    /// File name without extension: `claude`, `codex`.
    pub stem: &'static str,
    /// As the setup screen names it: "Claude Code".
    pub name: &'static str,
    /// Setting with the user's chosen binary (a JSON string); unset or null means auto-detect.
    pub setting: &'static str,
    /// Install folders under the home directory besides the common ones.
    pub home_dirs: &'static [&'static str],
}

impl Program {
    fn exe(&self) -> String {
        if cfg!(windows) {
            format!("{}.exe", self.stem)
        } else {
            self.stem.to_owned()
        }
    }

    /// Where installers put the program. Apps started from a desktop launcher often lack these
    /// on PATH.
    fn install_locations(&self) -> Vec<PathBuf> {
        let Some(home) = std::env::home_dir() else {
            return vec![];
        };
        let exe = self.exe();
        let mut paths: Vec<PathBuf> = [".local/bin", ".npm-global/bin", ".bun/bin", ".volta/bin"]
            .iter()
            .chain(self.home_dirs)
            .map(|dir| home.join(dir).join(&exe))
            .collect();
        if cfg!(windows) {
            if let Some(appdata) = std::env::var_os("APPDATA") {
                paths.push(PathBuf::from(appdata).join(format!("npm/{}.cmd", self.stem)));
            }
        } else {
            paths.extend(
                ["/usr/local/bin", "/opt/homebrew/bin", "/usr/bin"]
                    .map(|dir| PathBuf::from(dir).join(&exe)),
            );
        }
        paths
    }

    /// Auto-detect: the first one on PATH, else in a known install location.
    pub fn detect(&self) -> Option<PathBuf> {
        let exe = self.exe();
        std::env::var_os("PATH")
            .map(|paths| {
                std::env::split_paths(&paths)
                    .map(|dir| dir.join(&exe))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default()
            .into_iter()
            .chain(self.install_locations())
            .find(|path| path.is_file())
    }

    /// Whether the user picked the binary rather than auto-detect.
    pub fn is_custom(&self, db: &Db) -> bool {
        matches!(
            db::setting(db, self.setting),
            Some(serde_json::Value::String(_))
        )
    }

    /// The user's chosen binary, else auto-detect.
    pub fn resolve(&self, db: &Db) -> Result<Option<PathBuf>, String> {
        if let Some(serde_json::Value::String(path)) = db::setting(db, self.setting) {
            return custom_bin(&path, self).map(Some);
        }
        Ok(self.detect())
    }

    pub fn resolve_or_err(&self, db: &Db) -> Result<PathBuf, String> {
        self.resolve(db)?
            .ok_or_else(|| format!("{} is not installed", self.name))
    }
}

/// A picked folder means the program inside it. Only files named after the program are
/// accepted, so a tampered setting can't make the app run something else.
fn custom_bin(path: &str, program: &Program) -> Result<PathBuf, String> {
    let mut path = PathBuf::from(path);
    if path.is_dir() {
        path = path.join(program.exe());
    }
    let named = path
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| {
            name == program.exe() || (cfg!(windows) && name == format!("{}.cmd", program.stem))
        });
    if !named {
        return Err(format!(
            "{} is not a {} binary",
            path.display(),
            program.name
        ));
    }
    if !path.is_file() {
        return Err(format!("No {} at {}", program.name, path.display()));
    }
    Ok(path)
}

/// What the setup screen shows for a provider (src/lib/ai/*/provider.ts `…Probe`).
#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Probe {
    /// The binary in use; None when none was found.
    pub bin: Option<String>,
    /// Whether `bin` is the user's choice rather than auto-detected.
    pub custom: bool,
    pub version: Option<String>,
    pub logged_in: bool,
    /// The provider's account, as it reports it.
    pub account: Option<serde_json::Value>,
    /// The provider's model list, as it reports it.
    pub models: Vec<serde_json::Value>,
    /// Why the probe failed (bad custom path, too old, CLI error).
    pub error: Option<String>,
}

impl Probe {
    /// Finds `program` and runs its `--version`: the probe so far, plus the binary and the
    /// version output when it ran. Without them the probe is finished (nothing found, a bad
    /// path, a failing program).
    pub async fn start(program: &Program, db: &Db) -> (Self, Option<(PathBuf, String)>) {
        let custom = program.is_custom(db);
        let bin = match program.resolve(db) {
            Ok(Some(bin)) => bin,
            Ok(None) => return (Self::default(), None),
            Err(error) => {
                let probe = Self {
                    custom,
                    error: Some(error),
                    ..Default::default()
                };
                return (probe, None);
            }
        };
        let mut probe = Self {
            bin: Some(bin.display().to_string()),
            custom,
            ..Default::default()
        };
        match run_for(Command::new(&bin).arg("--version")).await {
            Ok(out) if out.status.success() => {
                let text = String::from_utf8_lossy(&out.stdout).into_owned();
                return (probe, Some((bin, text)));
            }
            Ok(out) => probe.error = Some(String::from_utf8_lossy(&out.stderr).trim().to_owned()),
            Err(e) => probe.error = Some(format!("Could not run {}: {e}", bin.display())),
        }
        (probe, None)
    }
}

/// A short command such as `--version`: a hung program fails instead of blocking the probe.
pub async fn run_for(command: &mut Command) -> std::io::Result<Output> {
    tokio::time::timeout(Duration::from_secs(20), command.kill_on_drop(true).output())
        .await
        .unwrap_or_else(|_| Err(std::io::ErrorKind::TimedOut.into()))
}

/// Collects a provider's stderr for its exit message. Keeps the tail: an error is what's
/// wanted, not a full log.
pub fn collect_stderr(stderr: ChildStderr) -> Arc<Mutex<String>> {
    let text = Arc::new(Mutex::new(String::new()));
    let collected = text.clone();
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let mut text = collected.lock().await;
            text.push_str(&line);
            text.push('\n');
            if text.len() > 8_000 {
                let cut = text.len() - 4_000;
                let cut = (cut..text.len())
                    .find(|&i| text.is_char_boundary(i))
                    .unwrap_or(0);
                text.drain(..cut);
            }
        }
    });
    text
}

const MAX_INSTRUCTIONS: usize = 4_000;
const IMAGE_TYPES: [&str; 4] = ["image/png", "image/jpeg", "image/gif", "image/webp"];
/// Base64 characters per image: about 7.5 MB of image, under the providers' per-image limits.
const MAX_IMAGE_CHARS: usize = 10_000_000;

/// The app's system prompt plus the user's standing instructions from the settings.
pub fn system_prompt(instructions: Option<&str>) -> Result<String, String> {
    match instructions.map(str::trim).filter(|i| !i.is_empty()) {
        None => Ok(SYSTEM_PROMPT.to_owned()),
        Some(i) if i.chars().count() > MAX_INSTRUCTIONS => Err(format!(
            "instructions are longer than {MAX_INSTRUCTIONS} characters"
        )),
        Some(i) => Ok(format!(
            "{SYSTEM_PROMPT}\n\nThe user's own preferences (follow them unless they conflict with \
             the rules above):\n{i}"
        )),
    }
}

/// A message from the webview: text blocks and base64 images, nothing else reaches a provider.
pub fn check_content(content: &serde_json::Value) -> Result<(), String> {
    let blocks = content
        .as_array()
        .ok_or("content must be a list of blocks")?;
    if blocks.is_empty() {
        return Err("empty message".into());
    }
    for block in blocks {
        match block["type"].as_str() {
            Some("text") if block["text"].is_string() => {}
            Some("image") => {
                let source = &block["source"];
                let media_type = source["media_type"].as_str().unwrap_or_default();
                let data = source["data"].as_str().unwrap_or_default();
                if source["type"] != "base64"
                    || !IMAGE_TYPES.contains(&media_type)
                    || data.is_empty()
                    || data.len() > MAX_IMAGE_CHARS
                {
                    return Err("unsupported or too large image".into());
                }
            }
            _ => return Err("unsupported content block".into()),
        }
    }
    Ok(())
}

/// Model ids and aliases ("opus", "claude-opus-5-5[1m]"): never something that reads as a flag.
pub fn valid_model(model: &str) -> bool {
    !model.is_empty()
        && !model.starts_with('-')
        && model
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "-._[]".contains(c))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn models_cannot_inject_flags() {
        assert!(valid_model("opus"));
        assert!(valid_model("claude-opus-5-5[1m]"));
        assert!(!valid_model("--dangerously-skip-permissions"));
        assert!(!valid_model("opus --tools default"));
        assert!(!valid_model(""));
    }
    #[test]
    fn content_is_text_and_small_images_only() {
        let text = serde_json::json!([{ "type": "text", "text": "hi" }]);
        assert!(check_content(&text).is_ok());
        let image = serde_json::json!([{ "type": "image", "source": {
            "type": "base64", "media_type": "image/png", "data": "QUJD" } }]);
        assert!(check_content(&image).is_ok());
        let svg = serde_json::json!([{ "type": "image", "source": {
            "type": "base64", "media_type": "image/svg+xml", "data": "QUJD" } }]);
        assert!(check_content(&svg).is_err());
        let tool = serde_json::json!([{ "type": "tool_result", "content": "x" }]);
        assert!(check_content(&tool).is_err());
        assert!(check_content(&serde_json::json!("plain")).is_err());
        assert!(check_content(&serde_json::json!([])).is_err());
    }
    #[test]
    fn instructions_extend_the_prompt_within_a_limit() {
        assert_eq!(system_prompt(Some("  ")).unwrap(), SYSTEM_PROMPT);
        assert!(
            system_prompt(Some("Answer in English."))
                .unwrap()
                .ends_with("Answer in English.")
        );
        assert!(system_prompt(Some(&"x".repeat(MAX_INSTRUCTIONS + 1))).is_err());
    }
    #[test]
    fn custom_bin_must_be_the_program() {
        const CLAUDE: Program = Program {
            stem: "claude",
            name: "Claude Code",
            setting: "ai:claude:bin",
            home_dirs: &[],
        };
        assert!(
            custom_bin("/bin/sh", &CLAUDE)
                .unwrap_err()
                .contains("not a Claude Code binary")
        );
        assert!(
            custom_bin("/tmp/claude-setup.sh", &CLAUDE)
                .unwrap_err()
                .contains("not a Claude Code binary")
        );
        assert!(
            custom_bin("/nowhere/claude", &CLAUDE)
                .unwrap_err()
                .starts_with("No Claude Code at")
        );
    }
}
