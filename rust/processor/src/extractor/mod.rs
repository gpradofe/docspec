//! Domain-specific extractors that analyze Rust source AST and Cargo.toml
//! to populate the DocSpec model with security, configuration, observability,
//! data store, external dependency, privacy, and error/event information.
//!
//! @docspec:module {
//!   id: "docspec-rust-extractor",
//!   name: "Domain Extractors",
//!   description: "Eight domain-specific extractors (security, config, observability, data stores, external deps, privacy, errors/events, actix) that analyze Rust AST and Cargo.toml to populate the v3 DocSpec model.",
//!   since: "3.0.0"
//! }
//!
//! Each extractor implements the [`DocSpecExtractor`] trait and mirrors the
//! Java reference implementation's extractor interface.

pub mod security;
pub mod config;
pub mod observability;
pub mod datastore;
pub mod external_dep;
pub mod privacy;
pub mod error_event;
pub mod actix_detector;

use serde_json::Value;
use std::path::Path;

/// Shared context passed through the processor pipeline. Extractors read from
/// the parsed file list and Cargo.toml contents, and write into the accumulated
/// JSON sections that will be merged into the final docspec.json.
///
/// @docspec:boundary "Mutable accumulator carrying all domain-extracted data through the pipeline"
pub struct ProcessorContext {
    /// Parsed Cargo.toml content (raw string).
    pub cargo_toml: String,
    /// Root source directory being processed.
    pub source_dir: std::path::PathBuf,
    /// Collected security rules, roles, and endpoint-level constraints.
    pub security: Option<Value>,
    /// Collected configuration properties from config/dotenv patterns.
    pub configuration: Vec<Value>,
    /// Collected observability metrics and health checks.
    pub observability: Option<Value>,
    /// Collected data store references (databases, caches, message brokers).
    pub data_stores: Vec<Value>,
    /// Collected external HTTP/gRPC dependency references.
    pub external_dependencies: Vec<Value>,
    /// Collected PII / sensitive field annotations.
    pub privacy: Vec<Value>,
    /// Collected error types and event patterns.
    pub errors: Vec<Value>,
    /// Collected event definitions.
    pub events: Vec<Value>,
    /// Detected framework names.
    pub frameworks: Vec<String>,
}

impl ProcessorContext {
    /// Creates a new context by reading `Cargo.toml` from the project root
    /// (parent of the source directory).
    /// @docspec:intentional "Initialize a ProcessorContext by reading Cargo.toml and preparing empty accumulator fields"
    pub fn new(source_dir: &Path) -> Self {
        let cargo_path = source_dir.parent().unwrap_or(source_dir).join("Cargo.toml");
        let cargo_toml = std::fs::read_to_string(&cargo_path).unwrap_or_default();

        Self {
            cargo_toml,
            source_dir: source_dir.to_path_buf(),
            security: None,
            configuration: Vec::new(),
            observability: None,
            data_stores: Vec::new(),
            external_dependencies: Vec::new(),
            privacy: Vec::new(),
            errors: Vec::new(),
            events: Vec::new(),
            frameworks: Vec::new(),
        }
    }

    /// Checks whether a crate name appears as a dependency in Cargo.toml.
    /// @docspec:deterministic
    pub fn has_dependency(&self, crate_name: &str) -> bool {
        self.cargo_toml.contains(crate_name)
    }
}

/// Trait implemented by each domain extractor. Mirrors the Java
/// `DocSpecExtractor` interface with `isAvailable` / `extract`.
///
/// @docspec:boundary "Extractor contract: each domain checks availability via Cargo.toml and then populates the ProcessorContext"
pub trait DocSpecExtractor {
    /// Returns `true` if the required crate/framework is detected in the
    /// project (typically by checking Cargo.toml dependencies).
    fn is_available(&self, ctx: &ProcessorContext) -> bool;

    /// Human-readable name for diagnostics.
    fn extractor_name(&self) -> &'static str;

    /// Analyze all parsed files and populate the context with extracted data.
    fn extract(&self, files: &[crate::scanner::FileInfo], ctx: &mut ProcessorContext);
}

/// Run all registered extractors against the file set, returning a populated context.
///
/// @docspec:method { since: "3.0.0" }
/// @docspec:intentional "Iterates all 8 registered extractors, skipping unavailable ones, and populates a unified ProcessorContext"
pub fn run_all(files: &[crate::scanner::FileInfo], source_dir: &Path) -> ProcessorContext {
    let mut ctx = ProcessorContext::new(source_dir);

    let extractors: Vec<Box<dyn DocSpecExtractor>> = vec![
        Box::new(security::SecurityExtractor),
        Box::new(config::ConfigExtractor),
        Box::new(observability::ObservabilityExtractor),
        Box::new(datastore::DataStoreExtractor),
        Box::new(external_dep::ExternalDependencyExtractor),
        Box::new(privacy::PrivacyExtractor),
        Box::new(error_event::ErrorEventExtractor),
        Box::new(actix_detector::ActixDetector),
    ];

    for extractor in &extractors {
        if extractor.is_available(&ctx) {
            extractor.extract(files, &mut ctx);
        }
    }

    ctx
}
