//! Generate property-based tests using proptest.
//!
//! @docspec:module {
//!   id: "docspec-rust-dsti-templates-property",
//!   name: "Property Test Template",
//!   description: "Generates proptest-based property tests from DSTI intent categories: idempotency for queries, state-change for mutations, and purity for validations.",
//!   since: "3.0.0"
//! }

use serde_json::Value;
use crate::generator::GeneratedTestFile;

/// @docspec:deterministic
/// @docspec:intentional "Generates property-based test stubs using proptest, matching intent category to test strategy (idempotency, state-change, purity)"
pub fn generate(method: &Value, output_dir: &str) -> Vec<GeneratedTestFile> {
    let qualified = method.get("qualified").and_then(|q| q.as_str()).unwrap_or("unknown");
    let parts: Vec<&str> = qualified.rsplitn(2, '#').collect();
    let method_name = parts.first().copied().unwrap_or("unknown");
    let type_name = parts.get(1).and_then(|s| s.rsplit("::").next()).unwrap_or("Unknown");
    let file_name = format!("test_{}_properties.rs", method_name);

    let signals = method.get("intentSignals").unwrap();
    let intent = signals.get("nameSemantics")
        .and_then(|ns| ns.get("intent"))
        .and_then(|i| i.as_str())
        .unwrap_or("unknown");

    let mut tests = String::new();

    match intent {
        "query" => {
            tests.push_str(&format!(r#"
    proptest! {{
        #[test]
        fn {method_name}_is_idempotent(input in "\\PC*") {{
            // let result1 = sut.{method_name}(&input);
            // let result2 = sut.{method_name}(&input);
            // prop_assert_eq!(result1, result2);
        }}
    }}
"#, method_name = method_name));
        }
        "creation" | "mutation" => {
            tests.push_str(&format!(r#"
    proptest! {{
        #[test]
        fn {method_name}_changes_state(input in "\\PC*") {{
            // let before = sut.get_state();
            // sut.{method_name}(&input);
            // let after = sut.get_state();
            // prop_assert_ne!(before, after);
        }}
    }}
"#, method_name = method_name));
        }
        "validation" => {
            tests.push_str(&format!(r#"
    proptest! {{
        #[test]
        fn {method_name}_is_pure(input in "\\PC*") {{
            // let result1 = sut.{method_name}(&input);
            // let result2 = sut.{method_name}(&input);
            // prop_assert_eq!(result1, result2);
        }}
    }}
"#, method_name = method_name));
        }
        _ => return vec![],
    }

    if tests.is_empty() { return vec![]; }

    let content = format!(r#"//! Property-based tests for {type_name}::{method_name}.
//! Auto-generated from DSTI intent signals using proptest.

#[cfg(test)]
mod {method_name}_property_tests {{
    use super::*;
    use proptest::prelude::*;
{tests}
}}
"#, type_name = type_name, method_name = method_name, tests = tests);

    vec![GeneratedTestFile {
        path: format!("{}/{}", output_dir, file_name),
        content,
        test_type: "property".to_string(),
    }]
}
