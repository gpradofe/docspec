//! DSTI (Deep Semantic Test Intelligence) attribute implementations.
//!
//! @docspec:module {
//!   id: "docspec-rust-annotations-dsti",
//!   name: "DSTI Attribute Implementations",
//!   description: "Implements 12 DSTI-specific attribute macros (doc_invariant, doc_monotonic, doc_conservation, doc_idempotent, doc_deterministic, doc_ordering, doc_preserves, doc_compare, doc_relation, doc_boundary, doc_state_machine, doc_intentional) for semantic property declarations.",
//!   since: "3.0.0"
//! }

use proc_macro2::TokenStream;
use quote::quote;

/// @docspec:deterministic
/// @docspec:intentional "Wraps an item with a cfg_attr-gated doc_invariant attribute for declaring formal invariant rules"
pub fn doc_invariant_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_invariant(#attr))] });
    output.extend(item);
    output
}

pub fn doc_monotonic_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_monotonic(#attr))] });
    output.extend(item);
    output
}

pub fn doc_conservation_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_conservation(#attr))] });
    output.extend(item);
    output
}

/// @docspec:deterministic
/// @docspec:intentional "Marks a function as idempotent -- repeated calls have no additional effect"
pub fn doc_idempotent_impl(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_idempotent)] });
    output.extend(item);
    output
}

/// @docspec:deterministic
/// @docspec:intentional "Marks a function as deterministic -- same inputs always produce same outputs"
pub fn doc_deterministic_impl(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_deterministic)] });
    output.extend(item);
    output
}

/// @docspec:deterministic
/// @docspec:intentional "Marks a function as commutative -- argument order does not affect the result"
pub fn doc_commutative_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    if attr.is_empty() {
        output.extend(quote! { #[cfg_attr(docspec, doc_commutative)] });
    } else {
        output.extend(quote! { #[cfg_attr(docspec, doc_commutative(#attr))] });
    }
    output.extend(item);
    output
}

pub fn doc_ordering_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_ordering(#attr))] });
    output.extend(item);
    output
}

pub fn doc_preserves_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_preserves(#attr))] });
    output.extend(item);
    output
}

pub fn doc_compare_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_compare(#attr))] });
    output.extend(item);
    output
}

pub fn doc_relation_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_relation(#attr))] });
    output.extend(item);
    output
}

pub fn doc_boundary_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_boundary(#attr))] });
    output.extend(item);
    output
}

/// @docspec:deterministic
/// @docspec:intentional "Documents a state machine with states, initial state, and transitions"
pub fn doc_state_machine_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_state_machine(#attr))] });
    output.extend(item);
    output
}

/// @docspec:deterministic
/// @docspec:intentional "Declares the primary intent of a method with optional preserved properties"
pub fn doc_intentional_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_intentional(#attr))] });
    output.extend(item);
    output
}
