//! Coverage calculator that walks the generated DocSpec JSON model
//! and computes documentation completeness metrics.
//!
//! @docspec:module {
//!   id: "docspec-rust-metrics-coverage",
//!   name: "Coverage Calculator",
//!   description: "Walks the generated DocSpec JSON model to compute item-level, method-level, parameter-level, and field-level documentation coverage percentages.",
//!   since: "3.0.0"
//! }
//!
//! Mirrors the Java `CoverageCalculator` from
//! `io.docspec.processor.metrics.CoverageCalculator`.

use serde_json::Value;

/// Accumulated coverage statistics.
///
/// @docspec:boundary "Holds all documentation coverage counters for items, methods, parameters, and fields"
#[derive(Debug, Default)]
pub struct CoverageStats {
    pub total_items: u32,
    pub documented_items: u32,
    pub auto_discovered_items: u32,
    pub annotated_items: u32,
    pub inferred_descriptions: u32,
    pub total_methods: u32,
    pub documented_methods: u32,
    pub total_params: u32,
    pub documented_params: u32,
    pub total_fields: u32,
    pub documented_fields: u32,
}

impl CoverageStats {
    /// Overall documentation coverage percentage (0.0 - 100.0).
    ///
    /// @docspec:deterministic
    /// @docspec:invariant { rules: ["result >= 0.0", "result <= 100.0"] }
    pub fn coverage_percent(&self) -> f64 {
        if self.total_items == 0 {
            return 0.0;
        }
        ((self.documented_items as f64 / self.total_items as f64) * 1000.0).round() / 10.0
    }

    /// Method-level documentation coverage percentage (0.0 - 100.0).
    ///
    /// @docspec:deterministic
    /// @docspec:invariant { rules: ["result >= 0.0", "result <= 100.0"] }
    pub fn method_coverage_percent(&self) -> f64 {
        if self.total_methods == 0 {
            return 0.0;
        }
        ((self.documented_methods as f64 / self.total_methods as f64) * 1000.0).round() / 10.0
    }

    /// Parameter-level documentation coverage percentage (0.0 - 100.0).
    ///
    /// @docspec:deterministic
    /// @docspec:invariant { rules: ["result >= 0.0", "result <= 100.0"] }
    pub fn param_coverage_percent(&self) -> f64 {
        if self.total_params == 0 {
            return 0.0;
        }
        ((self.documented_params as f64 / self.total_params as f64) * 1000.0).round() / 10.0
    }
}

/// Analyze a DocSpec JSON model and compute coverage statistics.
///
/// @docspec:deterministic
/// @docspec:intentional "Walks all modules, members, fields, methods, and parameters to count documented vs total items"
pub fn analyze(spec: &Value) -> CoverageStats {
    let mut stats = CoverageStats::default();

    if let Some(modules) = spec.get("modules").and_then(|m| m.as_array()) {
        for module in modules {
            if let Some(members) = module.get("members").and_then(|m| m.as_array()) {
                for member in members {
                    stats.total_items += 1;

                    // Check if member has a non-empty description
                    let has_description = member.get("description")
                        .and_then(|d| d.as_str())
                        .map(|d| !d.trim().is_empty())
                        .unwrap_or(false);

                    if has_description {
                        stats.documented_items += 1;
                    }

                    // Check discovery source
                    match member.get("discoveredFrom").and_then(|d| d.as_str()) {
                        Some("annotation") => stats.annotated_items += 1,
                        Some("auto") | Some("framework") => stats.auto_discovered_items += 1,
                        _ => {}
                    }

                    // Count fields
                    if let Some(fields) = member.get("fields").and_then(|f| f.as_array()) {
                        for field in fields {
                            stats.total_fields += 1;
                            if field.get("description")
                                .and_then(|d| d.as_str())
                                .map(|d| !d.trim().is_empty())
                                .unwrap_or(false)
                            {
                                stats.documented_fields += 1;
                            }
                        }
                    }

                    // Count methods (if the member itself represents methods, they're top-level)
                    if let Some(methods) = member.get("methods").and_then(|m| m.as_array()) {
                        for method in methods {
                            stats.total_methods += 1;
                            if method.get("description")
                                .and_then(|d| d.as_str())
                                .map(|d| !d.trim().is_empty())
                                .unwrap_or(false)
                            {
                                stats.documented_methods += 1;
                            }

                            // Count parameters
                            if let Some(params) = method.get("params").and_then(|p| p.as_array()) {
                                for param in params {
                                    stats.total_params += 1;
                                    if param.get("description")
                                        .and_then(|d| d.as_str())
                                        .map(|d| !d.trim().is_empty())
                                        .unwrap_or(false)
                                    {
                                        stats.documented_params += 1;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    stats
}

/// Convert coverage stats into the `discovery` JSON object for the final spec.
///
/// @docspec:deterministic
/// @docspec:intentional "Serializes coverage statistics into the JSON discovery model consumed by the DocSpec site"
pub fn to_discovery_model(
    stats: &CoverageStats,
    mode: &str,
    frameworks: &[String],
    scanned_packages: &[String],
    excluded_packages: &[String],
) -> Value {
    serde_json::json!({
        "mode": mode,
        "frameworks": frameworks,
        "scannedPackages": scanned_packages,
        "excludedPackages": excluded_packages,
        "totalClasses": stats.total_items,
        "documentedClasses": stats.documented_items,
        "autoDiscoveredClasses": stats.auto_discovered_items,
        "annotatedClasses": stats.annotated_items,
        "inferredDescriptions": stats.inferred_descriptions,
        "totalMethods": stats.total_methods,
        "documentedMethods": stats.documented_methods,
        "totalParams": stats.total_params,
        "documentedParams": stats.documented_params,
        "coveragePercent": stats.coverage_percent(),
    })
}

/// Increment the inferred-descriptions counter (called by the processor when
/// `description_inferrer` generates a description).
pub fn increment_inferred(stats: &mut CoverageStats) {
    stats.inferred_descriptions += 1;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_spec_has_zero_coverage() {
        let spec = serde_json::json!({ "modules": [] });
        let stats = analyze(&spec);
        assert_eq!(stats.total_items, 0);
        assert!((stats.coverage_percent() - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn documented_items_counted_correctly() {
        let spec = serde_json::json!({
            "modules": [{
                "id": "test",
                "members": [
                    { "kind": "struct", "name": "A", "description": "Has docs" },
                    { "kind": "struct", "name": "B", "description": "" },
                    { "kind": "struct", "name": "C" },
                ]
            }]
        });
        let stats = analyze(&spec);
        assert_eq!(stats.total_items, 3);
        assert_eq!(stats.documented_items, 1);
        assert!((stats.coverage_percent() - 33.3).abs() < 0.1);
    }

    #[test]
    fn coverage_never_exceeds_100() {
        let spec = serde_json::json!({
            "modules": [{
                "id": "test",
                "members": [
                    { "kind": "struct", "name": "A", "description": "Documented" },
                ]
            }]
        });
        let stats = analyze(&spec);
        assert!(stats.coverage_percent() <= 100.0);
    }
}
