//! DocSpec processor for Rust -- CLI entry point.
//!
//! @docspec:module {
//!   id: "docspec-rust-main",
//!   name: "DocSpec Rust CLI",
//!   description: "Command-line entry point that invokes the Rust DocSpec processor pipeline and writes the resulting docspec.json to the output directory.",
//!   since: "3.0.0"
//! }

mod processor;
mod scanner;
mod reader;
mod framework;
mod dsti;
mod extractor;
mod metrics;
mod output;

use std::path::PathBuf;
use processor::RustProcessor;

/// @docspec:method { since: "3.0.0" }
/// @docspec:intentional "Parses CLI arguments, invokes the processor pipeline, and writes output or reports errors"
fn main() {
    let args: Vec<String> = std::env::args().collect();
    let source_dir = args.get(1).map(PathBuf::from).unwrap_or_else(|| PathBuf::from("src"));
    let output_dir = args.get(2).map(PathBuf::from).unwrap_or_else(|| PathBuf::from("target"));

    let processor = RustProcessor::new(source_dir, output_dir);
    match processor.process() {
        Ok(spec) => {
            output::write_spec(&spec, &processor.output_dir);
            println!("DocSpec: Generated specification at {}/docspec.json", processor.output_dir.display());
        }
        Err(e) => {
            eprintln!("DocSpec error: {}", e);
            std::process::exit(1);
        }
    }
}
