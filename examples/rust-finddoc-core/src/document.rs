//! Document model and types.

use serde::{Deserialize, Serialize};
use docspec_macros::{
    doc_module, doc_field, doc_method, doc_flow,
    doc_invariant, doc_monotonic, doc_state_machine,
};

/// A structured document with metadata and sections.
#[doc_module(name = "Document", description = "Document model and types")]
#[doc_invariant(rules = "sections SIZE > 0, title NOT_BLANK")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    /// Unique document identifier.
    #[doc_field(description = "Primary key, auto-generated")]
    pub id: String,

    /// Document title.
    #[doc_field(description = "Document title, must not be blank")]
    pub title: String,

    /// Document metadata.
    pub metadata: DocumentMetadata,

    /// Ordered list of sections.
    #[doc_monotonic(field = "len", direction = "increasing")]
    pub sections: Vec<Section>,

    /// Document status.
    #[doc_state_machine(states = "draft, review, published, archived")]
    pub status: DocumentStatus,
}

/// Document metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    /// Author name.
    pub author: String,

    /// Creation timestamp (ISO 8601).
    pub created_at: String,

    /// Last modification timestamp.
    pub updated_at: String,

    /// Document tags for categorization.
    pub tags: Vec<String>,

    /// Document language (ISO 639-1).
    pub language: String,

    /// Word count.
    #[doc_monotonic(field = "word_count", direction = "increasing")]
    pub word_count: usize,
}

/// A section within a document.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Section {
    /// Section heading.
    pub heading: String,

    /// Section content (markdown).
    pub content: String,

    /// Nesting level (0 = top-level).
    pub level: u8,

    /// Subsections.
    pub children: Vec<Section>,
}

/// Document lifecycle status.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DocumentStatus {
    Draft,
    Review,
    Published,
    Archived,
}

impl Document {
    /// Create a new document with the given title and author.
    #[doc_method(description = "Creates a new empty document")]
    #[doc_flow(id = "document-creation", name = "document-creation")]
    pub fn new(title: String, author: String) -> Self {
        let now = chrono_now();
        Self {
            id: uuid_v4(),
            title,
            metadata: DocumentMetadata {
                author,
                created_at: now.clone(),
                updated_at: now,
                tags: Vec::new(),
                language: "en".to_string(),
                word_count: 0,
            },
            sections: Vec::new(),
            status: DocumentStatus::Draft,
        }
    }

    /// Add a section to the document.
    #[doc_method(description = "Appends a section to the document")]
    #[doc_monotonic(field = "sections.len", direction = "increasing")]
    pub fn add_section(&mut self, heading: String, content: String, level: u8) {
        self.sections.push(Section {
            heading,
            content: content.clone(),
            level,
            children: Vec::new(),
        });
        self.metadata.word_count += content.split_whitespace().count();
        self.metadata.updated_at = chrono_now();
    }

    /// Transition the document to a new status.
    #[doc_method(description = "Transitions document to a new lifecycle state")]
    #[doc_state_machine(
        states = "draft, review, published, archived",
        transitions = "draft -> review, review -> published, review -> draft, published -> archived"
    )]
    pub fn transition(&mut self, new_status: DocumentStatus) -> Result<(), String> {
        let valid = matches!(
            (self.status, new_status),
            (DocumentStatus::Draft, DocumentStatus::Review)
                | (DocumentStatus::Review, DocumentStatus::Published)
                | (DocumentStatus::Review, DocumentStatus::Draft)
                | (DocumentStatus::Published, DocumentStatus::Archived)
        );

        if valid {
            self.status = new_status;
            self.metadata.updated_at = chrono_now();
            Ok(())
        } else {
            Err(format!(
                "Invalid transition from {:?} to {:?}",
                self.status, new_status
            ))
        }
    }

    /// Get total word count across all sections.
    pub fn word_count(&self) -> usize {
        self.metadata.word_count
    }
}

fn chrono_now() -> String {
    // Simplified -- in production, use chrono crate
    "2026-01-01T00:00:00Z".to_string()
}

fn uuid_v4() -> String {
    // Simplified -- in production, use uuid crate
    format!("doc-{}", rand_id())
}

fn rand_id() -> u64 {
    // Simplified random
    42
}
