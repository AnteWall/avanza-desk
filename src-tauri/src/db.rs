use std::sync::Mutex;

use rusqlite::{Connection, params};
use rusqlite_migration::{M, Migrations};
use tauri::Manager;

/// Append only: never edit a shipped migration, add a new one.
const MIGRATION_LIST: &[M] = &[
    M::up("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;"),
    // AI assistant conversations (src/ai/history.rs). `messages` is the webview's UIMessage[]
    // JSON; `session_id` lets the provider resume the conversation with its context.
    M::up(
        "CREATE TABLE chats (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            session_id TEXT,
            model TEXT,
            title TEXT NOT NULL,
            messages TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        ) STRICT;
        CREATE INDEX chats_updated_at ON chats (updated_at DESC);",
    ),
    M::up("ALTER TABLE chats ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;"),
    // Daily numbers Avanza doesn't keep history for (src/snapshots.rs).
    M::up(
        "CREATE TABLE snapshots (
            kind TEXT NOT NULL,
            key TEXT NOT NULL,
            day TEXT NOT NULL,
            value REAL NOT NULL,
            PRIMARY KEY (kind, key, day)
        ) STRICT;",
    ),
];
const MIGRATIONS: Migrations = Migrations::from_slice(MIGRATION_LIST);

pub struct Db(pub(crate) Mutex<Connection>);

pub(crate) fn open(path: &std::path::Path) -> Result<Connection, Box<dyn std::error::Error>> {
    let mut conn = Connection::open(path)?;
    // WAL + NORMAL: fast writes, still crash-safe for an app database.
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    MIGRATIONS.to_latest(&mut conn)?;
    Ok(conn)
}

/// Opens `<app data dir>/avanza-desk.sqlite` and runs pending migrations.
pub fn init(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&dir)?;
    app.manage(Db(Mutex::new(open(&dir.join("avanza-desk.sqlite"))?)));
    Ok(())
}

/// All settings as (key, JSON value) pairs; the webview loads them once at startup.
#[tauri::command]
pub fn settings_load(db: tauri::State<'_, Db>) -> Result<Vec<(String, String)>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare_cached("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .and_then(Iterator::collect)
        .map_err(|e| e.to_string())
}

/// One setting's JSON value, for backend code that follows a webview preference.
pub fn setting(db: &Db, key: &str) -> Option<serde_json::Value> {
    let conn = db.0.lock().ok()?;
    let value: String = conn
        .query_row("SELECT value FROM settings WHERE key = ?1", [key], |row| {
            row.get(0)
        })
        .ok()?;
    serde_json::from_str(&value).ok()
}

#[tauri::command]
pub fn setting_save(db: tauri::State<'_, Db>, key: String, value: String) -> Result<(), String> {
    // Values come from the webview: only accept JSON so reads can always parse them.
    serde_json::from_str::<serde_json::Value>(&value).map_err(|e| e.to_string())?;
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.prepare_cached(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    )
    .and_then(|mut stmt| stmt.execute(params![key, value]))
    .map(|_| ())
    .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_are_valid() {
        MIGRATIONS.validate().unwrap();
    }

    #[test]
    fn migrated_db_upserts_settings() {
        let dir = std::env::temp_dir().join(format!("avanza-desk-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let conn = open(&dir.join("t.sqlite")).unwrap();
        for v in ["1", "2"] {
            conn.execute(
                "INSERT INTO settings VALUES ('k', ?1) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
                [v],
            )
            .unwrap();
        }
        let v: String = conn
            .query_row("SELECT value FROM settings WHERE key = 'k'", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(v, "2");
        std::fs::remove_dir_all(dir).unwrap();
    }
}
