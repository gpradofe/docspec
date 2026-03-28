//! Documentation coverage metrics calculation.
//!
//! @docspec:module {
//!   id: "docspec-rust-metrics",
//!   name: "Metrics Module",
//!   description: "Contains the coverage calculator that walks the generated DocSpec JSON model and computes documentation completeness percentages, mirroring the Java CoverageCalculator.",
//!   since: "3.0.0"
//! }
//!
//! Mirrors the Java `CoverageCalculator` -- walks the generated DocSpec model
//! and computes per-module and overall coverage percentages.

pub mod coverage;
