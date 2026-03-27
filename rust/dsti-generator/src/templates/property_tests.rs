//! Generate property-based tests using proptest.
//!
//! @docspec:module {
//!   id: "docspec-rust-dsti-templates-property",
//!   name: "Property Test Template",
//!   description: "Generates proptest-based property tests from DSTI intent categories: idempotency for queries, state-change for mutations, purity for validations, and invariant rule assertions from @DocInvariant Property DSL expressions.",
//!   since: "3.0.0"
//! }

use serde_json::Value;
use crate::generator::GeneratedTestFile;
use regex::Regex;

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
        _ => {}
    }

    // Generate invariant rule tests from @DocInvariant Property DSL expressions
    if let Some(rules) = signals.get("invariantRules").and_then(|r| r.as_array()) {
        for rule_val in rules {
            if let Some(rule_expr) = rule_val.as_str() {
                let assertion = map_dsl_to_rust_assertion(rule_expr);
                let safe_name: String = rule_expr.chars()
                    .map(|c| if c.is_alphanumeric() { c } else { '_' })
                    .collect::<String>()
                    .to_lowercase();
                let safe_name = safe_name.trim_matches('_').to_string();
                tests.push_str(&format!(r#"
    proptest! {{
        #[test]
        fn invariant_{safe_name}(input in "\\PC*") {{
            let result = sut.{method_name}(&input);
            {assertion}
        }}
    }}
"#, safe_name = safe_name, method_name = method_name, assertion = assertion));
            }
        }
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

/// Convert a dotted field path to a Rust accessor, mapping "output" to "result".
fn to_rust_accessor(field: &str) -> String {
    let parts: Vec<&str> = field.split('.').collect();
    let mut result = Vec::new();
    for (i, part) in parts.iter().enumerate() {
        if i == 0 && *part == "output" {
            result.push("result".to_string());
        } else {
            result.push(part.to_string());
        }
    }
    result.join(".")
}

/// Map a Property DSL expression to a Rust assertion string.
///
/// Supports NOT_NULL, NOT_EMPTY, NOT_BLANK, SIZE, IN, BETWEEN, RANGE,
/// MATCHES, comparison operators, and monotonicity patterns.
///
/// @docspec:deterministic
fn map_dsl_to_rust_assertion(expression: &str) -> String {
    let expr = expression.trim();

    // RANGE shorthand: field RANGE min..max
    let range_re = Regex::new(r"(?i)^(.+)\s+RANGE\s+(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$").unwrap();
    if let Some(caps) = range_re.captures(expr) {
        let accessor = to_rust_accessor(caps[1].trim());
        return format!("assert!(({}..={}).contains(&{}));", &caps[2], &caps[3], accessor);
    }

    // Monotonicity: field UP/DOWN -> field UP/DOWN
    let mono_re = Regex::new(r"^(.+)\s+(UP|DOWN)\s*[→\->]+\s*(.+)\s+(UP|DOWN)$").unwrap();
    if let Some(caps) = mono_re.captures(expr) {
        let output_accessor = to_rust_accessor(caps[3].trim());
        let cmp = if &caps[4] == "UP" { ">=" } else { "<=" };
        return format!(
            "let baseline = {};\n            // Increase {} and verify {} moves {}\n            assert!({} {} baseline);",
            output_accessor, caps[1].trim(), caps[3].trim(), &caps[4], output_accessor, cmp
        );
    }

    // NOT_NULL
    let not_null_re = Regex::new(r"(?i)^(\S+)\s+NOT_NULL$").unwrap();
    if let Some(caps) = not_null_re.captures(expr) {
        return format!("assert!({}.is_some());", to_rust_accessor(&caps[1]));
    }

    // NOT_EMPTY
    let not_empty_re = Regex::new(r"(?i)^(\S+)\s+NOT_EMPTY$").unwrap();
    if let Some(caps) = not_empty_re.captures(expr) {
        return format!("assert!(!{}.is_empty());", to_rust_accessor(&caps[1]));
    }

    // NOT_BLANK
    let not_blank_re = Regex::new(r"(?i)^(\S+)\s+NOT_BLANK$").unwrap();
    if let Some(caps) = not_blank_re.captures(expr) {
        return format!("assert!(!{}.trim().is_empty());", to_rust_accessor(&caps[1]));
    }

    // SIZE comparison
    let size_re = Regex::new(r"(?i)^(\S+)\s+SIZE\s*(>=?|<=?|==|!=)\s*(-?\d+(?:\.\d+)?)$").unwrap();
    if let Some(caps) = size_re.captures(expr) {
        let accessor = to_rust_accessor(&caps[1]);
        let op = &caps[2];
        let val = &caps[3];
        if op == ">" && val == "0" {
            return format!("assert!(!{}.is_empty());", accessor);
        }
        return format!("assert!({}.len() {} {});", accessor, op, val);
    }

    // IN [values]
    let in_re = Regex::new(r"(?i)^(\S+)\s+IN\s*\[(.+)]$").unwrap();
    if let Some(caps) = in_re.captures(expr) {
        let accessor = to_rust_accessor(&caps[1]);
        let values: Vec<String> = caps[2].split(',')
            .map(|v| {
                let trimmed = v.trim().trim_matches(|c| c == '"' || c == '\'');
                if trimmed.parse::<f64>().is_ok() {
                    trimmed.to_string()
                } else {
                    format!("\"{}\"", trimmed)
                }
            })
            .collect();
        let conditions: Vec<String> = values.iter()
            .map(|v| format!("{} == {}", accessor, v))
            .collect();
        return format!("assert!({});", conditions.join(" || "));
    }

    // BETWEEN min AND max
    let between_re = Regex::new(r"(?i)^(\S+)\s+BETWEEN\s+(-?\d+(?:\.\d+)?)\s+AND\s+(-?\d+(?:\.\d+)?)$").unwrap();
    if let Some(caps) = between_re.captures(expr) {
        let accessor = to_rust_accessor(&caps[1]);
        return format!("assert!(({}..={}).contains(&{}));", &caps[2], &caps[3], accessor);
    }

    // MATCHES pattern
    let matches_re = Regex::new(r"(?i)^(\S+)\s+MATCHES\s+(.+)$").unwrap();
    if let Some(caps) = matches_re.captures(expr) {
        let accessor = to_rust_accessor(&caps[1]);
        let pattern = caps[2].trim().trim_matches(|c| c == '"' || c == '\'');
        return format!("assert!(regex::Regex::new(r\"{}\").unwrap().is_match(&{}));", pattern, accessor);
    }

    // Comparison: >=, <=, !=, ==, >, <
    let comp_re = Regex::new(r"^(\S+)\s*(>=|<=|!=|==|>|<)\s*(.+)$").unwrap();
    if let Some(caps) = comp_re.captures(expr) {
        let accessor = to_rust_accessor(&caps[1]);
        return format!("assert!({} {} {});", accessor, &caps[2], caps[3].trim());
    }

    format!("// Property: {}", expression)
}
