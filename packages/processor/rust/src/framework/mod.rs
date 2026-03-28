//! Framework detection modules for Rust web/ORM/serialization ecosystems.
//!
//! @docspec:module {
//!   id: "docspec-rust-framework",
//!   name: "Framework Detectors",
//!   description: "Contains lightweight Cargo.toml-based detectors for Axum, Diesel, and Serde frameworks used to enrich the DocSpec artifact metadata.",
//!   since: "3.0.0"
//! }

pub mod axum_detector;
pub mod diesel_detector;
pub mod serde_detector;
