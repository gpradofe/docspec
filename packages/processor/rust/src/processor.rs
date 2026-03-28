//! Main processor orchestrator.
//!
//! @docspec:module id="docspec-rust-processor" name="DocSpec Rust Processor"
//! @docspec:description "Main processor orchestrator for Rust codebases.
//!   Coordinates the full DocSpec v3 pipeline: source file scanning,
//!   framework detection (Axum, Diesel, Serde), syn-based AST parsing to
//!   extract structs/enums/traits/functions/impl blocks, domain extractor
//!   pipeline (security, config, observability, data stores, external deps,
//!   privacy, errors/events), DSTI intent graph construction with density
//!   scoring, coverage calculation, and final docspec.json assembly."
//! @docspec:boundary "Rust source code analysis"
//! @docspec:since "3.0.0"
//! @docspec:tags ["self-documented", "processor", "rust", "pipeline"]
//!
//! Coordinates the full DocSpec pipeline:
//! 1. Scan source files
//! 2. Detect frameworks
//! 3. Parse AST and extract modules/members
//! 4. Run domain extractors (security, config, observability, etc.)
//! 5. Build DSTI intent graph with density scores
//! 6. Calculate documentation coverage metrics
//! 7. Assemble final docspec.json

use std::path::PathBuf;
use serde_json::Value;
use crate::scanner;
use crate::reader::{doc_comment_reader, description_inferrer};
use crate::framework::{axum_detector, diesel_detector, serde_detector};
use crate::dsti::{intent_extractor, intent_density_calculator, naming_analyzer};
use crate::extractor;
use crate::metrics::coverage;

/// @docspec:boundary "Orchestrates the complete DocSpec v3 pipeline from Rust source to docspec.json"
/// @docspec:intentional "Coordinates framework detection, AST parsing, domain extraction, DSTI analysis, and coverage calculation into a single pipeline"
pub struct RustProcessor {
    pub source_dir: PathBuf,
    pub output_dir: PathBuf,
}

impl RustProcessor {
    /// @docspec:method { since: "3.0.0" }
    /// @docspec:deterministic
    pub fn new(source_dir: PathBuf, output_dir: PathBuf) -> Self {
        Self { source_dir, output_dir }
    }

    /// @docspec:method { since: "3.0.0" }
    /// @docspec:intentional "Executes the full 7-step DocSpec pipeline: framework detection, domain extraction, AST parsing, intent graph construction, spec assembly, extractor merge, and coverage calculation"
    /// @docspec:preserves "source files are read-only; no mutations to the input codebase"
    pub fn process(&self) -> Result<Value, String> {
        let files = scanner::scan(&self.source_dir)?;
        let mut modules = Vec::new();
        let mut intent_methods = Vec::new();
        let mut frameworks: Vec<String> = Vec::new();
        let mut inferred_count: u32 = 0;

        // --- Step 1: Detect frameworks ---
        if axum_detector::detect(&self.source_dir) { frameworks.push("axum".to_string()); }
        if diesel_detector::detect(&self.source_dir) { frameworks.push("diesel".to_string()); }
        if serde_detector::detect(&self.source_dir) { frameworks.push("serde".to_string()); }

        // --- Step 2: Run domain extractors ---
        let extractor_ctx = extractor::run_all(&files, &self.source_dir);

        // Merge extractor-detected frameworks
        for fw in &extractor_ctx.frameworks {
            if !frameworks.contains(fw) {
                frameworks.push(fw.clone());
            }
        }

        // --- Step 3: Parse AST and build modules ---
        for file_info in &files {
            let syntax = syn::parse_file(&file_info.source)
                .map_err(|e| format!("Parse error in {}: {}", file_info.path.display(), e))?;

            let mut members = Vec::new();
            for item in &syntax.items {
                match item {
                    syn::Item::Struct(s) => {
                        let name = s.ident.to_string();
                        let qualified = format!("{}::{}", file_info.module, name);
                        let (description, was_inferred) = get_description(&s.attrs, &name);
                        if was_inferred { inferred_count += 1; }

                        let fields: Vec<Value> = s.fields.iter().filter_map(|f| {
                            f.ident.as_ref().map(|ident| {
                                let ty = &f.ty;
                                let mut field_json = serde_json::json!({
                                    "name": ident.to_string(),
                                    "type": quote::quote!(#ty).to_string(),
                                });
                                if let Some(doc) = doc_comment_reader::read_doc_comment(&f.attrs) {
                                    field_json.as_object_mut().unwrap()
                                        .insert("description".to_string(), Value::String(doc));
                                }
                                field_json
                            })
                        }).collect();

                        members.push(serde_json::json!({
                            "kind": "struct",
                            "name": name,
                            "qualified": qualified,
                            "description": description,
                            "fields": fields,
                        }));
                    }
                    syn::Item::Enum(e) => {
                        let name = e.ident.to_string();
                        let qualified = format!("{}::{}", file_info.module, name);
                        let (description, was_inferred) = get_description(&e.attrs, &name);
                        if was_inferred { inferred_count += 1; }

                        let values: Vec<String> = e.variants.iter()
                            .map(|v| v.ident.to_string()).collect();

                        members.push(serde_json::json!({
                            "kind": "enum",
                            "name": name,
                            "qualified": qualified,
                            "description": description,
                            "values": values,
                        }));
                    }
                    syn::Item::Trait(t) => {
                        let name = t.ident.to_string();
                        let qualified = format!("{}::{}", file_info.module, name);
                        let (description, was_inferred) = get_description(&t.attrs, &name);
                        if was_inferred { inferred_count += 1; }

                        members.push(serde_json::json!({
                            "kind": "trait",
                            "name": name,
                            "qualified": qualified,
                            "description": description,
                        }));
                    }
                    syn::Item::Fn(f) => {
                        let name = f.sig.ident.to_string();
                        let qualified = format!("{}::{}", file_info.module, name);
                        let (description, was_inferred) = get_description(&f.attrs, &name);
                        if was_inferred { inferred_count += 1; }

                        // Extract intent signals (original DSTI)
                        if let Some(signals) = intent_extractor::extract_from_fn(&f.sig, &f.block) {
                            intent_methods.push(serde_json::json!({
                                "qualified": qualified,
                                "intentSignals": signals,
                            }));
                        }

                        // Run naming analyzer for richer semantics (used in DSTI)
                        let _name_semantics = naming_analyzer::analyze(&name);

                        members.push(serde_json::json!({
                            "kind": "function",
                            "name": name,
                            "qualified": qualified,
                            "description": description,
                        }));
                    }
                    syn::Item::Impl(imp) => {
                        if let syn::Type::Path(tp) = imp.self_ty.as_ref() {
                            let type_name = tp.path.segments.last()
                                .map(|s| s.ident.to_string())
                                .unwrap_or_default();

                            for impl_item in &imp.items {
                                if let syn::ImplItem::Fn(method) = impl_item {
                                    let method_name = method.sig.ident.to_string();
                                    let method_qualified = format!("{}::{}#{}", file_info.module, type_name, method_name);

                                    if let Some(signals) = intent_extractor::extract_from_fn(&method.sig, &method.block) {
                                        intent_methods.push(serde_json::json!({
                                            "qualified": method_qualified,
                                            "intentSignals": signals,
                                        }));
                                    }
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }

            if !members.is_empty() {
                modules.push(serde_json::json!({
                    "id": file_info.module,
                    "name": file_info.module,
                    "members": members,
                }));
            }
        }

        // --- Step 4: Build intent graph with density scores ---
        let intent_graph = if intent_methods.is_empty() {
            None
        } else {
            let mut ig = serde_json::json!({"methods": intent_methods});
            intent_density_calculator::enrich_intent_graph(&mut ig);
            Some(ig)
        };

        // --- Step 5: Assemble spec ---
        let mut spec = serde_json::json!({
            "docspec": "3.0.0",
            "artifact": {
                "groupId": "unknown",
                "artifactId": "unknown",
                "version": "0.0.0",
                "language": "rust",
            },
            "modules": modules,
        });

        // Scope mutable borrow so we can immutably borrow `spec` for coverage later
        {
            let spec_map = spec.as_object_mut().unwrap();

            // Add frameworks
            if !frameworks.is_empty() {
                spec_map["artifact"].as_object_mut().unwrap()
                    .insert("frameworks".to_string(), serde_json::json!(frameworks));
            }

            // Add intent graph
            if let Some(ig) = intent_graph {
                spec_map.insert("intentGraph".to_string(), ig);
            }

            // --- Step 6: Merge extractor results ---
            if let Some(security) = &extractor_ctx.security {
                spec_map.insert("security".to_string(), security.clone());
            }
            if !extractor_ctx.configuration.is_empty() {
                spec_map.insert("configuration".to_string(), Value::Array(extractor_ctx.configuration.clone()));
            }
            if let Some(observability) = &extractor_ctx.observability {
                spec_map.insert("observability".to_string(), observability.clone());
            }
            if !extractor_ctx.data_stores.is_empty() {
                spec_map.insert("dataStores".to_string(), Value::Array(extractor_ctx.data_stores.clone()));
            }
            if !extractor_ctx.external_dependencies.is_empty() {
                spec_map.insert("externalDependencies".to_string(), Value::Array(extractor_ctx.external_dependencies.clone()));
            }
            if !extractor_ctx.privacy.is_empty() {
                spec_map.insert("privacy".to_string(), Value::Array(extractor_ctx.privacy.clone()));
            }
            if !extractor_ctx.errors.is_empty() {
                spec_map.insert("errors".to_string(), Value::Array(extractor_ctx.errors.clone()));
            }
            if !extractor_ctx.events.is_empty() {
                spec_map.insert("events".to_string(), Value::Array(extractor_ctx.events.clone()));
            }
        } // spec_map dropped here

        // --- Step 7: Calculate coverage ---
        let mut stats = coverage::analyze(&spec);
        stats.inferred_descriptions = inferred_count;

        let scanned = vec![self.source_dir.to_string_lossy().to_string()];
        let discovery = coverage::to_discovery_model(
            &stats,
            "auto",
            &frameworks,
            &scanned,
            &[],
        );
        spec.as_object_mut().unwrap()
            .insert("discovery".to_string(), discovery);

        Ok(spec)
    }
}

/// Get description from doc comments or infer it from the name.
/// Returns (description, was_inferred).
///
/// @docspec:deterministic
/// @docspec:intentional "Falls back to name-based inference when no doc comment exists, ensuring every item has a description"
fn get_description(attrs: &[syn::Attribute], name: &str) -> (String, bool) {
    match doc_comment_reader::read_doc_comment(attrs) {
        Some(doc) => (doc, false),
        None => (description_inferrer::infer(name), true),
    }
}
