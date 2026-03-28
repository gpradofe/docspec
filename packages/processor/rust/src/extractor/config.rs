//! Detect configuration patterns in Rust projects.
//!
//! @docspec:module {
//!   id: "docspec-rust-extractor-config",
//!   name: "Configuration Extractor",
//!   description: "Detects configuration patterns including config/dotenv/clap crates, Deserialize-derived settings structs, and env::var calls to extract configuration properties.",
//!   since: "3.0.0"
//! }
//!
//! Looks for:
//! - `config` crate usage (Config::builder, Settings structs)
//! - `dotenv` / `dotenvy` usage
//! - `std::env::var` calls for environment variable access
//! - `#[serde(default)]` on config structs
//! - `clap` derive structs for CLI configuration

use serde_json::Value;
use quote::ToTokens;
use crate::scanner::FileInfo;
use super::{DocSpecExtractor, ProcessorContext};

/// Patterns in source text that indicate environment variable reads.
const ENV_VAR_PATTERNS: &[&str] = &[
    "std::env::var",
    "env::var",
    "env::var_os",
    "dotenv",
    "dotenvy",
    "from_env",
];

/// Derive macros that indicate a configuration struct.
const CONFIG_DERIVES: &[&str] = &[
    "Deserialize",
    "Parser",   // clap
    "Args",     // clap
    "Subcommand",
];

/// @docspec:boundary "Configuration property extraction from Rust source patterns and derive macros"
pub struct ConfigExtractor;

impl DocSpecExtractor for ConfigExtractor {
    /// @docspec:intentional "Check if any configuration crate (config, dotenv, clap, figment, envy) is in Cargo.toml"
    fn is_available(&self, ctx: &ProcessorContext) -> bool {
        ctx.has_dependency("config")
            || ctx.has_dependency("dotenv")
            || ctx.has_dependency("dotenvy")
            || ctx.has_dependency("clap")
            || ctx.has_dependency("figment")
            || ctx.has_dependency("envy")
    }

    /// @docspec:deterministic
    fn extractor_name(&self) -> &'static str {
        "configuration"
    }

    /// @docspec:intentional "Extract config properties from Deserialize/clap structs and env::var calls in function bodies"
    fn extract(&self, files: &[FileInfo], ctx: &mut ProcessorContext) {
        let mut properties: Vec<Value> = Vec::new();

        for file_info in files {
            let syntax = match syn::parse_file(&file_info.source) {
                Ok(s) => s,
                Err(_) => continue,
            };

            for item in &syntax.items {
                // Detect config structs with Deserialize derive
                if let syn::Item::Struct(s) = item {
                    if is_config_struct(&s.attrs) {
                        let struct_name = s.ident.to_string();
                        let prefix = camel_to_kebab(&struct_name)
                            .trim_end_matches("-config")
                            .trim_end_matches("-settings")
                            .to_string();

                        for field in &s.fields {
                            if let Some(ident) = &field.ident {
                                let field_name = ident.to_string();
                                let key = if prefix.is_empty() {
                                    field_name.clone()
                                } else {
                                    format!("{}.{}", prefix, field_name)
                                };

                                let ty = {
                                    let field_ty = &field.ty;
                                    quote::quote!(#field_ty).to_string()
                                };
                                let default_value = extract_serde_default(&field.attrs);

                                let mut prop = serde_json::json!({
                                    "key": key,
                                    "type": simplify_type(&ty),
                                    "source": "@ConfigStruct",
                                    "usedBy": [format!("{}::{}", file_info.module, struct_name)],
                                });
                                if let Some(def) = default_value {
                                    prop.as_object_mut().unwrap()
                                        .insert("defaultValue".to_string(), Value::String(def));
                                }
                                properties.push(prop);
                            }
                        }
                    }
                }

                // Detect env::var calls in function bodies
                if let syn::Item::Fn(func) = item {
                    let func_block = &func.block;
                    let body = quote::quote!(#func_block).to_string();
                    extract_env_vars(&body, &file_info.module, &func.sig.ident.to_string(), &mut properties);
                }

                if let syn::Item::Impl(imp) = item {
                    for impl_item in &imp.items {
                        if let syn::ImplItem::Fn(method) = impl_item {
                            let method_block = &method.block;
                            let body = quote::quote!(#method_block).to_string();
                            let owner = if let syn::Type::Path(tp) = imp.self_ty.as_ref() {
                                tp.path.segments.last()
                                    .map(|s| s.ident.to_string())
                                    .unwrap_or_default()
                            } else {
                                String::new()
                            };
                            let qualified = format!("{}::{}#{}", file_info.module, owner, method.sig.ident);
                            extract_env_vars(&body, &qualified, &method.sig.ident.to_string(), &mut properties);
                        }
                    }
                }
            }
        }

        if !properties.is_empty() {
            ctx.configuration = properties;
        }
    }
}

/// Check if a struct has derives that mark it as a configuration type.
///
/// @docspec:deterministic
fn is_config_struct(attrs: &[syn::Attribute]) -> bool {
    for attr in attrs {
        if attr.path().is_ident("derive") {
            let tokens = attr.meta.to_token_stream().to_string();
            for derive in CONFIG_DERIVES {
                if tokens.contains(derive) {
                    return true;
                }
            }
        }
    }
    false
}

/// Extract `#[serde(default = "...")]` or `#[serde(default)]` from field attrs.
///
/// @docspec:deterministic
fn extract_serde_default(attrs: &[syn::Attribute]) -> Option<String> {
    for attr in attrs {
        if attr.path().is_ident("serde") {
            let tokens = attr.meta.to_token_stream().to_string();
            if tokens.contains("default") {
                // Try to extract the default function name
                if let Some(start) = tokens.find("default = \"") {
                    let rest = &tokens[start + 11..];
                    if let Some(end) = rest.find('"') {
                        return Some(rest[..end].to_string());
                    }
                }
                return Some("(default)".to_string());
            }
        }
    }
    None
}

/// Scan function body text for `env::var("KEY")` patterns and record them.
///
/// @docspec:intentional "Scan function body for env::var calls and extract environment variable keys"
fn extract_env_vars(body: &str, module: &str, fn_name: &str, properties: &mut Vec<Value>) {
    // Simple regex-free scan: find env::var("...") or env::var_os("...")
    for pattern in ENV_VAR_PATTERNS {
        let mut search_from = 0;
        while let Some(pos) = body[search_from..].find(pattern) {
            let abs_pos = search_from + pos + pattern.len();
            // Look for the opening paren and quoted string
            if let Some(key) = extract_quoted_after(&body[abs_pos..]) {
                let already_exists = properties.iter().any(|p| {
                    p.get("key").and_then(|k| k.as_str()) == Some(&key)
                });
                if !already_exists {
                    properties.push(serde_json::json!({
                        "key": key,
                        "type": "String",
                        "source": "env::var",
                        "usedBy": [format!("{}::{}", module, fn_name)],
                    }));
                }
            }
            search_from = abs_pos;
        }
    }
}

/// Extract a quoted string that follows immediately after some whitespace and `(`.
///
/// @docspec:deterministic
fn extract_quoted_after(s: &str) -> Option<String> {
    let trimmed = s.trim_start();
    if !trimmed.starts_with('(') {
        return None;
    }
    let inner = &trimmed[1..];
    // Find first quote
    let start = inner.find('"')?;
    let rest = &inner[start + 1..];
    let end = rest.find('"')?;
    let key = &rest[..end];
    if key.is_empty() {
        return None;
    }
    Some(key.to_string())
}

/// Convert CamelCase to kebab-case.
///
/// @docspec:deterministic
fn camel_to_kebab(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('-');
        }
        result.push(c.to_lowercase().next().unwrap_or(c));
    }
    result
}

/// Simplify Rust type strings for display.
///
/// @docspec:deterministic
fn simplify_type(ty: &str) -> String {
    ty.replace("std :: string :: ", "")
        .replace("std :: ", "")
        .replace(":: ", "::")
        .replace(" :: ", "::")
        .trim()
        .to_string()
}
