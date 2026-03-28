//! Protocol and cross-reference attribute implementations.

use proc_macro2::TokenStream;
use quote::quote;

pub fn doc_async_api_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_async_api(#attr))] });
    output.extend(item);
    output
}

pub fn doc_grpc_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_grpc(#attr))] });
    output.extend(item);
    output
}

pub fn doc_graphql_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_graphql(#attr))] });
    output.extend(item);
    output
}

pub fn doc_websocket_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_websocket(#attr))] });
    output.extend(item);
    output
}

pub fn doc_command_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_command(#attr))] });
    output.extend(item);
    output
}

pub fn doc_uses_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_uses(#attr))] });
    output.extend(item);
    output
}

pub fn doc_spec_example_impl(attr: TokenStream, item: TokenStream) -> TokenStream {
    let mut output = TokenStream::new();
    output.extend(quote! { #[cfg_attr(docspec, doc_spec_example(#attr))] });
    output.extend(item);
    output
}
