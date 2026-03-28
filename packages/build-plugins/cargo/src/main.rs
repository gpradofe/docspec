//! `cargo docspec` -- DocSpec Cargo subcommand.
//!
//! Provides `generate`, `validate`, and `coverage` subcommands for Rust
//! projects using DocSpec v3. Wraps the docspec-processor Rust binary and
//! adds schema validation and coverage reporting.

use clap::{Parser, Subcommand};
use colored::Colorize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};

// ---------------------------------------------------------------------------
// CLI definition
// ---------------------------------------------------------------------------

/// DocSpec Cargo subcommand -- generate, validate, and check coverage
/// of documentation specifications for Rust projects.
#[derive(Parser)]
#[command(
    name = "cargo-docspec",
    bin_name = "cargo docspec",
    version,
    about = "DocSpec v3 documentation toolchain for Rust",
    long_about = "Generate structured, machine-readable documentation from Rust source code.\n\
                  Supports auto-discovery, DSTI intent graphs, and the full DocSpec v3 spec."
)]
struct Cli {
    /// Cargo passes the subcommand name as the first argument; absorb it.
    #[arg(hide = true, default_value = "docspec")]
    _cargo_subcommand: Option<String>,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Generate docspec.json from Rust source code
    Generate {
        /// Source directory to scan
        #[arg(short, long, default_value = "src")]
        source: PathBuf,

        /// Output directory for docspec.json
        #[arg(short, long, default_value = "target")]
        output: PathBuf,

        /// Override the artifact group ID
        #[arg(long)]
        group_id: Option<String>,

        /// Override the artifact ID
        #[arg(long)]
        artifact_id: Option<String>,

        /// Override the artifact version
        #[arg(long)]
        version: Option<String>,
    },

    /// Validate docspec.json against the DocSpec v3 JSON Schema
    Validate {
        /// Path to the docspec.json file
        #[arg(short, long, default_value = "target/docspec.json")]
        file: PathBuf,

        /// Path to the JSON schema file (defaults to bundled schema)
        #[arg(long)]
        schema: Option<PathBuf>,
    },

    /// Check documentation coverage against a minimum threshold
    Coverage {
        /// Path to the docspec.json file
        #[arg(short, long, default_value = "target/docspec.json")]
        file: PathBuf,

        /// Minimum coverage percentage required
        #[arg(short, long, default_value = "0")]
        minimum: u32,

        /// Fail with non-zero exit code when below threshold
        #[arg(long, default_value = "true")]
        fail_on_below: bool,
    },
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

fn main() -> ExitCode {
    let cli = Cli::parse();

    match cli.command {
        Commands::Generate {
            source,
            output,
            group_id,
            artifact_id,
            version,
        } => cmd_generate(&source, &output, group_id, artifact_id, version),
        Commands::Validate { file, schema } => cmd_validate(&file, schema.as_deref()),
        Commands::Coverage {
            file,
            minimum,
            fail_on_below,
        } => cmd_coverage(&file, minimum, fail_on_below),
    }
}

// ---------------------------------------------------------------------------
// Generate command
// ---------------------------------------------------------------------------

fn cmd_generate(
    source: &Path,
    output: &Path,
    group_id: Option<String>,
    artifact_id: Option<String>,
    version: Option<String>,
) -> ExitCode {
    println!();
    println!("{}", "========================================".cyan());
    println!("{}", "  DocSpec: Generating Specification".cyan());
    println!("{}", "========================================".cyan());
    println!();

    // Resolve artifact metadata from Cargo.toml if not provided
    let (resolved_group, resolved_artifact, resolved_version) =
        resolve_cargo_metadata(&group_id, &artifact_id, &version);

    println!("  Artifact:  {}:{}", resolved_group.dimmed(), resolved_artifact.white().bold());
    println!("  Version:   {}", resolved_version.white());
    println!("  Source:    {}", source.display().to_string().white());
    println!("  Output:    {}", output.display().to_string().white());
    println!();

    // Verify source directory exists
    if !source.is_dir() {
        eprintln!(
            "{}",
            format!("  Error: Source directory '{}' does not exist.", source.display()).red()
        );
        return ExitCode::FAILURE;
    }

    // Ensure output directory exists
    if let Err(e) = fs::create_dir_all(output) {
        eprintln!(
            "{}",
            format!("  Error: Could not create output directory: {e}").red()
        );
        return ExitCode::FAILURE;
    }

    // Count source files for progress feedback
    let rs_file_count = count_rust_files(source);
    println!("  Scanning {} Rust source file(s)...", rs_file_count.to_string().yellow());

    // Try to invoke the docspec-rust processor binary
    let processor_result = Command::new("docspec-rust")
        .arg(source.to_string_lossy().as_ref())
        .arg(output.to_string_lossy().as_ref())
        .output();

    match processor_result {
        Ok(proc_output) => {
            if !proc_output.status.success() {
                let stderr = String::from_utf8_lossy(&proc_output.stderr);
                eprintln!("{}", format!("  Processor error: {stderr}").red());
                return ExitCode::FAILURE;
            }

            let spec_path = output.join("docspec.json");
            if spec_path.exists() {
                let size_kb = fs::metadata(&spec_path)
                    .map(|m| m.len() / 1024)
                    .unwrap_or(0);

                println!();
                println!(
                    "{}",
                    format!("  Generated: {} ({} KB)", spec_path.display(), size_kb).green()
                );

                // Print summary from the generated file
                if let Ok(content) = fs::read_to_string(&spec_path) {
                    if let Ok(json) = serde_json::from_str::<Value>(&content) {
                        print_generation_summary(&json);
                    }
                }
            } else {
                println!(
                    "{}",
                    "  Processing succeeded but docspec.json was not created.".yellow()
                );
                println!(
                    "{}",
                    "  The processor may not have found any documentable items.".yellow()
                );
            }
        }
        Err(_) => {
            // Processor binary not found -- generate a minimal spec from Cargo.toml metadata
            println!(
                "{}",
                "  Note: 'docspec-rust' binary not found on PATH.".yellow()
            );
            println!(
                "{}",
                "  Generating minimal specification from Cargo.toml metadata...".yellow()
            );

            let minimal_spec = generate_minimal_spec(
                source,
                &resolved_group,
                &resolved_artifact,
                &resolved_version,
            );

            let spec_path = output.join("docspec.json");
            match fs::write(&spec_path, serde_json::to_string_pretty(&minimal_spec).unwrap()) {
                Ok(()) => {
                    println!();
                    println!(
                        "{}",
                        format!("  Generated (minimal): {}", spec_path.display()).green()
                    );
                    print_generation_summary(&minimal_spec);
                }
                Err(e) => {
                    eprintln!("{}", format!("  Error writing spec: {e}").red());
                    return ExitCode::FAILURE;
                }
            }
        }
    }

    println!();
    println!("{}", "========================================".cyan());
    println!();
    ExitCode::SUCCESS
}

// ---------------------------------------------------------------------------
// Validate command
// ---------------------------------------------------------------------------

fn cmd_validate(file: &Path, schema_path: Option<&Path>) -> ExitCode {
    println!();
    println!("{}", "========================================".cyan());
    println!("{}", "  DocSpec: Validating Specification".cyan());
    println!("{}", "========================================".cyan());
    println!();

    // 1. Check file exists
    if !file.exists() {
        eprintln!(
            "{}",
            format!(
                "  Error: Specification file not found: {}\n  Run 'cargo docspec generate' first.",
                file.display()
            )
            .red()
        );
        return ExitCode::FAILURE;
    }

    println!("  File: {}", file.display().to_string().white());

    // 2. Load the specification
    let spec_content = match fs::read_to_string(file) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{}", format!("  Error reading file: {e}").red());
            return ExitCode::FAILURE;
        }
    };

    let spec_value: Value = match serde_json::from_str(&spec_content) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("{}", format!("  Error: Invalid JSON: {e}").red());
            return ExitCode::FAILURE;
        }
    };

    let size_kb = spec_content.len() / 1024;
    println!("  Size: {} KB", size_kb);
    println!();

    // 3. Load the schema
    let schema_value = if let Some(path) = schema_path {
        match fs::read_to_string(path) {
            Ok(c) => match serde_json::from_str::<Value>(&c) {
                Ok(v) => v,
                Err(e) => {
                    eprintln!("{}", format!("  Error parsing schema: {e}").red());
                    return ExitCode::FAILURE;
                }
            },
            Err(e) => {
                eprintln!("{}", format!("  Error reading schema: {e}").red());
                return ExitCode::FAILURE;
            }
        }
    } else {
        // Look for schema in well-known locations
        let candidates = [
            PathBuf::from("spec/docspec.schema.json"),
            PathBuf::from("../spec/docspec.schema.json"),
            PathBuf::from("../../spec/docspec.schema.json"),
        ];
        let mut found = None;
        for candidate in &candidates {
            if candidate.exists() {
                if let Ok(c) = fs::read_to_string(candidate) {
                    if let Ok(v) = serde_json::from_str::<Value>(&c) {
                        println!("  Schema: {}", candidate.display().to_string().dimmed());
                        found = Some(v);
                        break;
                    }
                }
            }
        }
        match found {
            Some(v) => v,
            None => {
                // Fall back to inline structural validation
                println!(
                    "{}",
                    "  Schema file not found. Performing structural validation only.".yellow()
                );
                return structural_validate(&spec_value);
            }
        }
    };

    // 4. Validate with jsonschema
    let compiled_schema = match jsonschema::JSONSchema::compile(&schema_value) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{}", format!("  Error compiling schema: {e}").red());
            return ExitCode::FAILURE;
        }
    };

    let result = compiled_schema.validate(&spec_value);
    match result {
        Ok(()) => {
            let spec_version = spec_value
                .get("docspec")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");

            println!("{}", "  Validation PASSED".green().bold());
            println!("  DocSpec version: {}", spec_version);
            println!("  Schema: JSON Schema Draft 2020-12");
            println!();
            print_structural_summary(&spec_value);
        }
        Err(errors) => {
            let error_list: Vec<_> = errors.collect();
            eprintln!(
                "{}",
                format!("  Validation FAILED with {} error(s):", error_list.len())
                    .red()
                    .bold()
            );
            eprintln!();
            for (i, error) in error_list.iter().enumerate() {
                eprintln!("  {}) {}", i + 1, format!("{error}").red());
                eprintln!("     at: {}", error.instance_path.to_string().dimmed());
            }
            println!();
            println!("{}", "========================================".cyan());
            println!();
            return ExitCode::FAILURE;
        }
    }

    println!();
    println!("{}", "========================================".cyan());
    println!();
    ExitCode::SUCCESS
}

/// Structural validation fallback when no schema file is available.
fn structural_validate(spec: &Value) -> ExitCode {
    println!();
    let mut errors = Vec::new();

    // Check required top-level fields
    if !spec.is_object() {
        errors.push("Root must be a JSON object".to_string());
    } else {
        for field in &["docspec", "artifact", "modules"] {
            if spec.get(field).is_none() {
                errors.push(format!("Missing required field: '{field}'"));
            }
        }

        if let Some(docspec) = spec.get("docspec").and_then(|v| v.as_str()) {
            if docspec != "3.0.0" {
                errors.push(format!("Expected docspec version '3.0.0', got '{docspec}'"));
            }
        }

        if let Some(artifact) = spec.get("artifact") {
            for field in &["groupId", "artifactId", "version", "language"] {
                if artifact.get(field).is_none() {
                    errors.push(format!("Missing required artifact field: '{field}'"));
                }
            }
        }

        if let Some(modules) = spec.get("modules") {
            if !modules.is_array() {
                errors.push("'modules' must be an array".to_string());
            }
        }
    }

    if errors.is_empty() {
        println!("{}", "  Structural validation PASSED".green().bold());
        print_structural_summary(spec);
        println!();
        println!("{}", "========================================".cyan());
        println!();
        ExitCode::SUCCESS
    } else {
        eprintln!(
            "{}",
            format!("  Structural validation FAILED with {} error(s):", errors.len())
                .red()
                .bold()
        );
        for (i, error) in errors.iter().enumerate() {
            eprintln!("  {}) {}", i + 1, error.red());
        }
        println!();
        println!("{}", "========================================".cyan());
        println!();
        ExitCode::FAILURE
    }
}

fn print_structural_summary(spec: &Value) {
    let module_count = spec
        .get("modules")
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0);

    let has_intent = spec.get("intentGraph").map_or(false, |v| !v.is_null());
    let has_security = spec.get("security").map_or(false, |v| !v.is_null());
    let has_observability = spec.get("observability").map_or(false, |v| !v.is_null());
    let data_store_count = spec
        .get("dataStores")
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0);
    let error_count = spec
        .get("errors")
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0);

    println!("  Modules:          {module_count}");
    println!(
        "  Intent graph:     {}",
        if has_intent { "present" } else { "absent" }
    );
    println!(
        "  Security model:   {}",
        if has_security { "present" } else { "absent" }
    );
    println!(
        "  Observability:    {}",
        if has_observability {
            "present"
        } else {
            "absent"
        }
    );
    println!("  Data stores:      {data_store_count}");
    println!("  Error codes:      {error_count}");
}

// ---------------------------------------------------------------------------
// Coverage command
// ---------------------------------------------------------------------------

fn cmd_coverage(file: &Path, minimum: u32, fail_on_below: bool) -> ExitCode {
    println!();
    println!("{}", "========================================".cyan());
    println!(
        "{}",
        "  DocSpec Documentation Coverage Report".cyan()
    );
    println!("{}", "========================================".cyan());
    println!();

    // 1. Check file exists
    if !file.exists() {
        eprintln!(
            "{}",
            format!(
                "  Error: Specification file not found: {}\n  Run 'cargo docspec generate' first.",
                file.display()
            )
            .red()
        );
        return ExitCode::FAILURE;
    }

    // 2. Parse the specification
    let content = match fs::read_to_string(file) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{}", format!("  Error reading file: {e}").red());
            return ExitCode::FAILURE;
        }
    };

    let spec: Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("{}", format!("  Error: Invalid JSON: {e}").red());
            return ExitCode::FAILURE;
        }
    };

    // 3. Extract coverage from discovery section
    let discovery = spec.get("discovery");
    let actual_coverage = discovery
        .and_then(|d| d.get("coveragePercent"))
        .and_then(|v| v.as_u64())
        .map(|v| v as u32);

    let coverage = match actual_coverage {
        Some(c) => c,
        None => {
            // Calculate coverage from module/member data
            println!(
                "{}",
                "  No 'discovery.coveragePercent' found. Computing from modules...".yellow()
            );
            compute_coverage_from_modules(&spec)
        }
    };

    // 4. Print coverage bar
    print_coverage_bar(coverage, minimum);
    println!();

    // 5. Print detailed stats
    if let Some(disc) = discovery {
        if let Some(mode) = disc.get("mode").and_then(|v| v.as_str()) {
            println!("  Discovery mode:      {mode}");
        }
        if let Some(total) = disc.get("totalTypes").and_then(|v| v.as_u64()) {
            println!("  Total types:         {total}");
        }
        if let Some(documented) = disc.get("documentedTypes").and_then(|v| v.as_u64()) {
            println!("  Documented types:    {documented}");
        }
        if let Some(total) = disc.get("totalMethods").and_then(|v| v.as_u64()) {
            println!("  Total methods:       {total}");
        }
        if let Some(documented) = disc.get("documentedMethods").and_then(|v| v.as_u64()) {
            println!("  Documented methods:  {documented}");
        }
        if let Some(inferred) = disc.get("inferredDescriptions").and_then(|v| v.as_u64()) {
            println!("  Inferred desc.:      {inferred}");
        }
        if let Some(frameworks) = disc.get("detectedFrameworks").and_then(|v| v.as_array()) {
            if !frameworks.is_empty() {
                let fw_list: Vec<&str> = frameworks
                    .iter()
                    .filter_map(|v| v.as_str())
                    .collect();
                println!("  Frameworks:          {}", fw_list.join(", "));
            }
        }
    }

    // Module/member counts
    let modules = spec.get("modules").and_then(|v| v.as_array());
    let module_count = modules.map(|a| a.len()).unwrap_or(0);
    let mut total_members = 0u32;
    let mut documented_members = 0u32;
    if let Some(mods) = modules {
        for module in mods {
            if let Some(members) = module.get("members").and_then(|v| v.as_array()) {
                for member in members {
                    total_members += 1;
                    if let Some(desc) = member.get("description").and_then(|v| v.as_str()) {
                        if !desc.trim().is_empty() {
                            documented_members += 1;
                        }
                    }
                }
            }
        }
    }

    println!();
    println!("  Modules:             {module_count}");
    println!("  Total members:       {total_members}");
    println!("  Documented members:  {documented_members}");

    // Intent graph info
    if let Some(intent) = spec.get("intentGraph") {
        let method_count = intent
            .get("methods")
            .and_then(|v| v.as_array())
            .map(|a| a.len())
            .unwrap_or(0);
        if method_count > 0 {
            println!("  Intent methods:      {method_count}");
        }
    }

    println!();

    // 6. Enforce threshold
    if coverage >= minimum {
        println!(
            "{}",
            format!("  Coverage check PASSED ({coverage}% >= {minimum}%)")
                .green()
                .bold()
        );
    } else {
        let message = format!("  Coverage check FAILED ({coverage}% < {minimum}%)");
        if fail_on_below {
            eprintln!("{}", message.red().bold());
            println!();
            println!("{}", "========================================".cyan());
            println!();
            return ExitCode::FAILURE;
        } else {
            println!("{}", message.yellow());
            println!(
                "{}",
                "  Build will not fail because --fail-on-below is false.".yellow()
            );
        }
    }

    println!();
    println!("{}", "========================================".cyan());
    println!();
    ExitCode::SUCCESS
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Reads Cargo.toml to resolve artifact metadata, using provided overrides
/// when available.
fn resolve_cargo_metadata(
    group_id: &Option<String>,
    artifact_id: &Option<String>,
    version: &Option<String>,
) -> (String, String, String) {
    let mut pkg_name = String::from("unknown");
    let mut pkg_version = String::from("0.0.0");
    let mut pkg_authors = String::from("unknown");

    if let Ok(content) = fs::read_to_string("Cargo.toml") {
        if let Ok(cargo_toml) = content.parse::<toml::Value>() {
            if let Some(package) = cargo_toml.get("package") {
                if let Some(name) = package.get("name").and_then(|v| v.as_str()) {
                    pkg_name = name.to_string();
                }
                if let Some(ver) = package.get("version").and_then(|v| v.as_str()) {
                    pkg_version = ver.to_string();
                }
                if let Some(authors) = package.get("authors").and_then(|v| v.as_array()) {
                    if let Some(first) = authors.first().and_then(|v| v.as_str()) {
                        // Extract org-like identifier from author email
                        pkg_authors = first
                            .split('<')
                            .next()
                            .unwrap_or(first)
                            .trim()
                            .to_string();
                    }
                }
            }
        }
    }

    (
        group_id.clone().unwrap_or(pkg_authors),
        artifact_id.clone().unwrap_or(pkg_name),
        version.clone().unwrap_or(pkg_version),
    )
}

/// Counts `.rs` files recursively in a directory.
fn count_rust_files(dir: &Path) -> usize {
    walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().is_file()
                && e.path()
                    .extension()
                    .map_or(false, |ext| ext == "rs")
        })
        .count()
}

/// Generates a minimal docspec.json from Cargo.toml metadata and source file scanning.
fn generate_minimal_spec(
    source: &Path,
    group_id: &str,
    artifact_id: &str,
    version: &str,
) -> Value {
    let mut modules = Vec::new();

    // Walk source files and create a module per top-level .rs file or directory
    if let Ok(entries) = fs::read_dir(source) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();

            if name == "main" || name == "lib" {
                continue; // Skip entry points; they are not modules
            }

            if path.is_file() && path.extension().map_or(false, |e| e == "rs") {
                modules.push(serde_json::json!({
                    "id": name,
                    "name": to_title_case(&name),
                    "description": format!("Auto-discovered module from {}", path.display()),
                    "members": []
                }));
            } else if path.is_dir() && path.join("mod.rs").exists() {
                modules.push(serde_json::json!({
                    "id": name,
                    "name": to_title_case(&name),
                    "description": format!("Auto-discovered module directory '{}'", name),
                    "members": []
                }));
            }
        }
    }

    let rs_count = count_rust_files(source);

    serde_json::json!({
        "docspec": "3.0.0",
        "artifact": {
            "groupId": group_id,
            "artifactId": artifact_id,
            "version": version,
            "language": "rust"
        },
        "modules": modules,
        "discovery": {
            "mode": "auto",
            "totalTypes": rs_count,
            "documentedTypes": 0,
            "coveragePercent": 0,
            "inferredDescriptions": modules.len()
        }
    })
}

/// Computes coverage from module member data when discovery.coveragePercent
/// is not present.
fn compute_coverage_from_modules(spec: &Value) -> u32 {
    let modules = match spec.get("modules").and_then(|v| v.as_array()) {
        Some(m) => m,
        None => return 0,
    };

    let mut total = 0u32;
    let mut documented = 0u32;

    for module in modules {
        // Count the module itself
        total += 1;
        if let Some(desc) = module.get("description").and_then(|v| v.as_str()) {
            if !desc.trim().is_empty() {
                documented += 1;
            }
        }

        // Count members
        if let Some(members) = module.get("members").and_then(|v| v.as_array()) {
            for member in members {
                total += 1;
                if let Some(desc) = member.get("description").and_then(|v| v.as_str()) {
                    if !desc.trim().is_empty() {
                        documented += 1;
                    }
                }
            }
        }
    }

    if total == 0 {
        0
    } else {
        ((documented as f64 / total as f64) * 100.0) as u32
    }
}

/// Prints a colored progress bar for coverage.
fn print_coverage_bar(actual: u32, minimum: u32) {
    let bar_length = 40usize;
    let filled = (actual as usize * bar_length) / 100;
    let threshold_pos = if minimum > 0 {
        (minimum as usize * bar_length) / 100
    } else {
        0
    };

    let passed = actual >= minimum;
    let mut bar = String::from("  [");
    for i in 0..bar_length {
        if i < filled {
            if passed {
                bar.push_str(&"#".green().to_string());
            } else {
                bar.push_str(&"#".red().to_string());
            }
        } else if minimum > 0 && i == threshold_pos {
            bar.push_str(&"|".yellow().to_string());
        } else {
            bar.push_str(&"-".dimmed().to_string());
        }
    }
    bar.push_str(&format!("] {actual}%"));
    if minimum > 0 {
        bar.push_str(&format!("  (min: {minimum}%)"));
    }
    println!("{bar}");
}

/// Converts a snake_case identifier to Title Case.
fn to_title_case(s: &str) -> String {
    s.split('_')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => {
                    let upper: String = first.to_uppercase().collect();
                    upper + &chars.collect::<String>()
                }
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Prints a summary of the generated specification.
fn print_generation_summary(json: &Value) {
    let module_count = json
        .get("modules")
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0);

    let mut member_count = 0;
    if let Some(modules) = json.get("modules").and_then(|v| v.as_array()) {
        for module in modules {
            if let Some(members) = module.get("members").and_then(|v| v.as_array()) {
                member_count += members.len();
            }
        }
    }

    let intent_count = json
        .get("intentGraph")
        .and_then(|v| v.get("methods"))
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0);

    let coverage = json
        .get("discovery")
        .and_then(|d| d.get("coveragePercent"))
        .and_then(|v| v.as_u64())
        .map(|v| format!("{v}%"))
        .unwrap_or_else(|| "N/A".to_string());

    println!();
    println!("  Modules:        {module_count}");
    println!("  Members:        {member_count}");
    println!("  Intent methods: {intent_count}");
    println!("  Coverage:       {coverage}");
}
