//! Detect actix-web route definitions and extract endpoint metadata.
//!
//! @docspec:module {
//!   id: "docspec-rust-extractor-actix",
//!   name: "Actix-Web Detector",
//!   description: "Detects actix-web route attributes, handler functions, and parameter extractors (Json, Path, Query, etc.) to populate endpoint metadata in the DocSpec model.",
//!   since: "3.0.0"
//! }
//!
//! Looks for:
//! - Route attribute macros: `#[get("/path")]`, `#[post("/path")]`, etc.
//! - `web::resource("/path").route(...)` patterns in `configure` functions
//! - `HttpRequest`, `HttpResponse`, `Json<T>`, `Path<T>`, `Query<T>` extractors
//! - `ServiceConfig` function signatures (app configuration)

use serde_json::Value;
use quote::ToTokens;
use crate::scanner::FileInfo;
use super::{DocSpecExtractor, ProcessorContext};

/// Actix-web route attribute macros.
const ROUTE_MACROS: &[(&str, &str)] = &[
    ("get", "GET"),
    ("post", "POST"),
    ("put", "PUT"),
    ("delete", "DELETE"),
    ("patch", "PATCH"),
    ("head", "HEAD"),
    ("route", "ANY"),
];

/// Actix-web extractor types.
const EXTRACTOR_TYPES: &[&str] = &[
    "Json",
    "Path",
    "Query",
    "Form",
    "Bytes",
    "Payload",
    "Data",
    "HttpRequest",
];

/// @docspec:boundary "Actix-web framework detection and endpoint extraction"
pub struct ActixDetector;

impl DocSpecExtractor for ActixDetector {
    /// @docspec:deterministic
    fn is_available(&self, ctx: &ProcessorContext) -> bool {
        ctx.has_dependency("actix-web") || ctx.has_dependency("actix_web")
    }

    /// @docspec:deterministic
    fn extractor_name(&self) -> &'static str {
        "actix-detector"
    }

    /// @docspec:intentional "Extract actix-web route endpoints from handler functions and impl methods with route attributes"
    fn extract(&self, files: &[FileInfo], ctx: &mut ProcessorContext) {
        let mut endpoints: Vec<Value> = Vec::new();

        for file_info in files {
            let syntax = match syn::parse_file(&file_info.source) {
                Ok(s) => s,
                Err(_) => continue,
            };

            for item in &syntax.items {
                if let syn::Item::Fn(func) = item {
                    if let Some(endpoint) = extract_endpoint(func, &file_info.module) {
                        endpoints.push(endpoint);
                    }
                }

                if let syn::Item::Impl(imp) = item {
                    let owner = if let syn::Type::Path(tp) = imp.self_ty.as_ref() {
                        tp.path.segments.last()
                            .map(|s| s.ident.to_string())
                            .unwrap_or_default()
                    } else {
                        String::new()
                    };

                    for impl_item in &imp.items {
                        if let syn::ImplItem::Fn(method) = impl_item {
                            if let Some(endpoint) = extract_impl_endpoint(method, &file_info.module, &owner) {
                                endpoints.push(endpoint);
                            }
                        }
                    }
                }
            }
        }

        if !endpoints.is_empty() {
            // Add actix-web to detected frameworks
            if !ctx.frameworks.contains(&"actix-web".to_string()) {
                ctx.frameworks.push("actix-web".to_string());
            }

            // Merge endpoints into any existing modules or create new endpoint data
            // The processor will integrate these into the final spec
            // Store as a special framework detection result
            let existing = ctx.security.take();
            let mut security = existing.unwrap_or_else(|| serde_json::json!({}));
            let sec_map = security.as_object_mut().unwrap();

            // Add detected endpoints as public endpoints (no auth by default)
            let mut public_endpoints: Vec<Value> = endpoints.iter().map(|ep| {
                serde_json::json!({
                    "path": ep.get("path").and_then(|p| p.as_str()).unwrap_or("/"),
                    "method": ep.get("method").and_then(|m| m.as_str()).unwrap_or("GET"),
                    "rules": [],
                    "public": true,
                })
            }).collect();

            if let Some(existing_endpoints) = sec_map.get_mut("endpoints") {
                if let Some(arr) = existing_endpoints.as_array_mut() {
                    arr.append(&mut public_endpoints);
                }
            } else if !public_endpoints.is_empty() {
                sec_map.insert("endpoints".to_string(), Value::Array(public_endpoints));
            }

            ctx.security = Some(security);
        }
    }
}

/// Extract endpoint metadata from a free function with route attributes.
///
/// @docspec:deterministic
/// @docspec:intentional "Parses route macro attributes and parameter types to build endpoint metadata JSON"
fn extract_endpoint(func: &syn::ItemFn, module: &str) -> Option<Value> {
    let (method, path) = extract_route_info(&func.attrs)?;
    let fn_name = func.sig.ident.to_string();
    let qualified = format!("{}::{}", module, fn_name);
    let description = crate::reader::doc_comment_reader::read_doc_comment(&func.attrs);
    let extractors = extract_param_types(&func.sig);

    let mut endpoint = serde_json::json!({
        "path": path,
        "method": method,
        "handler": qualified,
    });

    let map = endpoint.as_object_mut().unwrap();

    if let Some(desc) = description {
        map.insert("description".to_string(), Value::String(desc));
    }
    if !extractors.is_empty() {
        map.insert("parameters".to_string(), Value::Array(
            extractors.into_iter().map(|e| serde_json::json!({
                "source": e.source,
                "type": e.type_name,
            })).collect()
        ));
    }

    Some(endpoint)
}

/// Extract endpoint metadata from an impl method with route attributes.
///
/// @docspec:deterministic
fn extract_impl_endpoint(method: &syn::ImplItemFn, module: &str, owner: &str) -> Option<Value> {
    let (http_method, path) = extract_route_info(&method.attrs)?;
    let method_name = method.sig.ident.to_string();
    let qualified = format!("{}::{}#{}", module, owner, method_name);
    let description = crate::reader::doc_comment_reader::read_doc_comment(&method.attrs);
    let extractors = extract_param_types(&method.sig);

    let mut endpoint = serde_json::json!({
        "path": path,
        "method": http_method,
        "handler": qualified,
    });

    let map = endpoint.as_object_mut().unwrap();

    if let Some(desc) = description {
        map.insert("description".to_string(), Value::String(desc));
    }
    if !extractors.is_empty() {
        map.insert("parameters".to_string(), Value::Array(
            extractors.into_iter().map(|e| serde_json::json!({
                "source": e.source,
                "type": e.type_name,
            })).collect()
        ));
    }

    Some(endpoint)
}

/// Extract HTTP method and path from route attributes.
///
/// @docspec:deterministic
fn extract_route_info(attrs: &[syn::Attribute]) -> Option<(String, String)> {
    for attr in attrs {
        if let Some(ident) = attr.path().get_ident() {
            let attr_name = ident.to_string();
            for (macro_name, http_method) in ROUTE_MACROS {
                if attr_name == *macro_name {
                    let tokens = attr.meta.to_token_stream().to_string();
                    let path = extract_first_string_literal(&tokens)
                        .unwrap_or_else(|| "/".to_string());
                    return Some((http_method.to_string(), path));
                }
            }
        }
    }
    None
}

/// Extract parameter types from function signature, identifying actix-web extractors.
///
/// @docspec:deterministic
/// @docspec:intentional "Maps function parameters to actix-web extractor sources (body, path, query, form, state)"
fn extract_param_types(sig: &syn::Signature) -> Vec<ParamInfo> {
    let mut params = Vec::new();

    for input in &sig.inputs {
        if let syn::FnArg::Typed(pat_type) = input {
            let param_ty = &pat_type.ty;
            let ty = quote::quote!(#param_ty).to_string();
            for extractor in EXTRACTOR_TYPES {
                if ty.contains(extractor) {
                    let source = match *extractor {
                        "Json" => "body",
                        "Path" => "path",
                        "Query" => "query",
                        "Form" => "form",
                        "Data" => "state",
                        "HttpRequest" => "request",
                        _ => "other",
                    };
                    // Extract the inner type from Type<Inner>
                    let inner_type = extract_generic_inner(&ty).unwrap_or_else(|| ty.clone());
                    params.push(ParamInfo {
                        source: source.to_string(),
                        type_name: inner_type,
                    });
                    break;
                }
            }
        }
    }

    params
}

struct ParamInfo {
    source: String,
    type_name: String,
}

/// Extract the first string literal from attribute tokens.
///
/// @docspec:deterministic
fn extract_first_string_literal(tokens: &str) -> Option<String> {
    let start = tokens.find('"')?;
    let rest = &tokens[start + 1..];
    let end = rest.find('"')?;
    let value = &rest[..end];
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

/// Extract the inner type from a generic like `Json<MyType>`.
///
/// @docspec:deterministic
fn extract_generic_inner(ty: &str) -> Option<String> {
    let start = ty.find('<')?;
    let end = ty.rfind('>')?;
    if start < end {
        let inner = ty[start + 1..end].trim().to_string();
        Some(inner)
    } else {
        None
    }
}
