use rusqlite::{Connection, params};
use serde::Deserialize;

use crate::db::Db;

// One number per (kind, key, day): history Avanza doesn't keep, such as short interest, analyst
// targets or portfolio weights. The webview fetches and writes once a day; reads give series.

#[derive(Deserialize)]
pub struct SnapshotRow {
    kind: String,
    key: String,
    value: f64,
}

fn save(conn: &mut Connection, day: &str, rows: &[SnapshotRow]) -> rusqlite::Result<()> {
    let tx = conn.transaction()?;
    {
        let mut stmt = tx.prepare_cached(
            "INSERT INTO snapshots (kind, key, day, value) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT (kind, key, day) DO UPDATE SET value = excluded.value",
        )?;
        for r in rows {
            stmt.execute(params![r.kind, r.key, day, r.value])?;
        }
    }
    tx.commit()
}

/// (key, day, value) for `kind` since `from` (yyyy-MM-dd), oldest first per key.
fn series(
    conn: &Connection,
    kind: &str,
    from: &str,
) -> rusqlite::Result<Vec<(String, String, f64)>> {
    let mut stmt = conn.prepare_cached(
        "SELECT key, day, value FROM snapshots WHERE kind = ?1 AND day >= ?2 ORDER BY key, day",
    )?;
    stmt.query_map(params![kind, from], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    })
    .and_then(Iterator::collect)
}

#[tauri::command]
pub fn snapshot_save(
    db: tauri::State<'_, Db>,
    day: String,
    rows: Vec<SnapshotRow>,
) -> Result<(), String> {
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    save(&mut conn, &day, &rows).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn snapshot_series(
    db: tauri::State<'_, Db>,
    kind: String,
    from: String,
) -> Result<Vec<(String, String, f64)>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    series(&conn, &kind, &from).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn upserts_and_reads_series() {
        let dir = std::env::temp_dir().join(format!("avanza-desk-snap-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let mut conn = crate::db::open(&dir.join("t.sqlite")).unwrap();
        let row = |key: &str, value| SnapshotRow {
            kind: "target".into(),
            key: key.into(),
            value,
        };
        save(&mut conn, "2026-10-30", &[row("a", 1.0), row("b", 5.0)]).unwrap();
        save(&mut conn, "2026-10-31", &[row("a", 2.0)]).unwrap();
        save(&mut conn, "2026-10-31", &[row("a", 3.0)]).unwrap();
        let s = series(&conn, "target", "2026-10-31").unwrap();
        assert_eq!(s, vec![("a".into(), "2026-10-31".into(), 3.0)]);
        assert_eq!(series(&conn, "target", "2026-01-01").unwrap().len(), 3);
        std::fs::remove_dir_all(dir).unwrap();
    }
}
