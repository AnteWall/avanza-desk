use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};

use crate::db::Db;

// Saved assistant conversations, newest first. The webview saves a chat after every answer and
// reopens it with its messages; the provider resumes its own session from `session_id`.

const LIST_LIMIT: u32 = 500;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSummary {
    id: String,
    provider: String,
    model: Option<String>,
    title: String,
    updated_at: i64,
    pinned: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedChat {
    id: String,
    provider: String,
    session_id: Option<String>,
    model: Option<String>,
    title: String,
    /// The webview's UIMessage[] as JSON.
    messages: String,
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as i64)
}

/// Pinned first, then newest. `query` matches titles and message text (case-insensitive), not
/// the JSON around it.
fn list(conn: &Connection, query: Option<&str>) -> rusqlite::Result<Vec<ChatSummary>> {
    let pattern = query.map(str::trim).filter(|q| !q.is_empty()).map(|q| {
        format!(
            "%{}%",
            q.replace('\\', "\\\\")
                .replace('%', "\\%")
                .replace('_', "\\_")
        )
    });
    let mut stmt = conn.prepare_cached(
        "SELECT id, provider, model, title, updated_at, pinned FROM chats
         WHERE ?1 IS NULL OR title LIKE ?1 ESCAPE '\\' OR EXISTS (
           SELECT 1 FROM json_each(messages) m, json_each(m.value, '$.parts') p
           WHERE p.value ->> 'type' = 'text' AND p.value ->> 'content' LIKE ?1 ESCAPE '\\')
         ORDER BY pinned DESC, updated_at DESC LIMIT ?2",
    )?;
    stmt.query_map(params![pattern, LIST_LIMIT], |row| {
        Ok(ChatSummary {
            id: row.get(0)?,
            provider: row.get(1)?,
            model: row.get(2)?,
            title: row.get(3)?,
            updated_at: row.get(4)?,
            pinned: row.get(5)?,
        })
    })?
    .collect()
}

fn save(conn: &Connection, chat: &SavedChat, now: i64) -> rusqlite::Result<()> {
    conn.prepare_cached(
        "INSERT INTO chats (id, provider, session_id, model, title, messages, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
         ON CONFLICT (id) DO UPDATE SET
           provider = excluded.provider, session_id = excluded.session_id,
           model = excluded.model, messages = excluded.messages,
           updated_at = excluded.updated_at",
    )?
    .execute(params![
        chat.id,
        chat.provider,
        chat.session_id,
        chat.model,
        chat.title,
        chat.messages,
        now
    ])
    .map(|_| ())
}

fn load(conn: &Connection, id: &str) -> rusqlite::Result<Option<SavedChat>> {
    conn.prepare_cached(
        "SELECT id, provider, session_id, model, title, messages FROM chats WHERE id = ?1",
    )?
    .query_row([id], |row| {
        Ok(SavedChat {
            id: row.get(0)?,
            provider: row.get(1)?,
            session_id: row.get(2)?,
            model: row.get(3)?,
            title: row.get(4)?,
            messages: row.get(5)?,
        })
    })
    .optional()
}

#[tauri::command]
pub fn chats_list(
    db: tauri::State<'_, Db>,
    query: Option<String>,
) -> Result<Vec<ChatSummary>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    list(&conn, query.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn chat_rename(db: tauri::State<'_, Db>, id: String, title: String) -> Result<(), String> {
    let title = title.trim();
    if title.is_empty() || title.chars().count() > 200 {
        return Err("a title needs 1–200 characters".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE chats SET title = ?2 WHERE id = ?1",
        params![id, title],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn chat_pin(db: tauri::State<'_, Db>, id: String, pinned: bool) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE chats SET pinned = ?2 WHERE id = ?1",
        params![id, pinned],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}

/// Writes a chat exported as Markdown to the file the user picked in the save dialog.
#[tauri::command]
pub fn chat_export(path: String, markdown: String) -> Result<(), String> {
    // Only Markdown files: a tampered call can't overwrite anything else.
    if !path.to_lowercase().ends_with(".md") {
        return Err("exports must be .md files".into());
    }
    std::fs::write(path, markdown).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn chat_load(db: tauri::State<'_, Db>, id: String) -> Result<Option<SavedChat>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    load(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn chat_save(db: tauri::State<'_, Db>, chat: SavedChat) -> Result<(), String> {
    // From the webview: only store messages that read back as a JSON list.
    serde_json::from_str::<Vec<serde_json::Value>>(&chat.messages).map_err(|e| e.to_string())?;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    save(&conn, &chat, now_ms()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn chat_delete(db: tauri::State<'_, Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM chats WHERE id = ?1", [id])
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn chat(id: &str, title: &str) -> SavedChat {
        SavedChat {
            id: id.into(),
            provider: "claude".into(),
            session_id: Some("s1".into()),
            model: None,
            title: title.into(),
            messages: "[]".into(),
        }
    }

    #[test]
    fn saves_lists_newest_first_and_updates_in_place() {
        let dir = std::env::temp_dir().join(format!("avanza-desk-chats-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let conn = crate::db::open(&dir.join("t.sqlite")).unwrap();
        save(&conn, &chat("a", "First"), 1).unwrap();
        save(&conn, &chat("b", "Second"), 2).unwrap();
        // Saving again keeps the title (it may have been renamed) but moves the chat up.
        save(&conn, &chat("a", "Overwritten?"), 3).unwrap();
        let titles = |q: Option<&str>| -> Vec<String> {
            list(&conn, q)
                .unwrap()
                .into_iter()
                .map(|c| c.title)
                .collect()
        };
        assert_eq!(titles(None), ["First", "Second"]);
        conn.execute("UPDATE chats SET pinned = 1 WHERE id = 'b'", [])
            .unwrap();
        assert_eq!(titles(None), ["Second", "First"]);
        assert_eq!(titles(Some("sec")), ["Second"]);
        assert_eq!(titles(Some("100%")), Vec::<String>::new());
        // Message text matches; the JSON's field names don't.
        let mut said = chat("c", "Third");
        said.messages =
            r#"[{"role":"user","parts":[{"type":"text","content":"Hur går Volvo?"}]}]"#.into();
        save(&conn, &said, 4).unwrap();
        assert_eq!(titles(Some("volvo")), ["Third"]);
        assert_eq!(titles(Some("content")), Vec::<String>::new());
        assert_eq!(
            load(&conn, "a").unwrap().unwrap().session_id.as_deref(),
            Some("s1")
        );
        assert!(load(&conn, "missing").unwrap().is_none());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
