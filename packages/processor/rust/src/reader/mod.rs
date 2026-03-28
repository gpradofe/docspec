//! Source code readers for extracting documentation metadata from Rust AST.
//!
//! @docspec:module {
//!   id: "docspec-rust-reader",
//!   name: "Reader Module",
//!   description: "Contains readers for doc comments, docspec attributes, and a description inferrer that generates human-readable descriptions from snake_case identifiers.",
//!   since: "3.0.0"
//! }

pub mod attr_reader;
pub mod doc_comment_reader;
pub mod description_inferrer;
