//! Document parser -- parses markdown into structured documents.

use crate::document::{Document, Section};
use crate::error::{FindDocError, Result};
use docspec_macros::{doc_module, doc_context, doc_method, doc_flow, doc_error, doc_invariant};

/// Parses markdown text into a structured Document.
#[doc_module(name = "parser", description = "Markdown-to-Document parser")]
#[doc_context(id = "parsing", name = "parsing")]
pub struct Parser {
    strict_mode: bool,
}

impl Parser {
    /// Create a new parser.
    #[doc_method(description = "Creates a markdown parser")]
    pub fn new() -> Self {
        Self { strict_mode: false }
    }

    /// Enable strict mode (reject malformed input).
    pub fn strict(mut self) -> Self {
        self.strict_mode = true;
        self
    }

    /// Parse markdown text into a Document.
    #[doc_method(description = "Parses markdown text into a structured Document")]
    #[doc_flow(id = "document-parsing", name = "document-parsing")]
    #[doc_error(code = "PARSE_001", description = "Invalid markdown structure")]
    #[doc_error(code = "PARSE_002", description = "Missing document title")]
    #[doc_invariant(rules = "input NOT_BLANK")]
    pub fn parse(&self, input: &str, author: &str) -> Result<Document> {
        if input.trim().is_empty() {
            return Err(FindDocError::ParseError("Empty input".to_string()));
        }

        let lines: Vec<&str> = input.lines().collect();

        // Extract title from first heading
        let title = self.extract_title(&lines)?;

        let mut doc = Document::new(title, author.to_string());

        // Parse sections
        let sections = self.parse_sections(&lines);
        for (heading, content, level) in sections {
            doc.add_section(heading, content, level);
        }

        Ok(doc)
    }

    fn extract_title(&self, lines: &[&str]) -> Result<String> {
        for line in lines {
            let trimmed = line.trim();
            if trimmed.starts_with("# ") {
                return Ok(trimmed[2..].to_string());
            }
        }

        if self.strict_mode {
            Err(FindDocError::ParseError("No title found (strict mode)".to_string()))
        } else {
            Ok("Untitled".to_string())
        }
    }

    fn parse_sections(&self, lines: &[&str]) -> Vec<(String, String, u8)> {
        let mut sections = Vec::new();
        let mut current_heading: Option<String> = None;
        let mut current_content = String::new();
        let mut current_level: u8 = 0;

        for line in lines {
            let trimmed = line.trim();

            if trimmed.starts_with("## ") || trimmed.starts_with("### ") || trimmed.starts_with("#### ") {
                // Save previous section
                if let Some(heading) = current_heading.take() {
                    sections.push((heading, current_content.trim().to_string(), current_level));
                    current_content.clear();
                }

                let level = trimmed.chars().take_while(|c| *c == '#').count() as u8 - 1;
                let heading = trimmed.trim_start_matches('#').trim().to_string();
                current_heading = Some(heading);
                current_level = level;
            } else if current_heading.is_some() {
                current_content.push_str(trimmed);
                current_content.push('\n');
            }
        }

        // Don't forget the last section
        if let Some(heading) = current_heading {
            sections.push((heading, current_content.trim().to_string(), current_level));
        }

        sections
    }
}

impl Default for Parser {
    fn default() -> Self {
        Self::new()
    }
}
