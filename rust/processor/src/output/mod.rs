//! Output serialization.
//!
//! @docspec:module {
//!   id: "docspec-rust-output",
//!   name: "Output Serializer",
//!   description: "Serializes the assembled DocSpec JSON model to docspec.json and optionally writes a separate intent-graph.json file.",
//!   since: "3.0.0"
//! }

use serde_json::Value;
use std::path::Path;

/// @docspec:method { since: "3.0.0" }
/// @docspec:intentional "Writes the final docspec.json and optional intent-graph.json to the output directory"
pub fn write_spec(spec: &Value, output_dir: &Path) {
    std::fs::create_dir_all(output_dir).ok();

    let spec_path = output_dir.join("docspec.json");
    let json = serde_json::to_string_pretty(spec).expect("Failed to serialize spec");
    std::fs::write(&spec_path, json).expect("Failed to write docspec.json");

    // Write intent-graph.json if present
    if let Some(ig) = spec.get("intentGraph") {
        let ig_path = output_dir.join("intent-graph.json");
        let ig_data = serde_json::json!({
            "docspec": spec["docspec"],
            "artifact": {
                "groupId": spec["artifact"]["groupId"],
                "artifactId": spec["artifact"]["artifactId"],
                "version": spec["artifact"]["version"],
            },
            "methods": ig["methods"],
        });
        let ig_json = serde_json::to_string_pretty(&ig_data).expect("Failed to serialize intent graph");
        std::fs::write(&ig_path, ig_json).expect("Failed to write intent-graph.json");
    }
}
