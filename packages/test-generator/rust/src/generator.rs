//! Generate Rust test files from DSTI intent signals.
//!
//! @docspec:module {
//!   id: "docspec-rust-dsti-generator-core",
//!   name: "Test Generator Core",
//!   description: "Orchestrates test generation by iterating intent graph methods and dispatching to guard and property test templates based on signal analysis.",
//!   since: "3.0.0"
//! }

use serde_json::Value;
use crate::templates::{guard_tests, property_tests};

/// @docspec:boundary "Represents a generated test file with path, content, and test type metadata"
pub struct GeneratedTestFile {
    pub path: String,
    pub content: String,
    pub test_type: String,
}

/// @docspec:boundary "Orchestrates DSTI-driven test generation for Rust projects"
pub struct RustTestGenerator {
    pub output_dir: String,
}

impl RustTestGenerator {
    /// @docspec:deterministic
    pub fn new(output_dir: &str) -> Self {
        Self { output_dir: output_dir.to_string() }
    }

    /// @docspec:method { since: "3.0.0" }
    /// @docspec:intentional "Iterates intent graph methods and generates guard and property test files based on signal analysis"
    /// @docspec:deterministic
    pub fn generate(&self, intent_graph: &Value) -> Vec<GeneratedTestFile> {
        let mut files = Vec::new();
        let methods = intent_graph.get("methods").and_then(|m| m.as_array());

        if let Some(methods) = methods {
            for method in methods {
                let signals = method.get("intentSignals");
                if signals.is_none() { continue; }
                let signals = signals.unwrap();

                let guard_count = signals.get("guardClauses")
                    .and_then(|g| g.as_u64())
                    .unwrap_or(0);

                if guard_count > 0 {
                    files.extend(guard_tests::generate(method, &self.output_dir));
                }

                files.extend(property_tests::generate(method, &self.output_dir));
            }
        }

        files
    }
}
