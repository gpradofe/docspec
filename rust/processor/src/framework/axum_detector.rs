//! Detect Axum web framework usage.
//!
//! @docspec:module {
//!   id: "docspec-rust-framework-axum",
//!   name: "Axum Detector",
//!   description: "Checks Cargo.toml for the axum dependency to detect Axum web framework usage.",
//!   since: "3.0.0"
//! }

use std::path::Path;

/// @docspec:deterministic
/// @docspec:intentional "Reads Cargo.toml to check for axum dependency presence"
pub fn detect(source_dir: &Path) -> bool {
    // Check Cargo.toml for axum dependency
    let cargo_toml = source_dir.parent().unwrap_or(source_dir).join("Cargo.toml");
    if let Ok(content) = std::fs::read_to_string(&cargo_toml) {
        return content.contains("axum");
    }
    false
}
