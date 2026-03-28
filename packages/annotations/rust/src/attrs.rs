//! Core attribute macro implementations.
//!
//! @docspec:module {
//!   id: "docspec-rust-annotations-core",
//!   name: "Core Attribute Implementations",
//!   description: "Implements 21 pass-through attribute macros (doc_module, doc_method, doc_field, doc_flow, doc_step, doc_context, doc_endpoint, doc_error, doc_event, doc_hidden, doc_pii, doc_audience, doc_tags, doc_optional, doc_example, doc_sensitive, doc_performance, doc_test_strategy, doc_test_skip, doc_examples, doc_uses_all) that emit cfg_attr-wrapped metadata for processor extraction.",
//!   since: "3.0.0"
//! }

use proc_macro2::TokenStream;
use quote::quote;

/// All core attrs are pass-through -- they annotate the item with doc comments
/// containing structured metadata that the processor extracts.

/// @docspec:deterministic
/// @docspec:intentional "Wraps an item with a cfg_attr-gated doc_module attribute for processor extraction"
pub fn doc_module_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_module(#attr))] });
    output.extend(item);
    output
}

pub fn doc_method_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_method(#attr))] });
    output.extend(item);
    output
}

pub fn doc_field_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_field(#attr))] });
    output.extend(item);
    output
}

pub fn doc_flow_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_flow(#attr))] });
    output.extend(item);
    output
}

pub fn doc_step_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_step(#attr))] });
    output.extend(item);
    output
}

pub fn doc_context_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_context(#attr))] });
    output.extend(item);
    output
}

pub fn doc_endpoint_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_endpoint(#attr))] });
    output.extend(item);
    output
}

pub fn doc_error_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_error(#attr))] });
    output.extend(item);
    output
}

pub fn doc_event_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_event(#attr))] });
    output.extend(item);
    output
}

/// @docspec:deterministic
/// @docspec:intentional "Marks an item as hidden from documentation output"
pub fn doc_hidden_impl(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_hidden)] });
    output.extend(item);
    output
}

/// @docspec:deterministic
/// @docspec:intentional "Marks a field as containing PII with optional retention, GDPR basis, and masking metadata"
pub fn doc_pii_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_pii(#attr))] });
    output.extend(item);
    output
}

pub fn doc_audience_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_audience(#attr))] });
    output.extend(item);
    output
}

pub fn doc_tags_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_tags(#attr))] });
    output.extend(item);
    output
}

pub fn doc_optional_impl(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_optional)] });
    output.extend(item);
    output
}

pub fn doc_example_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_example(#attr))] });
    output.extend(item);
    output
}

pub fn doc_sensitive_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_sensitive(#attr))] });
    output.extend(item);
    output
}

pub fn doc_performance_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_performance(#attr))] });
    output.extend(item);
    output
}

pub fn doc_test_strategy_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_test_strategy(#attr))] });
    output.extend(item);
    output
}

pub fn doc_test_skip_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_test_skip(#attr))] });
    output.extend(item);
    output
}

pub fn doc_examples_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_examples(#attr))] });
    output.extend(item);
    output
}

pub fn doc_uses_all_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_uses_all(#attr))] });
    output.extend(item);
    output
}
