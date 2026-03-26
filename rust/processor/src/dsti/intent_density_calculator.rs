//! Calculate the Intent Signal Density (ISD) score for a method
//! based on collected intent signals across all 13 channels.
//!
//! @docspec:module {
//!   id: "docspec-rust-dsti-isd",
//!   name: "Intent Density Calculator",
//!   description: "Computes a weighted Intent Signal Density (ISD) score from 0.0 to 1.0 across 13 DSTI channels, mirroring the Java IntentDensityCalculator.",
//!   since: "3.0.0"
//! }
//!
//! The score ranges from 0.0 (no intent signals) to 1.0 (maximum density).
//!
//! Mirrors Java `io.docspec.processor.dsti.IntentDensityCalculator`.
//!
//! ISD formula (weights sum to 1.0):
//! ```text
//! ISD = w1*nameSemantics + w2*guardClauses + w3*branches + w4*dataFlow
//!     + w5*returnType + w6*loops + w7*errorHandling + w8*constants
//!     + w9*optionChecks + w10*assertions + w11*logging + w12*dependencies
//!     + w13*validationAttrs
//! ```

use serde_json::Value;

// Channel weights (sum = 1.0)
const W_NAME_SEMANTICS: f64 = 0.15;
const W_GUARD_CLAUSES: f64 = 0.10;
const W_BRANCHES: f64 = 0.10;
const W_DATA_FLOW: f64 = 0.05;
const W_RETURN_TYPE: f64 = 0.05;
const W_LOOPS: f64 = 0.08;
const W_ERROR_HANDLING: f64 = 0.10;
const W_CONSTANTS: f64 = 0.05;
const W_OPTION_CHECKS: f64 = 0.07;   // Rust equivalent of Java null checks
const W_ASSERTIONS: f64 = 0.07;
const W_LOGGING: f64 = 0.05;
const W_DEPENDENCIES: f64 = 0.08;
const W_VALIDATION_ATTRS: f64 = 0.05;

/// Calculate the ISD score for the given intent signals JSON object.
///
/// The `signals` value is expected to have the shape produced by
/// `intent_extractor::extract_from_fn`.
///
/// Returns a score between 0.0 and 1.0.
///
/// @docspec:deterministic
/// @docspec:invariant { rules: ["score >= 0.0", "score <= 1.0", "channel weights sum to 1.0"] }
/// @docspec:intentional "Evaluates 13 DSTI channels with weighted scoring to produce a single density metric"
pub fn calculate(signals: &Value) -> f64 {
    let mut score = 0.0;

    // Channel 1: Name semantics
    if let Some(ns) = signals.get("nameSemantics") {
        let intent = ns.get("intent").and_then(|i| i.as_str()).unwrap_or("unknown");
        if intent != "unknown" {
            score += W_NAME_SEMANTICS;
        }
    }

    // Channel 2: Guard clauses (scaled up to W_GUARD_CLAUSES)
    if let Some(gc) = signals.get("guardClauses").and_then(|v| v.as_u64()) {
        if gc > 0 {
            score += f64::min(W_GUARD_CLAUSES, gc as f64 * 0.035);
        }
    }

    // Channel 3: Branches (scaled up to W_BRANCHES)
    if let Some(br) = signals.get("branches").and_then(|v| v.as_u64()) {
        if br > 0 {
            score += f64::min(W_BRANCHES, br as f64 * 0.025);
        }
    }

    // Channel 4: Data flow
    if let Some(df) = signals.get("dataFlow") {
        let has_reads = df.get("reads")
            .and_then(|r| r.as_array())
            .map(|a| !a.is_empty())
            .unwrap_or(false);
        let has_writes = df.get("writes")
            .and_then(|w| w.as_array())
            .map(|a| !a.is_empty())
            .unwrap_or(false);
        if has_reads && has_writes {
            score += W_DATA_FLOW;
        } else if has_reads || has_writes {
            score += W_DATA_FLOW * 0.5;
        }
    }

    // Channel 5: Return type (inferred from verb intent)
    if let Some(ns) = signals.get("nameSemantics") {
        let intent = ns.get("intent").and_then(|i| i.as_str()).unwrap_or("");
        if matches!(intent, "query" | "creation" | "transformation") {
            score += W_RETURN_TYPE;
        }
    }

    // Channel 6: Loop properties (iterators, for loops, stream ops)
    if let Some(lp) = signals.get("loopProperties") {
        let mut loop_score = 0.0;
        if lp.get("hasStreams").or(lp.get("hasIterators"))
            .and_then(|v| v.as_bool()).unwrap_or(false) {
            loop_score += W_LOOPS * 0.4;
        }
        if lp.get("hasEnhancedFor").or(lp.get("hasForLoop"))
            .and_then(|v| v.as_bool()).unwrap_or(false) {
            loop_score += W_LOOPS * 0.3;
        }
        if let Some(ops) = lp.get("streamOps").and_then(|v| v.as_array()) {
            if !ops.is_empty() {
                loop_score += f64::min(W_LOOPS * 0.3, ops.len() as f64 * 0.01);
            }
        }
        score += f64::min(W_LOOPS, loop_score);
    }

    // Channel 7: Error handling (scaled up to W_ERROR_HANDLING)
    if let Some(eh) = signals.get("errorHandling") {
        let catch_blocks = eh.get("catchBlocks").and_then(|v| v.as_u64()).unwrap_or(0);
        if catch_blocks > 0 {
            score += f64::min(W_ERROR_HANDLING, catch_blocks as f64 * 0.035);
        }
    }

    // Channel 8: Constants (scaled up to W_CONSTANTS)
    if let Some(constants) = signals.get("constants").and_then(|v| v.as_array()) {
        if !constants.is_empty() {
            score += f64::min(W_CONSTANTS, constants.len() as f64 * 0.015);
        }
    }

    // Channel 9: Option/Result checks (Rust equivalent of null checks)
    let option_checks = signals.get("optionChecks")
        .or_else(|| signals.get("nullChecks"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    if option_checks > 0 {
        score += f64::min(W_OPTION_CHECKS, option_checks as f64 * 0.02);
    }

    // Channel 10: Assertions (assert!, debug_assert!, assert_eq!, etc.)
    let assertions = signals.get("assertions").and_then(|v| v.as_u64()).unwrap_or(0);
    if assertions > 0 {
        score += f64::min(W_ASSERTIONS, assertions as f64 * 0.025);
    }

    // Channel 11: Logging (tracing, log crate)
    let log_statements = signals.get("logStatements").and_then(|v| v.as_u64()).unwrap_or(0);
    if log_statements > 0 {
        score += f64::min(W_LOGGING, log_statements as f64 * 0.02);
    }

    // Channel 12: Dependencies (injected types, function parameters)
    if let Some(deps) = signals.get("dependencies").and_then(|v| v.as_array()) {
        if !deps.is_empty() {
            score += f64::min(W_DEPENDENCIES, deps.len() as f64 * 0.025);
        }
    }

    // Channel 13: Validation attributes (custom doc_validate, etc.)
    let validation_attrs = signals.get("validationAnnotations")
        .or_else(|| signals.get("validationAttrs"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    if validation_attrs > 0 {
        score += f64::min(W_VALIDATION_ATTRS, validation_attrs as f64 * 0.02);
    }

    f64::min(1.0, score)
}

/// Calculate ISD scores for all methods in an intent graph and add the
/// `intentDensity` field to each method entry.
///
/// @docspec:method { since: "3.0.0" }
/// @docspec:intentional "Enriches each method in the intent graph with its computed ISD score"
/// @docspec:preserves "existing method data is preserved; only intentDensity is added"
pub fn enrich_intent_graph(intent_graph: &mut Value) {
    if let Some(methods) = intent_graph.get_mut("methods").and_then(|m| m.as_array_mut()) {
        for method in methods {
            if let Some(signals) = method.get("intentSignals") {
                let density = calculate(signals);
                method.as_object_mut().unwrap()
                    .insert("intentDensity".to_string(), serde_json::json!(
                        (density * 1000.0).round() / 1000.0
                    ));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_signals_score_zero() {
        let signals = serde_json::json!({});
        let score = calculate(&signals);
        assert!((score - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn name_semantics_only() {
        let signals = serde_json::json!({
            "nameSemantics": {
                "verb": "get",
                "object": "user",
                "intent": "query",
            }
        });
        let score = calculate(&signals);
        // nameSemantics (0.15) + returnType for query (0.05) = 0.20
        assert!((score - 0.20).abs() < 0.001);
    }

    #[test]
    fn score_capped_at_one() {
        let signals = serde_json::json!({
            "nameSemantics": { "verb": "get", "object": "x", "intent": "query" },
            "guardClauses": 10,
            "branches": 10,
            "dataFlow": { "reads": ["a"], "writes": ["b"] },
            "loopProperties": { "hasStreams": true, "hasEnhancedFor": true, "streamOps": ["filter", "map"] },
            "errorHandling": { "catchBlocks": 10 },
            "constants": ["A", "B", "C", "D", "E"],
            "optionChecks": 10,
            "assertions": 10,
            "logStatements": 10,
            "dependencies": ["dep1", "dep2", "dep3", "dep4"],
            "validationAnnotations": 10,
        });
        let score = calculate(&signals);
        assert!(score <= 1.0);
        assert!(score > 0.9); // Should be very close to 1.0
    }

    #[test]
    fn enrich_adds_density() {
        let mut ig = serde_json::json!({
            "methods": [{
                "qualified": "mod::func",
                "intentSignals": {
                    "nameSemantics": { "verb": "validate", "object": "input", "intent": "validation" },
                    "guardClauses": 2,
                }
            }]
        });
        enrich_intent_graph(&mut ig);
        let density = ig["methods"][0]["intentDensity"].as_f64().unwrap();
        assert!(density > 0.0);
        assert!(density <= 1.0);
    }
}
