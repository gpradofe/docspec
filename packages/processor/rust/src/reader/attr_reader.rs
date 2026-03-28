//! Read docspec attributes from syn::Attribute list.
//!
//! @docspec:module {
//!   id: "docspec-rust-reader-attr",
//!   name: "Attribute Reader",
//!   description: "Extracts doc_* prefixed attributes from syn::Attribute lists into a string-keyed map for downstream processing.",
//!   since: "3.0.0"
//! }

use std::collections::HashMap;
use quote::ToTokens;

/// @docspec:deterministic
/// @docspec:intentional "Filters attributes to those starting with 'doc_' and extracts their token streams as strings"
pub fn read_attrs(attrs: &[syn::Attribute]) -> HashMap<String, String> {
    let mut result = HashMap::new();
    for attr in attrs {
        if let Some(ident) = attr.path().get_ident() {
            let name = ident.to_string();
            if name.starts_with("doc_") {
                // Extract the attribute tokens as a string
                let tokens = attr.meta.to_token_stream().to_string();
                result.insert(name, tokens);
            }
        }
    }
    result
}
