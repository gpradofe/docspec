//! Extract intent signals from Rust AST using syn.
//!
//! @docspec:module {
//!   id: "docspec-rust-dsti-extractor",
//!   name: "Intent Signal Extractor",
//!   description: "Extracts DSTI intent signals from Rust function signatures and bodies using syn-based AST analysis and pattern matching across 13 channels.",
//!   since: "3.0.0"
//! }

use serde_json::Value;
use std::collections::HashMap;
use std::sync::LazyLock;

static VERB_INTENT: LazyLock<HashMap<&str, &str>> = LazyLock::new(|| {
    let mut m = HashMap::new();
    m.insert("get", "query"); m.insert("find", "query"); m.insert("fetch", "query"); m.insert("load", "query"); m.insert("list", "query");
    m.insert("create", "creation"); m.insert("new", "creation"); m.insert("add", "creation"); m.insert("insert", "creation");
    m.insert("update", "mutation"); m.insert("modify", "mutation"); m.insert("set", "mutation");
    m.insert("delete", "deletion"); m.insert("remove", "deletion");
    m.insert("validate", "validation"); m.insert("check", "validation"); m.insert("verify", "validation");
    m.insert("process", "transformation"); m.insert("handle", "transformation"); m.insert("transform", "transformation");
    m.insert("send", "communication"); m.insert("publish", "communication"); m.insert("emit", "communication");
    m.insert("calculate", "calculation"); m.insert("compute", "calculation"); m.insert("count", "calculation");
    m.insert("is", "query"); m.insert("has", "query");
    m
});

/// @docspec:method { since: "3.0.0" }
/// @docspec:intentional "Analyzes function name, signature, and body to extract intent signals across name semantics, guard clauses, branches, error handling, logging, and loop properties"
/// @docspec:deterministic
pub fn extract_from_fn(sig: &syn::Signature, block: &syn::Block) -> Option<Value> {
    let name = sig.ident.to_string();
    if name.starts_with('_') { return None; }

    let words: Vec<&str> = name.split('_').collect();
    let verb = words.first().copied().unwrap_or("");
    let object = words[1..].join("_");
    let intent = VERB_INTENT.get(verb).copied().unwrap_or("unknown");

    let body_text = quote::quote!(#block).to_string();

    // Count patterns in the body text
    let guard_clauses = body_text.matches("return Err").count()
        + body_text.matches("bail!").count()
        + body_text.matches("anyhow!").count();
    let branches = body_text.matches(" if ").count() + body_text.matches("match ").count();
    let error_handling = body_text.matches("Err(").count();
    let log_statements = body_text.matches("log::").count()
        + body_text.matches("tracing::").count()
        + body_text.matches("println!").count()
        + body_text.matches("eprintln!").count();

    let mut signals = serde_json::json!({
        "nameSemantics": {
            "verb": verb,
            "object": object,
            "intent": intent,
        },
    });

    let map = signals.as_object_mut().unwrap();
    if guard_clauses > 0 { map.insert("guardClauses".to_string(), guard_clauses.into()); }
    if branches > 0 { map.insert("branches".to_string(), branches.into()); }
    if error_handling > 0 {
        map.insert("errorHandling".to_string(), serde_json::json!({
            "catchBlocks": error_handling,
            "caughtTypes": [],
        }));
    }
    if log_statements > 0 { map.insert("logStatements".to_string(), log_statements.into()); }

    // Loop properties: detect iterators, for-loops, and stream ops
    let loop_props = extract_loop_properties(&body_text);
    if !loop_props.is_null() {
        map.insert("loopProperties".to_string(), loop_props);
    }

    Some(signals)
}

/// Rust stream/iterator operations to track in `streamOps`.
const STREAM_OPS: &[&str] = &[
    "map", "filter", "fold", "flat_map", "for_each", "collect",
    "any", "all", "find", "position", "enumerate", "zip",
    "take", "skip", "chain", "cloned", "copied",
    "filter_map", "flat_map", "inspect", "peekable",
    "reduce", "scan", "sum", "product", "count",
    "min", "max", "min_by", "max_by", "min_by_key", "max_by_key",
    "partition", "unzip",
];

/// Extract loop and iterator properties from the stringified function body.
///
/// @docspec:deterministic
/// @docspec:intentional "Detects for-loops, iterator chains, and stream operations to populate the loopProperties DSTI channel"
fn extract_loop_properties(body_text: &str) -> Value {
    let has_for = body_text.contains("for ") && body_text.contains(" in ");
    let has_iterators = body_text.contains(".iter()")
        || body_text.contains(".iter_mut()")
        || body_text.contains(".into_iter()");

    // Detect stream ops by looking for `.op_name(` patterns
    let mut stream_ops: Vec<&str> = Vec::new();
    for &op in STREAM_OPS {
        let pattern = format!(".{}(", op);
        if body_text.contains(&pattern) {
            stream_ops.push(op);
        }
    }

    if !has_for && !has_iterators && stream_ops.is_empty() {
        return Value::Null;
    }

    let mut props = serde_json::json!({});
    let obj = props.as_object_mut().unwrap();

    if has_iterators || !stream_ops.is_empty() {
        obj.insert("hasStreams".to_string(), true.into());
    }
    if has_for {
        obj.insert("hasEnhancedFor".to_string(), true.into());
    }
    if !stream_ops.is_empty() {
        stream_ops.sort();
        stream_ops.dedup();
        obj.insert("streamOps".to_string(), serde_json::json!(stream_ops));
    }

    props
}
