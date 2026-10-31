use std::sync::OnceLock;
use std::time::Duration;

use reqwest::Url;
use reqwest::redirect::Policy;

/// Larger pages are cut off: the article text is near the top and Claude gets a capped excerpt.
const MAX_BYTES: usize = 2 * 1024 * 1024;

/// Public https sites by name only: no IP literals or localhost, so a page can't be pointed at
/// the user's machine or network. The webview further limits calls to articles in the news feed.
fn allowed(url: &Url) -> bool {
    url.scheme() == "https"
        // `domain()` is None for IP hosts.
        && url
            .domain()
            .is_some_and(|host| host != "localhost" && !host.ends_with(".localhost"))
}

fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            // News sites redirect (consent, canonical URLs); every hop must pass `allowed` too.
            .redirect(Policy::custom(|attempt| {
                if attempt.previous().len() >= 5 || !allowed(attempt.url()) {
                    attempt.stop()
                } else {
                    attempt.follow()
                }
            }))
            .timeout(Duration::from_secs(15))
            .user_agent("Mozilla/5.0 AvanzaDesk")
            .build()
            .expect("failed to build HTTP client")
    })
}

/// GETs an external news article's page as HTML, for the assistant's `read_article` tool. No
/// cookies, headers or body from the caller: this is not a general proxy.
#[tauri::command]
pub async fn article_fetch(url: String) -> Result<String, String> {
    let url = Url::parse(&url).map_err(|e| e.to_string())?;
    if !allowed(&url) {
        return Err(format!("blocked request to {url}"));
    }
    let mut response = client()
        .get(url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?;
    let mut body = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        body.extend_from_slice(&chunk);
        if body.len() >= MAX_BYTES {
            body.truncate(MAX_BYTES);
            break;
        }
    }
    Ok(String::from_utf8_lossy(&body).into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_public_https_hosts() {
        let ok = |u: &str| allowed(&Url::parse(u).unwrap());
        assert!(ok("https://www.placera.se/a/b"));
        assert!(!ok("http://www.placera.se/a"));
        assert!(!ok("https://127.0.0.1/"));
        assert!(!ok("https://[::1]/"));
        assert!(!ok("https://localhost:1420/"));
        assert!(!ok("https://app.localhost/"));
        assert!(!ok("file:///etc/passwd"));
    }
}
