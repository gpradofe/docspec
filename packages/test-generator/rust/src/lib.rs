//! DSTI test generator for Rust projects.
//!
//! @docspec:module {
//!   id: "docspec-rust-dsti-generator",
//!   name: "DSTI Test Generator",
//!   description: "Generates Rust test files from DSTI intent graph signals, producing guard clause tests and property-based tests (proptest) based on inferred method semantics.",
//!   since: "3.0.0"
//! }

pub mod generator;
pub mod templates;
