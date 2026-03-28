//! Detect error types and event patterns in Rust projects.
//!
//! @docspec:module {
//!   id: "docspec-rust-extractor-error-event",
//!   name: "Error & Event Extractor",
//!   description: "Detects error enums (thiserror, naming conventions, doc_error attributes) and event types (naming conventions, doc_event attributes) to populate the errors and events sections of the DocSpec model.",
//!   since: "3.0.0"
//! }
//!
//! Looks for:
//! - `thiserror` derive macros (`#[derive(Error)]`)
//! - Custom error enums implementing `std::error::Error`
//! - `Result<T, E>` return types to extract error type names
//! - Event structs / enums (names ending in Event, Message, Command, etc.)
//! - `#[doc_error]` and `#[doc_event]` custom attributes

use serde_json::Value;
use quote::ToTokens;
use crate::scanner::FileInfo;
use super::{DocSpecExtractor, ProcessorContext};

/// Suffixes that indicate an event type.
const EVENT_SUFFIXES: &[&str] = &[
    "Event",
    "Message",
    "Command",
    "Notification",
    "Signal",
    "Msg",
];

/// Suffixes that indicate an error type.
const ERROR_SUFFIXES: &[&str] = &[
    "Error",
    "Err",
    "Failure",
    "Exception",
];

/// @docspec:boundary "Error type and event pattern detection across enums, structs, and custom attributes"
pub struct ErrorEventExtractor;

impl DocSpecExtractor for ErrorEventExtractor {
    /// @docspec:deterministic
    fn is_available(&self, _ctx: &ProcessorContext) -> bool {
        // Error/event extraction is always available; it works with standard
        // Rust patterns and optional custom attributes.
        true
    }

    /// @docspec:deterministic
    fn extractor_name(&self) -> &'static str {
        "error-event"
    }

    /// @docspec:intentional "Detect error enums/structs and event types via derive macros, naming conventions, and custom attributes"
    fn extract(&self, files: &[FileInfo], ctx: &mut ProcessorContext) {
        let mut errors: Vec<Value> = Vec::new();
        let mut events: Vec<Value> = Vec::new();

        for file_info in files {
            let syntax = match syn::parse_file(&file_info.source) {
                Ok(s) => s,
                Err(_) => continue,
            };

            for item in &syntax.items {
                match item {
                    syn::Item::Enum(e) => {
                        let name = e.ident.to_string();
                        let qualified = format!("{}::{}", file_info.module, name);
                        let doc = crate::reader::doc_comment_reader::read_doc_comment(&e.attrs);

                        // Check if it's an error enum
                        if is_error_type(&e.attrs, &name) {
                            let variants: Vec<Value> = e.variants.iter().map(|v| {
                                let variant_name = v.ident.to_string();
                                let variant_doc = crate::reader::doc_comment_reader::read_doc_comment(&v.attrs);
                                let mut entry = serde_json::json!({
                                    "name": variant_name,
                                });
                                if let Some(d) = variant_doc {
                                    entry.as_object_mut().unwrap()
                                        .insert("description".to_string(), Value::String(d));
                                }
                                // Try to extract HTTP status code from #[error] attribute message
                                if let Some(status) = extract_error_status(&v.attrs) {
                                    entry.as_object_mut().unwrap()
                                        .insert("httpStatus".to_string(), Value::Number(status.into()));
                                }
                                entry
                            }).collect();

                            let mut error_entry = serde_json::json!({
                                "type": qualified,
                                "variants": variants,
                            });
                            if let Some(ref d) = doc {
                                error_entry.as_object_mut().unwrap()
                                    .insert("description".to_string(), Value::String(d.clone()));
                            }

                            // Check for #[doc_error] attributes
                            if let Some(attrs) = extract_doc_error_attrs(&e.attrs) {
                                let map = error_entry.as_object_mut().unwrap();
                                for (k, v) in attrs {
                                    map.insert(k, Value::String(v));
                                }
                            }

                            errors.push(error_entry);
                        }

                        // Check if it's an event enum
                        if is_event_type(&e.attrs, &name) {
                            let variants: Vec<String> = e.variants.iter()
                                .map(|v| v.ident.to_string())
                                .collect();
                            let mut event_entry = serde_json::json!({
                                "type": qualified,
                                "variants": variants,
                            });
                            if let Some(ref d) = doc {
                                event_entry.as_object_mut().unwrap()
                                    .insert("description".to_string(), Value::String(d.clone()));
                            }
                            if let Some(attrs) = extract_doc_event_attrs(&e.attrs) {
                                let map = event_entry.as_object_mut().unwrap();
                                for (k, v) in attrs {
                                    map.insert(k, Value::String(v));
                                }
                            }
                            events.push(event_entry);
                        }
                    }
                    syn::Item::Struct(s) => {
                        let name = s.ident.to_string();
                        let qualified = format!("{}::{}", file_info.module, name);
                        let doc = crate::reader::doc_comment_reader::read_doc_comment(&s.attrs);

                        // Check if struct has #[doc_error]
                        if has_attr(&s.attrs, "doc_error") || is_name_match(&name, ERROR_SUFFIXES) {
                            let fields: Vec<String> = s.fields.iter()
                                .filter_map(|f| f.ident.as_ref().map(|i| i.to_string()))
                                .collect();
                            let mut error_entry = serde_json::json!({
                                "type": qualified,
                                "fields": fields,
                            });
                            if let Some(ref d) = doc {
                                error_entry.as_object_mut().unwrap()
                                    .insert("description".to_string(), Value::String(d.clone()));
                            }
                            errors.push(error_entry);
                        }

                        // Check if struct has #[doc_event] or name matches event pattern
                        if has_attr(&s.attrs, "doc_event") || is_name_match(&name, EVENT_SUFFIXES) {
                            let fields: Vec<String> = s.fields.iter()
                                .filter_map(|f| f.ident.as_ref().map(|i| i.to_string()))
                                .collect();
                            let mut event_entry = serde_json::json!({
                                "type": qualified,
                                "fields": fields,
                            });
                            if let Some(ref d) = doc {
                                event_entry.as_object_mut().unwrap()
                                    .insert("description".to_string(), Value::String(d.clone()));
                            }
                            if let Some(attrs) = extract_doc_event_attrs(&s.attrs) {
                                let map = event_entry.as_object_mut().unwrap();
                                for (k, v) in attrs {
                                    map.insert(k, Value::String(v));
                                }
                            }
                            events.push(event_entry);
                        }
                    }
                    _ => {}
                }
            }
        }

        if !errors.is_empty() {
            ctx.errors = errors;
        }
        if !events.is_empty() {
            ctx.events = events;
        }
    }
}

/// Check if a type is an error type by derive macros or naming convention.
///
/// @docspec:deterministic
fn is_error_type(attrs: &[syn::Attribute], name: &str) -> bool {
    // Check for #[derive(Error)] (thiserror)
    if has_derive(attrs, "Error") {
        return true;
    }
    // Check for #[doc_error]
    if has_attr(attrs, "doc_error") {
        return true;
    }
    // Check naming convention
    is_name_match(name, ERROR_SUFFIXES)
}

/// Check if a type is an event type by naming convention or attribute.
///
/// @docspec:deterministic
fn is_event_type(attrs: &[syn::Attribute], name: &str) -> bool {
    if has_attr(attrs, "doc_event") {
        return true;
    }
    is_name_match(name, EVENT_SUFFIXES)
}

/// Check if a name ends with any of the given suffixes.
///
/// @docspec:deterministic
fn is_name_match(name: &str, suffixes: &[&str]) -> bool {
    suffixes.iter().any(|suffix| name.ends_with(suffix))
}

/// Check if a derive attribute contains the given macro name.
///
/// @docspec:deterministic
fn has_derive(attrs: &[syn::Attribute], derive_name: &str) -> bool {
    for attr in attrs {
        if attr.path().is_ident("derive") {
            let tokens = attr.meta.to_token_stream().to_string();
            if tokens.contains(derive_name) {
                return true;
            }
        }
    }
    false
}

/// Check if an attribute with the given name is present.
///
/// @docspec:deterministic
fn has_attr(attrs: &[syn::Attribute], name: &str) -> bool {
    attrs.iter().any(|a| {
        a.path().get_ident().map(|i| i == name).unwrap_or(false)
    })
}

/// Try to extract an HTTP status code from `#[error(status = 404)]` or similar patterns.
///
/// @docspec:deterministic
fn extract_error_status(attrs: &[syn::Attribute]) -> Option<u16> {
    for attr in attrs {
        let tokens = attr.meta.to_token_stream().to_string();
        // Look for status = NNN pattern
        if let Some(pos) = tokens.find("status") {
            let rest = &tokens[pos + 6..];
            let rest = rest.trim_start().trim_start_matches('=').trim_start();
            let num_str: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
            if let Ok(status) = num_str.parse::<u16>() {
                if (100..600).contains(&status) {
                    return Some(status);
                }
            }
        }
    }
    None
}

/// Extract key-value pairs from `#[doc_error(code = "E001", severity = "critical")]`.
///
/// @docspec:deterministic
fn extract_doc_error_attrs(attrs: &[syn::Attribute]) -> Option<Vec<(String, String)>> {
    for attr in attrs {
        if let Some(ident) = attr.path().get_ident() {
            if ident == "doc_error" {
                let tokens = attr.meta.to_token_stream().to_string();
                let pairs = extract_all_kvs(&tokens);
                if !pairs.is_empty() {
                    return Some(pairs);
                }
            }
        }
    }
    None
}

/// Extract key-value pairs from `#[doc_event(channel = "orders", ...)`.
///
/// @docspec:deterministic
fn extract_doc_event_attrs(attrs: &[syn::Attribute]) -> Option<Vec<(String, String)>> {
    for attr in attrs {
        if let Some(ident) = attr.path().get_ident() {
            if ident == "doc_event" {
                let tokens = attr.meta.to_token_stream().to_string();
                let pairs = extract_all_kvs(&tokens);
                if !pairs.is_empty() {
                    return Some(pairs);
                }
            }
        }
    }
    None
}

/// Extract all `key = "value"` pairs from a token string.
///
/// @docspec:deterministic
fn extract_all_kvs(tokens: &str) -> Vec<(String, String)> {
    let mut pairs = Vec::new();
    // Find content inside outermost parentheses
    let inner = if let Some(start) = tokens.find('(') {
        if let Some(end) = tokens.rfind(')') {
            &tokens[start + 1..end]
        } else {
            return pairs;
        }
    } else {
        return pairs;
    };

    // Split by comma and parse each key = "value"
    for part in inner.split(',') {
        let part = part.trim();
        if let Some(eq_pos) = part.find('=') {
            let key = part[..eq_pos].trim().to_string();
            let val = part[eq_pos + 1..].trim();
            // Strip surrounding quotes
            let val = val.trim_matches('"').to_string();
            if !key.is_empty() && !val.is_empty() {
                pairs.push((key, val));
            }
        }
    }
    pairs
}
