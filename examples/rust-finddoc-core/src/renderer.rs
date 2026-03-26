//! Document renderer -- converts documents to various output formats.

use crate::document::Document;
use crate::error::{FindDocError, Result};
use docspec_macros::{doc_module, doc_context, doc_method, doc_flow, doc_error, doc_deterministic};

/// Output format for rendering.
#[derive(Debug, Clone, Copy)]
pub enum OutputFormat {
    Html,
    Markdown,
    PlainText,
    Json,
}

/// Document renderer with configurable output format.
#[doc_module(name = "renderer", description = "Document rendering engine")]
#[doc_context(id = "rendering", name = "rendering")]
pub struct Renderer {
    format: OutputFormat,
    include_metadata: bool,
}

impl Renderer {
    /// Create a new renderer for the given output format.
    #[doc_method(description = "Creates a renderer for the specified format")]
    pub fn new(format: OutputFormat) -> Self {
        Self {
            format,
            include_metadata: true,
        }
    }

    /// Set whether to include document metadata in output.
    pub fn with_metadata(mut self, include: bool) -> Self {
        self.include_metadata = include;
        self
    }

    /// Render a document to the configured output format.
    #[doc_method(description = "Renders a document to the configured format")]
    #[doc_flow(id = "document-rendering", name = "document-rendering")]
    #[doc_error(code = "RENDER_001", description = "Empty document cannot be rendered")]
    #[doc_deterministic]
    pub fn render(&self, doc: &Document) -> Result<String> {
        if doc.sections.is_empty() {
            return Err(FindDocError::EmptyDocument(doc.id.clone()));
        }

        match self.format {
            OutputFormat::Html => self.render_html(doc),
            OutputFormat::Markdown => self.render_markdown(doc),
            OutputFormat::PlainText => self.render_plain_text(doc),
            OutputFormat::Json => self.render_json(doc),
        }
    }

    fn render_html(&self, doc: &Document) -> Result<String> {
        let mut html = String::new();
        html.push_str("<!DOCTYPE html>\n<html>\n<head>\n");
        html.push_str(&format!("  <title>{}</title>\n", doc.title));
        html.push_str("</head>\n<body>\n");
        html.push_str(&format!("  <h1>{}</h1>\n", doc.title));

        if self.include_metadata {
            html.push_str(&format!(
                "  <p class=\"meta\">By {} | {} words</p>\n",
                doc.metadata.author,
                doc.metadata.word_count
            ));
        }

        for section in &doc.sections {
            let tag = format!("h{}", section.level + 2);
            html.push_str(&format!("  <{}>{}</{}>\n", tag, section.heading, tag));
            html.push_str(&format!("  <p>{}</p>\n", section.content));
        }

        html.push_str("</body>\n</html>");
        Ok(html)
    }

    fn render_markdown(&self, doc: &Document) -> Result<String> {
        let mut md = String::new();
        md.push_str(&format!("# {}\n\n", doc.title));

        if self.include_metadata {
            md.push_str(&format!(
                "_By {} | {} words_\n\n",
                doc.metadata.author, doc.metadata.word_count
            ));
        }

        for section in &doc.sections {
            let prefix = "#".repeat((section.level + 2) as usize);
            md.push_str(&format!("{} {}\n\n", prefix, section.heading));
            md.push_str(&format!("{}\n\n", section.content));
        }

        Ok(md)
    }

    fn render_plain_text(&self, doc: &Document) -> Result<String> {
        let mut text = String::new();
        text.push_str(&format!("{}\n", doc.title));
        text.push_str(&format!("{}\n\n", "=".repeat(doc.title.len())));

        for section in &doc.sections {
            text.push_str(&format!("{}\n", section.heading));
            text.push_str(&format!("{}\n\n", "-".repeat(section.heading.len())));
            text.push_str(&format!("{}\n\n", section.content));
        }

        Ok(text)
    }

    fn render_json(&self, doc: &Document) -> Result<String> {
        serde_json::to_string_pretty(doc).map_err(|e| FindDocError::SerializationError(e.to_string()))
    }
}
