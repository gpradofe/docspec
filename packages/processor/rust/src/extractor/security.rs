//! Detect security patterns in Rust web frameworks.
//!
//! @docspec:module {
//!   id: "docspec-rust-extractor-security",
//!   name: "Security Extractor",
//!   description: "Detects authentication and authorization patterns from actix-web-grants, tower-http, and custom doc_role attributes to extract roles and endpoint security rules.",
//!   since: "3.0.0"
//! }
//!
//! Looks for:
//! - actix-web guards and auth middleware (`HttpAuthentication`, `web::guard`)
//! - `#[authorize]` / `#[has_role]` / `#[has_permission]` attributes (actix-web-grants)
//! - tower-http auth layers, axum extractors with auth patterns
//! - Custom `#[doc_role]` attributes

use serde_json::Value;
use quote::ToTokens;
use crate::scanner::FileInfo;
use super::{DocSpecExtractor, ProcessorContext};

/// Attribute names that indicate security constraints on handlers.
const SECURITY_ATTRS: &[&str] = &[
    "authorize",
    "has_role",
    "has_permission",
    "has_any_role",
    "has_any_permission",
    "doc_role",
    "protect",
];

/// Type names that indicate auth middleware / extractors.
const AUTH_TYPES: &[&str] = &[
    "HttpAuthentication",
    "AuthenticationMiddleware",
    "AuthSession",
    "Identity",
    "Claims",
    "JwtAuth",
    "BearerAuth",
    "BasicAuth",
    "ApiKey",
];

/// @docspec:boundary "Security constraint detection across authorization attributes and auth middleware types"
pub struct SecurityExtractor;

impl DocSpecExtractor for SecurityExtractor {
    /// @docspec:intentional "Check if any security-related crate (actix-web, axum, actix-web-grants, tower-http) is in Cargo.toml"
    fn is_available(&self, ctx: &ProcessorContext) -> bool {
        ctx.has_dependency("actix-web")
            || ctx.has_dependency("axum")
            || ctx.has_dependency("actix-web-grants")
            || ctx.has_dependency("actix-identity")
            || ctx.has_dependency("tower-http")
    }

    /// @docspec:deterministic
    fn extractor_name(&self) -> &'static str {
        "security"
    }

    /// @docspec:intentional "Extract security roles and endpoint rules from authorization attributes and auth middleware types"
    fn extract(&self, files: &[FileInfo], ctx: &mut ProcessorContext) {
        let mut roles: Vec<String> = Vec::new();
        let mut endpoint_rules: Vec<Value> = Vec::new();

        for file_info in files {
            let syntax = match syn::parse_file(&file_info.source) {
                Ok(s) => s,
                Err(_) => continue,
            };

            for item in &syntax.items {
                match item {
                    syn::Item::Fn(func) => {
                        let rules = extract_security_rules(&func.attrs);
                        if !rules.is_empty() {
                            let fn_name = func.sig.ident.to_string();
                            let path = extract_route_path(&func.attrs)
                                .unwrap_or_else(|| format!("/{}", fn_name));
                            for rule in &rules {
                                extract_roles_from_rule(rule, &mut roles);
                            }
                            endpoint_rules.push(serde_json::json!({
                                "path": path,
                                "rules": rules,
                                "public": false,
                            }));
                        }
                    }
                    syn::Item::Impl(imp) => {
                        for impl_item in &imp.items {
                            if let syn::ImplItem::Fn(method) = impl_item {
                                let rules = extract_security_rules(&method.attrs);
                                if !rules.is_empty() {
                                    let method_name = method.sig.ident.to_string();
                                    let path = extract_route_path(&method.attrs)
                                        .unwrap_or_else(|| format!("/{}", method_name));
                                    for rule in &rules {
                                        extract_roles_from_rule(rule, &mut roles);
                                    }
                                    endpoint_rules.push(serde_json::json!({
                                        "path": path,
                                        "rules": rules,
                                        "public": false,
                                    }));
                                }
                            }
                        }
                    }
                    _ => {}
                }

                // Detect auth-related type usage in function signatures
                detect_auth_types(item, &mut roles);
            }
        }

        if endpoint_rules.is_empty() && roles.is_empty() {
            return;
        }

        // Deduplicate roles
        roles.sort();
        roles.dedup();

        ctx.security = Some(serde_json::json!({
            "endpoints": endpoint_rules,
            "roles": roles,
        }));
    }
}

/// Extract security rule strings from attributes like `#[has_role("ADMIN")]`.
///
/// @docspec:deterministic
fn extract_security_rules(attrs: &[syn::Attribute]) -> Vec<String> {
    let mut rules = Vec::new();
    for attr in attrs {
        if let Some(ident) = attr.path().get_ident() {
            let name = ident.to_string();
            if SECURITY_ATTRS.contains(&name.as_str()) {
                let tokens = attr.meta.to_token_stream().to_string();
                rules.push(format!("{}: {}", name, extract_string_args(&tokens)));
            }
        }
    }
    rules
}

/// Extract a route path from `#[get("/path")]`, `#[post("/path")]`, etc.
///
/// @docspec:deterministic
fn extract_route_path(attrs: &[syn::Attribute]) -> Option<String> {
    let route_macros = ["get", "post", "put", "delete", "patch", "head", "route"];
    for attr in attrs {
        if let Some(ident) = attr.path().get_ident() {
            let name = ident.to_string();
            if route_macros.contains(&name.as_str()) {
                let tokens = attr.meta.to_token_stream().to_string();
                if let Some(path) = extract_first_string_literal(&tokens) {
                    return Some(path);
                }
            }
        }
    }
    None
}

/// Extract role names from a rule string (looks for quoted strings).
///
/// @docspec:deterministic
fn extract_roles_from_rule(rule: &str, roles: &mut Vec<String>) {
    let mut chars = rule.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '"' {
            let mut role = String::new();
            for inner in chars.by_ref() {
                if inner == '"' { break; }
                role.push(inner);
            }
            if !role.is_empty() {
                // Strip ROLE_ prefix if present
                let clean = role.strip_prefix("ROLE_").unwrap_or(&role);
                roles.push(clean.to_string());
            }
        }
    }
}

/// Detect auth-related types in function parameters.
///
/// @docspec:intentional "Scans function signatures for auth extractor types to infer authentication requirements"
fn detect_auth_types(item: &syn::Item, roles: &mut Vec<String>) {
    let source = quote::quote!(#item).to_string();
    for auth_type in AUTH_TYPES {
        if source.contains(auth_type) {
            // The presence of auth types implies authentication is required
            if !roles.contains(&"authenticated".to_string()) {
                roles.push("authenticated".to_string());
            }
            break;
        }
    }
}

/// Extract the content inside parentheses from an attribute token string.
///
/// @docspec:deterministic
fn extract_string_args(tokens: &str) -> String {
    if let Some(start) = tokens.find('(') {
        if let Some(end) = tokens.rfind(')') {
            return tokens[start + 1..end].trim().to_string();
        }
    }
    String::new()
}

/// Extract the first string literal from attribute tokens.
///
/// @docspec:deterministic
fn extract_first_string_literal(tokens: &str) -> Option<String> {
    let mut chars = tokens.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '"' {
            let mut s = String::new();
            for inner in chars.by_ref() {
                if inner == '"' { break; }
                s.push(inner);
            }
            if !s.is_empty() {
                return Some(s);
            }
        }
    }
    None
}
