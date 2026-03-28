//! Detect Diesel ORM usage.
//!
//! @docspec:module {
//!   id: "docspec-rust-framework-diesel",
//!   name: "Diesel Detector",
//!   description: "Checks Cargo.toml for the diesel dependency to detect Diesel ORM usage.",
//!   since: "3.0.0"
//! }

use std::path::Path;

/// @docspec:deterministic
/// @docspec:intentional "Reads Cargo.toml to check for diesel dependency presence"
pub fn detect(source_dir: &Path) -> bool {
    let cargo_toml = source_dir.parent().unwrap_or(source_dir).join("Cargo.toml");
    if let Ok(content) = std::fs::read_to_string(&cargo_toml) {
        return content.contains("diesel");
    }
    false
}
