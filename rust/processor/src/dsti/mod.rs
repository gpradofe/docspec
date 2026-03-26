//! DSTI (Deep Structural & Textual Intent) analysis engine.
//!
//! @docspec:module {
//!   id: "docspec-rust-dsti",
//!   name: "DSTI Module",
//!   description: "Contains the 13-channel intent signal extractor, naming analyzer, and weighted density calculator for semantic analysis of Rust source code.",
//!   since: "3.0.0"
//! }

pub mod intent_extractor;
pub mod naming_analyzer;
pub mod intent_density_calculator;
