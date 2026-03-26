//! Detect external HTTP/gRPC dependency patterns in Rust projects.
//!
//! @docspec:module {
//!   id: "docspec-rust-extractor-external-dep",
//!   name: "External Dependency Extractor",
//!   description: "Detects HTTP clients (reqwest, hyper, surf) and gRPC clients (tonic) to extract external service dependencies with URL, method, and endpoint metadata.",
//!   since: "3.0.0"
//! }
//!
//! Looks for:
//! - `reqwest` crate: `Client::new()`, `reqwest::get()`, `Client::get/post/put/delete`
//! - `hyper` client usage
//! - `tonic` gRPC client stubs
//! - `surf` HTTP client
//! - URL string literals that look like external service calls

use serde_json::Value;
use crate::scanner::FileInfo;
use super::{DocSpecExtractor, ProcessorContext};

/// Patterns indicating HTTP client usage.
const HTTP_CLIENT_PATTERNS: &[&str] = &[
    "reqwest::Client",
    "reqwest::get",
    "Client::new()",
    "Client::builder()",
    "hyper::Client",
    "surf::get",
    "surf::post",
    "surf::Client",
];

/// Patterns indicating gRPC client usage (tonic).
const GRPC_CLIENT_PATTERNS: &[&str] = &[
    "tonic::transport::Channel",
    "ServiceClient",
    "connect(",
];

/// @docspec:boundary "External HTTP and gRPC dependency detection from client library usage patterns"
pub struct ExternalDependencyExtractor;

impl DocSpecExtractor for ExternalDependencyExtractor {
    /// @docspec:intentional "Check if any HTTP/gRPC client crate (reqwest, hyper, tonic, surf) is in Cargo.toml"
    fn is_available(&self, ctx: &ProcessorContext) -> bool {
        ctx.has_dependency("reqwest")
            || ctx.has_dependency("hyper")
            || ctx.has_dependency("tonic")
            || ctx.has_dependency("surf")
    }

    /// @docspec:deterministic
    fn extractor_name(&self) -> &'static str {
        "external-dependency"
    }

    /// @docspec:intentional "Detect HTTP and gRPC client usage patterns and extract URL, method, and service metadata"
    fn extract(&self, files: &[FileInfo], ctx: &mut ProcessorContext) {
        let mut dependencies: Vec<Value> = Vec::new();

        for file_info in files {
            let syntax = match syn::parse_file(&file_info.source) {
                Ok(s) => s,
                Err(_) => continue,
            };

            for item in &syntax.items {
                let source = quote::quote!(#item).to_string();

                // Detect HTTP clients
                let has_http_client = HTTP_CLIENT_PATTERNS.iter().any(|p| source.contains(p));
                if has_http_client {
                    let owner = item_name(item, &file_info.module);
                    let urls = extract_url_literals(&source);
                    let methods = extract_http_methods(&source);

                    if urls.is_empty() {
                        // Generic HTTP client detected but no specific URL
                        let dep_name = format!("http-via-{}", owner.split("::").last().unwrap_or(&owner));
                        if !dep_exists(&dependencies, &dep_name) {
                            dependencies.push(serde_json::json!({
                                "name": dep_name,
                                "baseUrl": "(detected from HTTP client field)",
                            }));
                        }
                    } else {
                        for url in &urls {
                            let base_url = extract_base_url(url);
                            let dep_name = url_to_service_name(&base_url);
                            if !dep_exists(&dependencies, &dep_name) {
                                let mut endpoints: Vec<Value> = Vec::new();
                                for method in &methods {
                                    endpoints.push(serde_json::json!({
                                        "method": method,
                                        "path": extract_path_from_url(url),
                                        "usedBy": [owner.clone()],
                                    }));
                                }
                                let mut dep = serde_json::json!({
                                    "name": dep_name,
                                    "baseUrl": base_url,
                                });
                                if !endpoints.is_empty() {
                                    dep.as_object_mut().unwrap()
                                        .insert("endpoints".to_string(), Value::Array(endpoints));
                                }
                                dependencies.push(dep);
                            }
                        }
                    }
                }

                // Detect gRPC clients
                let has_grpc_client = GRPC_CLIENT_PATTERNS.iter().any(|p| source.contains(p));
                if has_grpc_client {
                    let owner = item_name(item, &file_info.module);
                    let urls = extract_url_literals(&source);
                    let base_url = urls.first().cloned()
                        .unwrap_or_else(|| "(detected from gRPC channel)".to_string());

                    // Try to extract service name from tonic-generated client types
                    let service_name = extract_grpc_service_name(&source)
                        .unwrap_or_else(|| format!("grpc-via-{}", owner.split("::").last().unwrap_or(&owner)));

                    if !dep_exists(&dependencies, &service_name) {
                        dependencies.push(serde_json::json!({
                            "name": service_name,
                            "baseUrl": base_url,
                            "protocol": "gRPC",
                            "usedBy": [owner],
                        }));
                    }
                }
            }
        }

        if !dependencies.is_empty() {
            ctx.external_dependencies = dependencies;
        }
    }
}

/// Get a qualified name for an item.
///
/// @docspec:deterministic
fn item_name(item: &syn::Item, module: &str) -> String {
    match item {
        syn::Item::Fn(f) => format!("{}::{}", module, f.sig.ident),
        syn::Item::Struct(s) => format!("{}::{}", module, s.ident),
        syn::Item::Impl(imp) => {
            if let syn::Type::Path(tp) = imp.self_ty.as_ref() {
                let name = tp.path.segments.last()
                    .map(|s| s.ident.to_string())
                    .unwrap_or_default();
                format!("{}::{}", module, name)
            } else {
                module.to_string()
            }
        }
        _ => module.to_string(),
    }
}

/// Extract URL-like string literals from source text.
///
/// @docspec:deterministic
fn extract_url_literals(source: &str) -> Vec<String> {
    let mut urls = Vec::new();
    let prefixes = ["http://", "https://", "grpc://"];

    for prefix in &prefixes {
        let mut search_from = 0;
        while let Some(pos) = source[search_from..].find(prefix) {
            let abs_pos = search_from + pos;
            // Find the end of the URL (next quote, whitespace, or closing paren)
            let url_start = abs_pos;
            let rest = &source[url_start..];
            let end = rest.find(|c: char| c == '"' || c == '\'' || c == ')' || c == ' ' || c == ',')
                .unwrap_or(rest.len());
            let url = rest[..end].to_string();
            if url.len() > prefix.len() {
                urls.push(url);
            }
            search_from = abs_pos + end;
        }
    }

    urls
}

/// Extract HTTP method names from source text.
///
/// @docspec:deterministic
fn extract_http_methods(source: &str) -> Vec<String> {
    let methods_map = [
        (".get(", "GET"),
        (".post(", "POST"),
        (".put(", "PUT"),
        (".delete(", "DELETE"),
        (".patch(", "PATCH"),
        (".head(", "HEAD"),
    ];

    let mut methods = Vec::new();
    for (pattern, method) in &methods_map {
        if source.contains(pattern) && !methods.contains(&method.to_string()) {
            methods.push(method.to_string());
        }
    }
    methods
}

/// Extract the base URL (scheme + host) from a full URL.
///
/// @docspec:deterministic
fn extract_base_url(url: &str) -> String {
    // Find the third slash (after scheme://)
    if let Some(scheme_end) = url.find("://") {
        let rest = &url[scheme_end + 3..];
        if let Some(path_start) = rest.find('/') {
            return url[..scheme_end + 3 + path_start].to_string();
        }
    }
    url.to_string()
}

/// Extract the path portion from a URL.
///
/// @docspec:deterministic
fn extract_path_from_url(url: &str) -> String {
    if let Some(scheme_end) = url.find("://") {
        let rest = &url[scheme_end + 3..];
        if let Some(path_start) = rest.find('/') {
            return rest[path_start..].to_string();
        }
    }
    "/".to_string()
}

/// Convert a base URL to a service name.
///
/// @docspec:deterministic
fn url_to_service_name(base_url: &str) -> String {
    if let Some(scheme_end) = base_url.find("://") {
        let host = &base_url[scheme_end + 3..];
        let host = host.split(':').next().unwrap_or(host);
        let host = host.split('.').next().unwrap_or(host);
        return host.to_string();
    }
    "unknown-service".to_string()
}

/// Try to extract a gRPC service name from tonic client type patterns.
///
/// @docspec:deterministic
fn extract_grpc_service_name(source: &str) -> Option<String> {
    // Look for patterns like `FooServiceClient::` or `FooClient::`
    let client_suffix = "Client::";
    if let Some(pos) = source.find(client_suffix) {
        // Walk backward to find the start of the identifier
        let before = &source[..pos];
        let start = before.rfind(|c: char| !c.is_alphanumeric() && c != '_')
            .map(|p| p + 1)
            .unwrap_or(0);
        let name = &source[start..pos];
        if !name.is_empty() && name != "reqwest" && name != "hyper" && name != "surf" {
            return Some(name.to_string());
        }
    }
    None
}

/// Check if a dependency with the given name already exists.
///
/// @docspec:deterministic
fn dep_exists(deps: &[Value], name: &str) -> bool {
    deps.iter().any(|d| d.get("name").and_then(|n| n.as_str()) == Some(name))
}
