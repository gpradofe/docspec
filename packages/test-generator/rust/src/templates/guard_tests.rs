//! Generate guard clause test functions.
//!
//! @docspec:module {
//!   id: "docspec-rust-dsti-templates-guard",
//!   name: "Guard Clause Test Template",
//!   description: "Generates #[should_panic] test stubs for each guard clause detected in a method's DSTI intent signals, ensuring boundary conditions are tested.",
//!   since: "3.0.0"
//! }

use serde_json::Value;
use crate::generator::GeneratedTestFile;

/// @docspec:deterministic
/// @docspec:intentional "Generates one #[should_panic] test per detected guard clause from DSTI signals"
pub fn generate(method: &Value, output_dir: &str) -> Vec<GeneratedTestFile> {
    let qualified = method.get("qualified").and_then(|q| q.as_str()).unwrap_or("unknown");
    let parts: Vec<&str> = qualified.rsplitn(2, '#').collect();
    let method_name = parts.first().copied().unwrap_or("unknown");
    let type_name = parts.get(1).and_then(|s| s.rsplit("::").next()).unwrap_or("Unknown");
    let file_name = format!("test_{}_guards.rs", method_name);

    let signals = method.get("intentSignals").unwrap();
    let guard_count = signals.get("guardClauses").and_then(|g| g.as_u64()).unwrap_or(0);

    let mut tests = String::new();

    for i in 0..guard_count {
        tests.push_str(&format!(r#"
    #[test]
    #[should_panic]
    fn test_guard_{i}_{method_name}() {{
        // Given: input that violates guard condition {num}
        // When/Then: expect panic
        // TODO: Call {method_name} with invalid input
        todo!("Implement guard test");
    }}
"#, i = i, method_name = method_name, num = i + 1));
    }

    let content = format!(r#"//! Guard clause tests for {type_name}::{method_name}.
//! Auto-generated from DSTI intent signals.

#[cfg(test)]
mod {method_name}_guard_tests {{
    use super::*;
{tests}
}}
"#, type_name = type_name, method_name = method_name, tests = tests);

    vec![GeneratedTestFile {
        path: format!("{}/{}", output_dir, file_name),
        content,
        test_type: "guard".to_string(),
    }]
}
