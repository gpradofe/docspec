//! Read doc comments (/// and //!) from attributes.
//!
//! @docspec:module {
//!   id: "docspec-rust-reader-doc-comment",
//!   name: "Doc Comment Reader",
//!   description: "Extracts and concatenates Rust doc comment lines (/// and //!) from syn::Attribute lists into a single trimmed description string.",
//!   since: "3.0.0"
//! }

/// @docspec:deterministic
/// @docspec:intentional "Concatenates all #[doc = ...] attribute lines into a single description string"
pub fn read_doc_comment(attrs: &[syn::Attribute]) -> Option<String> {
    let mut lines = Vec::new();
    for attr in attrs {
        if attr.path().is_ident("doc") {
            if let syn::Meta::NameValue(nv) = &attr.meta {
                if let syn::Expr::Lit(lit) = &nv.value {
                    if let syn::Lit::Str(s) = &lit.lit {
                        lines.push(s.value().trim().to_string());
                    }
                }
            }
        }
    }
    if lines.is_empty() {
        None
    } else {
        Some(lines.join(" ").trim().to_string())
    }
}
