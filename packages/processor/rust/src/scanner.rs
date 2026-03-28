//! Discover Rust source files.
//!
//! @docspec:module {
//!   id: "docspec-rust-scanner",
//!   name: "Source File Scanner",
//!   description: "Recursively walks a source directory to discover .rs files and computes their module paths using Rust path-to-module conventions.",
//!   since: "3.0.0"
//! }

use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// @docspec:boundary "File system discovery boundary -- reads .rs source files and converts paths to module identifiers"
pub struct FileInfo {
    pub path: PathBuf,
    pub source: String,
    pub module: String,
}

/// @docspec:method { since: "3.0.0" }
/// @docspec:intentional "Walks the source tree, reads each .rs file, and derives the Rust module path from the file path"
/// @docspec:preserves "source files are never modified; only read for content"
pub fn scan(source_dir: &Path) -> Result<Vec<FileInfo>, String> {
    let mut files = Vec::new();

    for entry in WalkDir::new(source_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().map_or(true, |ext| ext != "rs") { continue; }

        let source = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

        let module = path.strip_prefix(source_dir)
            .unwrap_or(path)
            .with_extension("")
            .to_string_lossy()
            .replace(['/', '\\'], "::")
            .trim_end_matches("::mod")
            .trim_end_matches("::lib")
            .trim_end_matches("::main")
            .to_string();

        files.push(FileInfo { path: path.to_path_buf(), source, module });
    }

    Ok(files)
}
