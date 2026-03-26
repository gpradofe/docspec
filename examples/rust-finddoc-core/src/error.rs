//! Error types for FindDoc.

use thiserror::Error;
use docspec_macros::doc_error;

/// Result type alias for FindDoc operations.
pub type Result<T> = std::result::Result<T, FindDocError>;

/// Errors that can occur during document processing.
#[doc_error(code = "FINDDOC_ERR", description = "FindDoc processing error")]
#[derive(Debug, Error)]
pub enum FindDocError {
    /// Document is empty (no sections).
    #[error("Document '{0}' is empty -- cannot process")]
    EmptyDocument(String),

    /// Parse error in markdown input.
    #[error("Parse error: {0}")]
    ParseError(String),

    /// Serialization error.
    #[error("Serialization error: {0}")]
    SerializationError(String),

    /// I/O error.
    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    /// Invalid state transition.
    #[error("Invalid transition: {0}")]
    InvalidTransition(String),
}
