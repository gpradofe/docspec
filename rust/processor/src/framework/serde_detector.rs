//! Detect Serde serialization framework usage.
//!
//! @docspec:module {
//!   id: "docspec-rust-framework-serde",
//!   name: "Serde Detector",
//!   description: "Checks Cargo.toml for the serde dependency to detect Serde serialization framework usage.",
//!   since: "3.0.0"
//! }

use std::path::Path;

/// @docspec:deterministic
/// @docspec:intentional "Reads Cargo.toml to check for serde dependency presence"
pub fn detect(source_dir: &Path) -> bool {
    let cargo_toml = source_dir.parent().unwrap_or(source_dir).join("Cargo.toml");
    if let Ok(content) = std::fs::read_to_string(&cargo_toml) {
        return content.contains("serde");
    }
    false
}
