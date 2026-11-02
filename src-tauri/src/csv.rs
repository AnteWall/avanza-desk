use std::path::PathBuf;

/// Writes a CSV the user picked in a save dialog: a table export, or the live quotes file
/// that spreadsheets refresh from. Written to a temp file and renamed, so a spreadsheet
/// polling the file never reads it half written.
#[tauri::command]
pub fn csv_write(path: String, csv: String) -> Result<(), String> {
    // Only CSV files: a tampered call can't overwrite anything else.
    if !path.to_lowercase().ends_with(".csv") {
        return Err("exports must be .csv files".into());
    }
    let path = PathBuf::from(path);
    let tmp = path.with_extension("csv.tmp");
    std::fs::write(&tmp, csv).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_csv_and_refuses_other_files() {
        let dir = std::env::temp_dir().join(format!("csv-write-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("quotes.csv");
        csv_write(file.to_string_lossy().into(), "a;b\n1;2\n".into()).unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "a;b\n1;2\n");
        assert!(csv_write(dir.join("x.txt").to_string_lossy().into(), String::new()).is_err());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
