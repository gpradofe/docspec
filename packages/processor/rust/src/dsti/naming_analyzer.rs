//! Parses Rust function/method names to extract semantic verbs and objects.
//!
//! @docspec:module {
//!   id: "docspec-rust-dsti-naming",
//!   name: "Naming Analyzer",
//!   description: "Extracts semantic verb-object pairs and intent categories from snake_case Rust function names, mirroring the Java NamingAnalyzer for camelCase.",
//!   since: "3.0.0"
//! }
//!
//! Uses snake_case conventions (unlike the Java NamingAnalyzer which uses camelCase).
//! Used by the DSTI (Documentation Semantic & Temporal Intelligence) system to infer
//! developer intent from naming patterns.
//!
//! Mirrors Java `io.docspec.processor.dsti.NamingAnalyzer`.

/// Semantic components extracted from a function name.
///
/// @docspec:boundary "Carries the decomposed verb, object, and intent from a single function name"
#[derive(Debug, Clone, PartialEq)]
pub struct NameSemantics {
    /// The verb prefix (e.g., "get", "create", "validate").
    pub verb: String,
    /// The object/noun portion (e.g., "user", "payment order").
    pub object: String,
    /// The inferred intent category (e.g., "query", "mutation", "creation").
    pub intent: String,
}

/// Known verb prefixes, ordered longest-first where needed to avoid prefix collisions.
const VERBS: &[&str] = &[
    "get", "set", "is", "has", "find", "create", "delete", "remove",
    "update", "save", "add", "validate", "check", "compute", "calculate",
    "process", "handle", "convert", "transform", "parse", "format",
    "build", "generate", "initialize", "init", "load", "fetch",
    "send", "receive", "publish", "subscribe", "notify", "dispatch",
    "sync", "migrate", "schedule", "retry", "batch",
    "aggregate", "merge", "split", "emit", "enrich", "filter",
    "list", "count", "verify", "execute", "run", "start", "stop",
    "open", "close", "read", "write", "flush", "drain",
    "encode", "decode", "serialize", "deserialize",
    "connect", "disconnect", "bind", "unbind",
    "register", "unregister", "mount", "unmount",
    "lock", "unlock", "acquire", "release",
    "try", "poll", "await", "spawn",
];

/// Analyze a function name (snake_case) and extract its semantic components.
///
/// @docspec:deterministic
/// @docspec:intentional "Decomposes a snake_case function name into verb, object, and intent category using a known verb dictionary"
///
/// # Examples
/// ```ignore
/// let result = analyze("get_user_by_id");
/// assert_eq!(result.verb, "get");
/// assert_eq!(result.object, "user by id");
/// assert_eq!(result.intent, "query");
/// ```
pub fn analyze(name: &str) -> NameSemantics {
    // Skip names starting with underscore (private/unused convention)
    let name = name.strip_prefix('_').unwrap_or(name);

    let words: Vec<&str> = name.split('_').collect();
    if words.is_empty() {
        return NameSemantics {
            verb: name.to_string(),
            object: String::new(),
            intent: "unknown".to_string(),
        };
    }

    // Try single-word verb match first
    let first = words[0];
    if VERBS.contains(&first) {
        let object = words[1..].join(" ");
        let intent = categorize_intent(first);
        return NameSemantics {
            verb: first.to_string(),
            object,
            intent,
        };
    }

    // Try two-word verb match (e.g., "try_get" -> verb="try_get")
    if words.len() >= 2 {
        let two_word = format!("{}_{}", words[0], words[1]);
        // Some compound verbs
        let compound_verbs = [
            ("try_get", "query"),
            ("try_send", "emission"),
            ("try_lock", "synchronize"),
            ("try_acquire", "synchronize"),
        ];
        for (compound, intent) in &compound_verbs {
            if two_word == *compound {
                let object = words[2..].join(" ");
                return NameSemantics {
                    verb: two_word,
                    object,
                    intent: intent.to_string(),
                };
            }
        }
    }

    // Fallback: the entire name is the verb
    NameSemantics {
        verb: name.to_string(),
        object: String::new(),
        intent: "unknown".to_string(),
    }
}

/// Categorize a verb into an intent category.
///
/// @docspec:deterministic
/// @docspec:intentional "Maps a verb string to one of 20+ intent categories using exhaustive pattern matching"
fn categorize_intent(verb: &str) -> String {
    match verb {
        "get" | "find" | "fetch" | "load" | "is" | "has" | "list" | "read" | "count"
            => "query",
        "set" | "update" | "save" | "add" | "write" | "flush"
            => "mutation",
        "create" | "build" | "generate" | "initialize" | "init" | "open" | "spawn"
            => "creation",
        "delete" | "remove" | "close" | "stop" | "drain"
            => "deletion",
        "validate" | "check" | "verify"
            => "validation",
        "compute" | "calculate" | "process"
            => "computation",
        "convert" | "parse" | "format" | "encode" | "decode" | "serialize" | "deserialize"
            => "transformation",
        "handle" | "dispatch" | "run" | "execute" | "start"
            => "handler",
        "send" | "emit"
            => "emission",
        "receive" | "poll"
            => "consumption",
        "sync"
            => "synchronize",
        "migrate"
            => "migrate",
        "schedule"
            => "schedule",
        "retry" | "try"
            => "retry",
        "batch"
            => "batch-process",
        "aggregate"
            => "aggregate",
        "merge"
            => "merge",
        "split"
            => "split",
        "notify"
            => "notify",
        "publish"
            => "publish",
        "subscribe"
            => "subscribe",
        "transform" | "enrich"
            => "transform",
        "filter"
            => "filter",
        "connect" | "bind" | "register" | "mount"
            => "lifecycle",
        "disconnect" | "unbind" | "unregister" | "unmount"
            => "lifecycle",
        "lock" | "acquire"
            => "synchronize",
        "unlock" | "release"
            => "synchronize",
        _
            => "unknown",
    }.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_verb() {
        let result = analyze("get_user");
        assert_eq!(result.verb, "get");
        assert_eq!(result.object, "user");
        assert_eq!(result.intent, "query");
    }

    #[test]
    fn test_multi_word_object() {
        let result = analyze("create_payment_order");
        assert_eq!(result.verb, "create");
        assert_eq!(result.object, "payment order");
        assert_eq!(result.intent, "creation");
    }

    #[test]
    fn test_validation_verb() {
        let result = analyze("validate_input");
        assert_eq!(result.verb, "validate");
        assert_eq!(result.object, "input");
        assert_eq!(result.intent, "validation");
    }

    #[test]
    fn test_unknown_verb() {
        let result = analyze("frobnicate");
        assert_eq!(result.verb, "frobnicate");
        assert_eq!(result.object, "");
        assert_eq!(result.intent, "unknown");
    }

    #[test]
    fn test_underscore_prefix_stripped() {
        let result = analyze("_get_internal");
        assert_eq!(result.verb, "get");
        assert_eq!(result.object, "internal");
        assert_eq!(result.intent, "query");
    }

    #[test]
    fn test_is_check() {
        let result = analyze("is_valid");
        assert_eq!(result.verb, "is");
        assert_eq!(result.intent, "query");
    }

    #[test]
    fn test_delete_verb() {
        let result = analyze("delete_old_records");
        assert_eq!(result.verb, "delete");
        assert_eq!(result.object, "old records");
        assert_eq!(result.intent, "deletion");
    }
}
