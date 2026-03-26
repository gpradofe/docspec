//! Detect observability patterns in Rust projects.
//!
//! @docspec:module {
//!   id: "docspec-rust-extractor-observability",
//!   name: "Observability Extractor",
//!   description: "Detects tracing instrumentation, metric registrations (prometheus, metrics crate), and health check endpoints to populate the observability section of the DocSpec model.",
//!   since: "3.0.0"
//! }
//!
//! Looks for:
//! - `tracing` crate usage (`#[instrument]`, `tracing::info!`, span macros)
//! - `metrics` crate (counters, gauges, histograms)
//! - `prometheus` crate metric definitions
//! - `opentelemetry` usage
//! - Health check endpoints (common `/health`, `/healthz`, `/ready` patterns)

use serde_json::Value;
use quote::ToTokens;
use crate::scanner::FileInfo;
use super::{DocSpecExtractor, ProcessorContext};

/// Attribute names that indicate instrumentation / metrics.
const OBSERVABILITY_ATTRS: &[&str] = &[
    "instrument",      // tracing
    "tracing::instrument",
];

/// Metric registration patterns in source code.
const METRIC_PATTERNS: &[(&str, &str)] = &[
    ("counter!", "counter"),
    ("gauge!", "gauge"),
    ("histogram!", "histogram"),
    ("register_counter!", "counter"),
    ("register_gauge!", "gauge"),
    ("register_histogram!", "histogram"),
    ("Counter::new", "counter"),
    ("Gauge::new", "gauge"),
    ("Histogram::new", "histogram"),
    ("IntCounter::new", "counter"),
    ("IntGauge::new", "gauge"),
    ("HistogramVec::new", "histogram"),
];

/// Route paths that indicate health check endpoints.
const HEALTH_PATHS: &[&str] = &[
    "/health",
    "/healthz",
    "/ready",
    "/readiness",
    "/liveness",
    "/status",
    "/actuator/health",
];

/// @docspec:boundary "Observability detection across tracing, metrics, prometheus, and health check patterns"
pub struct ObservabilityExtractor;

impl DocSpecExtractor for ObservabilityExtractor {
    /// @docspec:intentional "Check if any observability crate (tracing, metrics, prometheus, opentelemetry) is in Cargo.toml"
    fn is_available(&self, ctx: &ProcessorContext) -> bool {
        ctx.has_dependency("tracing")
            || ctx.has_dependency("metrics")
            || ctx.has_dependency("prometheus")
            || ctx.has_dependency("opentelemetry")
    }

    /// @docspec:deterministic
    fn extractor_name(&self) -> &'static str {
        "observability"
    }

    /// @docspec:intentional "Extract tracing instrumentation, metric registrations, and health check endpoints from source"
    fn extract(&self, files: &[FileInfo], ctx: &mut ProcessorContext) {
        let mut metrics: Vec<Value> = Vec::new();
        let mut health_checks: Vec<Value> = Vec::new();
        let mut traced_functions: Vec<String> = Vec::new();

        for file_info in files {
            let syntax = match syn::parse_file(&file_info.source) {
                Ok(s) => s,
                Err(_) => continue,
            };

            for item in &syntax.items {
                match item {
                    syn::Item::Fn(func) => {
                        // Check for #[instrument]
                        if has_instrument_attr(&func.attrs) {
                            traced_functions.push(format!(
                                "{}::{}",
                                file_info.module,
                                func.sig.ident
                            ));
                        }

                        // Check for health check route paths
                        if let Some(path) = extract_health_path(&func.attrs) {
                            health_checks.push(serde_json::json!({
                                "path": path,
                                "checks": [func.sig.ident.to_string()],
                            }));
                        }

                        // Scan body for metric registrations
                        let func_block = &func.block;
                        let body = quote::quote!(#func_block).to_string();
                        extract_metrics(&body, &file_info.module, &func.sig.ident.to_string(), &mut metrics);
                    }
                    syn::Item::Impl(imp) => {
                        let owner = if let syn::Type::Path(tp) = imp.self_ty.as_ref() {
                            tp.path.segments.last()
                                .map(|s| s.ident.to_string())
                                .unwrap_or_default()
                        } else {
                            String::new()
                        };

                        for impl_item in &imp.items {
                            if let syn::ImplItem::Fn(method) = impl_item {
                                if has_instrument_attr(&method.attrs) {
                                    traced_functions.push(format!(
                                        "{}::{}#{}",
                                        file_info.module, owner, method.sig.ident
                                    ));
                                }

                                if let Some(path) = extract_health_path(&method.attrs) {
                                    health_checks.push(serde_json::json!({
                                        "path": path,
                                        "checks": [format!("{}::{}", owner, method.sig.ident)],
                                    }));
                                }

                                let method_block = &method.block;
                                let body = quote::quote!(#method_block).to_string();
                                let qualified = format!("{}::{}#{}", file_info.module, owner, method.sig.ident);
                                extract_metrics(&body, &qualified, &method.sig.ident.to_string(), &mut metrics);
                            }
                        }
                    }
                    // Detect static metric definitions (e.g., `static REQUESTS: Lazy<Counter> = ...`)
                    syn::Item::Static(s) => {
                        let static_ty = &s.ty;
                        let ty = quote::quote!(#static_ty).to_string();
                        let name = s.ident.to_string();
                        if let Some(metric_type) = detect_metric_type(&ty) {
                            metrics.push(serde_json::json!({
                                "name": name.to_lowercase().replace('_', "."),
                                "type": metric_type,
                                "emittedBy": [format!("{}::{}", file_info.module, name)],
                            }));
                        }
                    }
                    _ => {}
                }
            }
        }

        if metrics.is_empty() && health_checks.is_empty() && traced_functions.is_empty() {
            return;
        }

        let mut obs = serde_json::json!({});
        let map = obs.as_object_mut().unwrap();

        if !metrics.is_empty() {
            map.insert("metrics".to_string(), Value::Array(metrics));
        }
        if !health_checks.is_empty() {
            map.insert("healthChecks".to_string(), Value::Array(health_checks));
        }
        if !traced_functions.is_empty() {
            map.insert("tracedFunctions".to_string(),
                Value::Array(traced_functions.into_iter().map(Value::String).collect()));
        }

        ctx.observability = Some(obs);
    }
}

/// Check if an attribute list contains `#[instrument]` or `#[tracing::instrument]`.
///
/// @docspec:deterministic
fn has_instrument_attr(attrs: &[syn::Attribute]) -> bool {
    for attr in attrs {
        let path_str = attr.path().to_token_stream().to_string();
        for obs_attr in OBSERVABILITY_ATTRS {
            if path_str.contains(obs_attr) {
                return true;
            }
        }
    }
    false
}

/// Check if any route attribute points to a health check path.
///
/// @docspec:deterministic
fn extract_health_path(attrs: &[syn::Attribute]) -> Option<String> {
    let route_macros = ["get", "post", "route"];
    for attr in attrs {
        if let Some(ident) = attr.path().get_ident() {
            let name = ident.to_string();
            if route_macros.contains(&name.as_str()) {
                let tokens = attr.meta.to_token_stream().to_string();
                for health_path in HEALTH_PATHS {
                    if tokens.contains(health_path) {
                        return Some(health_path.to_string());
                    }
                }
            }
        }
    }
    None
}

/// Scan function body text for metric macro invocations.
///
/// @docspec:intentional "Scan function body for metric macro patterns (counter!, gauge!, histogram!) and extract metric names"
fn extract_metrics(body: &str, module: &str, fn_name: &str, metrics: &mut Vec<Value>) {
    for (pattern, metric_type) in METRIC_PATTERNS {
        if body.contains(pattern) {
            // Try to extract the metric name from the first string argument
            if let Some(pos) = body.find(pattern) {
                let after = &body[pos + pattern.len()..];
                if let Some(name) = extract_first_string(after) {
                    let already_exists = metrics.iter().any(|m| {
                        m.get("name").and_then(|n| n.as_str()) == Some(&name)
                    });
                    if !already_exists {
                        metrics.push(serde_json::json!({
                            "name": name,
                            "type": metric_type,
                            "emittedBy": [format!("{}::{}", module, fn_name)],
                        }));
                    }
                }
            }
        }
    }
}

/// Detect metric type from a static variable's type annotation.
///
/// @docspec:deterministic
fn detect_metric_type(ty: &str) -> Option<&'static str> {
    if ty.contains("Counter") || ty.contains("IntCounter") {
        Some("counter")
    } else if ty.contains("Gauge") || ty.contains("IntGauge") {
        Some("gauge")
    } else if ty.contains("Histogram") {
        Some("histogram")
    } else {
        None
    }
}

/// Extract the first quoted string from text.
///
/// @docspec:deterministic
fn extract_first_string(s: &str) -> Option<String> {
    let start = s.find('"')?;
    let rest = &s[start + 1..];
    let end = rest.find('"')?;
    let value = &rest[..end];
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}
