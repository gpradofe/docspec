//! Infer descriptions from Rust identifiers.
//!
//! @docspec:module {
//!   id: "docspec-rust-reader-inferrer",
//!   name: "Description Inferrer",
//!   description: "Generates human-readable description strings from snake_case Rust identifiers by matching verb prefixes against a known dictionary and constructing natural-language sentences.",
//!   since: "3.0.0"
//! }

use std::collections::HashMap;
use std::sync::LazyLock;

static VERB_MAP: LazyLock<HashMap<&str, &str>> = LazyLock::new(|| {
    let mut m = HashMap::new();
    m.insert("get", "Retrieves"); m.insert("find", "Finds"); m.insert("fetch", "Fetches");
    m.insert("create", "Creates"); m.insert("new", "Creates a new");
    m.insert("add", "Adds"); m.insert("insert", "Inserts"); m.insert("save", "Saves");
    m.insert("update", "Updates"); m.insert("modify", "Modifies"); m.insert("set", "Sets");
    m.insert("delete", "Deletes"); m.insert("remove", "Removes");
    m.insert("validate", "Validates"); m.insert("check", "Checks"); m.insert("verify", "Verifies");
    m.insert("process", "Processes"); m.insert("handle", "Handles"); m.insert("execute", "Executes");
    m.insert("send", "Sends"); m.insert("publish", "Publishes"); m.insert("emit", "Emits");
    m.insert("convert", "Converts"); m.insert("transform", "Transforms"); m.insert("parse", "Parses");
    m.insert("calculate", "Calculates"); m.insert("compute", "Computes"); m.insert("count", "Counts");
    m.insert("is", "Checks whether"); m.insert("has", "Checks if has");
    m
});

/// @docspec:deterministic
/// @docspec:intentional "Transforms a snake_case identifier into a human-readable sentence using verb-prefix dictionary lookup"
pub fn infer(name: &str) -> String {
    let words: Vec<&str> = name.split('_').collect();
    if words.is_empty() { return String::new(); }

    let verb = words[0];
    let rest: Vec<&str> = words[1..].to_vec();
    let rest_str = rest.join(" ");

    if let Some(prefix) = VERB_MAP.get(verb) {
        if !rest_str.is_empty() {
            format!("{} {}.", prefix, rest_str)
        } else {
            format!("{} the resource.", prefix)
        }
    } else {
        let humanized = words.join(" ");
        let mut chars = humanized.chars();
        match chars.next() {
            None => String::new(),
            Some(c) => format!("{}{}.", c.to_uppercase(), chars.collect::<String>()),
        }
    }
}
