//! FindDoc Core -- document processing and rendering engine.

use docspec_macros::doc_module;

pub mod document;
pub mod error;
pub mod parser;
pub mod renderer;

pub use document::{Document, DocumentMetadata, Section};
pub use error::{FindDocError, Result};
pub use parser::Parser;
pub use renderer::Renderer;

#[doc_module(name = "finddoc-core", description = "Core document processing library")]
pub struct FindDocCore;
