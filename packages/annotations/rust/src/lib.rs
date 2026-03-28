//! DocSpec proc-macro attributes for Rust.
//!
//! @docspec:module {
//!   id: "docspec-rust-annotations",
//!   name: "DocSpec Rust Annotations",
//!   description: "Provides 40 attribute macros for annotating Rust types and functions with DocSpec documentation metadata, achieving full parity with the Java annotation set.",
//!   since: "3.0.0"
//! }
//!
//! Provides 40 attribute macros for annotating Rust types and functions
//! with DocSpec documentation metadata -- full parity with the Java annotations.
//! (Java's 42 annotations include 3 nested-only types -- Step, ContextInput,
//! ContextUses -- whose data is passed as parameters to their parent attributes
//! in Rust, reducing the standalone count to 40, plus package-info.java.)

extern crate proc_macro;

mod attrs;
mod dsti_attrs;
mod protocol_attrs;

use proc_macro::TokenStream;

// ---------------------------------------------------------------------------
// Core attributes (attrs.rs)
// ---------------------------------------------------------------------------

/// Mark a module for DocSpec documentation.
///
/// # Example
/// ```rust
/// #[doc_module(name = "auth", description = "Authentication module")]
/// pub struct AuthService;
/// ```
#[proc_macro_attribute]
pub fn doc_module(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_module_impl(attr.into(), item.into()).into()
}

/// Document a method with DocSpec metadata.
#[proc_macro_attribute]
pub fn doc_method(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_method_impl(attr.into(), item.into()).into()
}

/// Document a field with DocSpec metadata.
#[proc_macro_attribute]
pub fn doc_field(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_field_impl(attr.into(), item.into()).into()
}

/// Define a business flow.
#[proc_macro_attribute]
pub fn doc_flow(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_flow_impl(attr.into(), item.into()).into()
}

/// Define a flow step.
#[proc_macro_attribute]
pub fn doc_step(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_step_impl(attr.into(), item.into()).into()
}

/// Define a context narrative.
#[proc_macro_attribute]
pub fn doc_context(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_context_impl(attr.into(), item.into()).into()
}

/// Document an endpoint.
#[proc_macro_attribute]
pub fn doc_endpoint(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_endpoint_impl(attr.into(), item.into()).into()
}

/// Document an error condition.
#[proc_macro_attribute]
pub fn doc_error(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_error_impl(attr.into(), item.into()).into()
}

/// Document an event.
#[proc_macro_attribute]
pub fn doc_event(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_event_impl(attr.into(), item.into()).into()
}

/// Hide from documentation.
#[proc_macro_attribute]
pub fn doc_hidden(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_hidden_impl(attr.into(), item.into()).into()
}

/// Document PII fields.
#[proc_macro_attribute]
pub fn doc_pii(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_pii_impl(attr.into(), item.into()).into()
}

// ---------------------------------------------------------------------------
// Quality / metadata attributes (attrs.rs)
// ---------------------------------------------------------------------------

/// Specify the target audience for a documented element.
///
/// # Example
/// ```rust
/// #[doc_audience(level = "advanced")]
/// pub fn optimize_query() {}
/// ```
#[proc_macro_attribute]
pub fn doc_audience(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_audience_impl(attr.into(), item.into()).into()
}

/// Attach freeform tags to a documented element.
///
/// # Example
/// ```rust
/// #[doc_tags(values = "cache, performance, critical-path")]
/// pub fn warm_cache() {}
/// ```
#[proc_macro_attribute]
pub fn doc_tags(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_tags_impl(attr.into(), item.into()).into()
}

/// Mark a parameter as optional.
///
/// # Example
/// ```rust
/// pub fn search(query: &str, #[doc_optional] page: usize) {}
/// ```
#[proc_macro_attribute]
pub fn doc_optional(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_optional_impl(attr.into(), item.into()).into()
}

/// Provide a code example for a documented element.
///
/// # Example
/// ```rust
/// #[doc_example(lang = "rust", code = "let s = Service::new();")]
/// pub struct Service;
/// ```
#[proc_macro_attribute]
pub fn doc_example(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_example_impl(attr.into(), item.into()).into()
}

/// Mark data as sensitive (API keys, internal tokens, etc.).
///
/// # Example
/// ```rust
/// #[doc_sensitive(reason = "Contains internal routing token")]
/// pub routing_token: String,
/// ```
#[proc_macro_attribute]
pub fn doc_sensitive(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_sensitive_impl(attr.into(), item.into()).into()
}

/// Document performance characteristics.
///
/// # Example
/// ```rust
/// #[doc_performance(complexity = "O(n log n)", throughput = "10k ops/sec")]
/// pub fn sort_entries() {}
/// ```
#[proc_macro_attribute]
pub fn doc_performance(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_performance_impl(attr.into(), item.into()).into()
}

/// Declare the testing strategy for a method.
///
/// # Example
/// ```rust
/// #[doc_test_strategy(approach = "property-based", coverage = "mutation")]
/// pub fn merge_accounts() {}
/// ```
#[proc_macro_attribute]
pub fn doc_test_strategy(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_test_strategy_impl(attr.into(), item.into()).into()
}

/// Skip automated test generation for a method.
///
/// # Example
/// ```rust
/// #[doc_test_skip(reason = "Requires physical hardware")]
/// pub fn calibrate_sensor() {}
/// ```
#[proc_macro_attribute]
pub fn doc_test_skip(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_test_skip_impl(attr.into(), item.into()).into()
}

/// Container for multiple `doc_example` annotations.
///
/// # Example
/// ```rust
/// #[doc_examples(examples = "...")]
/// pub fn create_order() {}
/// ```
#[proc_macro_attribute]
pub fn doc_examples(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_examples_impl(attr.into(), item.into()).into()
}

/// Container for multiple `doc_uses` annotations.
///
/// # Example
/// ```rust
/// #[doc_uses_all(uses = "...")]
/// pub fn process_payment() {}
/// ```
#[proc_macro_attribute]
pub fn doc_uses_all(attr: TokenStream, item: TokenStream) -> TokenStream {
    attrs::doc_uses_all_impl(attr.into(), item.into()).into()
}

// ---------------------------------------------------------------------------
// DSTI attributes (dsti_attrs.rs)
// ---------------------------------------------------------------------------

/// Declare an invariant rule.
#[proc_macro_attribute]
pub fn doc_invariant(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_invariant_impl(attr.into(), item.into()).into()
}

/// Declare a monotonic property.
#[proc_macro_attribute]
pub fn doc_monotonic(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_monotonic_impl(attr.into(), item.into()).into()
}

/// Declare a conservation law.
#[proc_macro_attribute]
pub fn doc_conservation(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_conservation_impl(attr.into(), item.into()).into()
}

/// Mark a function as idempotent.
#[proc_macro_attribute]
pub fn doc_idempotent(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_idempotent_impl(attr.into(), item.into()).into()
}

/// Mark a function as deterministic.
#[proc_macro_attribute]
pub fn doc_deterministic(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_deterministic_impl(attr.into(), item.into()).into()
}

/// Declare an ordering strategy (e.g., insertion, natural, custom).
///
/// # Example
/// ```rust
/// #[doc_ordering(strategy = "natural", field = "created_at")]
/// pub fn list_events() -> Vec<Event> {}
/// ```
#[proc_macro_attribute]
pub fn doc_ordering(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_ordering_impl(attr.into(), item.into()).into()
}

/// Declare a property that is preserved through an operation.
///
/// # Example
/// ```rust
/// #[doc_preserves(properties = "total_count, sort_order")]
/// pub fn filter_items() {}
/// ```
#[proc_macro_attribute]
pub fn doc_preserves(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_preserves_impl(attr.into(), item.into()).into()
}

/// Declare a comparison strategy.
///
/// # Example
/// ```rust
/// #[doc_compare(strategy = "deep-equal", fields = "id, version")]
/// pub fn are_equivalent() -> bool {}
/// ```
#[proc_macro_attribute]
pub fn doc_compare(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_compare_impl(attr.into(), item.into()).into()
}

/// Declare a type relation (subtype, supertype, equivalent).
///
/// # Example
/// ```rust
/// #[doc_relation(kind = "subtype", target = "BaseEntity")]
/// pub struct DerivedEntity;
/// ```
#[proc_macro_attribute]
pub fn doc_relation(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_relation_impl(attr.into(), item.into()).into()
}

/// Define an architectural boundary.
///
/// # Example
/// ```rust
/// #[doc_boundary(layer = "domain", allows = "persistence", denies = "presentation")]
/// pub mod order_service {}
/// ```
#[proc_macro_attribute]
pub fn doc_boundary(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_boundary_impl(attr.into(), item.into()).into()
}

/// Document a state machine on the annotated type.
///
/// # Example
/// ```rust
/// #[doc_state_machine(states = "DRAFT, PENDING, APPROVED", initial = "DRAFT",
///                     transitions = "DRAFT -> PENDING, PENDING -> APPROVED")]
/// pub struct DocumentWorkflow;
/// ```
#[proc_macro_attribute]
pub fn doc_state_machine(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_state_machine_impl(attr.into(), item.into()).into()
}

/// Declare the primary intent of a method.
///
/// # Example
/// ```rust
/// #[doc_intentional(value = "Transfers funds between accounts",
///                   preserves = "total_balance, audit_trail")]
/// pub fn transfer() {}
/// ```
#[proc_macro_attribute]
pub fn doc_intentional(attr: TokenStream, item: TokenStream) -> TokenStream {
    dsti_attrs::doc_intentional_impl(attr.into(), item.into()).into()
}

// ---------------------------------------------------------------------------
// Protocol + cross-reference attributes (protocol_attrs.rs)
// ---------------------------------------------------------------------------

/// Document an AsyncAPI channel or operation.
///
/// # Example
/// ```rust
/// #[doc_async_api(channel = "orders", operation = "publish")]
/// pub fn emit_order_event() {}
/// ```
#[proc_macro_attribute]
pub fn doc_async_api(attr: TokenStream, item: TokenStream) -> TokenStream {
    protocol_attrs::doc_async_api_impl(attr.into(), item.into()).into()
}

/// Document a gRPC service or method.
///
/// # Example
/// ```rust
/// #[doc_grpc(service = "OrderService", method = "CreateOrder")]
/// pub fn create_order() {}
/// ```
#[proc_macro_attribute]
pub fn doc_grpc(attr: TokenStream, item: TokenStream) -> TokenStream {
    protocol_attrs::doc_grpc_impl(attr.into(), item.into()).into()
}

/// Document a GraphQL query, mutation, or subscription.
///
/// # Example
/// ```rust
/// #[doc_graphql(operation = "mutation", name = "createUser")]
/// pub fn create_user() {}
/// ```
#[proc_macro_attribute]
pub fn doc_graphql(attr: TokenStream, item: TokenStream) -> TokenStream {
    protocol_attrs::doc_graphql_impl(attr.into(), item.into()).into()
}

/// Document a WebSocket endpoint.
///
/// # Example
/// ```rust
/// #[doc_websocket(path = "/ws/feed", direction = "bidirectional")]
/// pub fn live_feed() {}
/// ```
#[proc_macro_attribute]
pub fn doc_websocket(attr: TokenStream, item: TokenStream) -> TokenStream {
    protocol_attrs::doc_websocket_impl(attr.into(), item.into()).into()
}

/// Document a CLI command.
///
/// # Example
/// ```rust
/// #[doc_command(name = "migrate", description = "Run database migrations")]
/// pub fn cmd_migrate() {}
/// ```
#[proc_macro_attribute]
pub fn doc_command(attr: TokenStream, item: TokenStream) -> TokenStream {
    protocol_attrs::doc_command_impl(attr.into(), item.into()).into()
}

/// Declare a cross-artifact dependency.
///
/// # Example
/// ```rust
/// #[doc_uses(artifact = "auth-service", method = "validateToken")]
/// pub fn check_auth() {}
/// ```
#[proc_macro_attribute]
pub fn doc_uses(attr: TokenStream, item: TokenStream) -> TokenStream {
    protocol_attrs::doc_uses_impl(attr.into(), item.into()).into()
}

/// Mark a test as a verified, executable example attached to a documented element.
///
/// # Example
/// ```rust
/// #[doc_spec_example(attach_to = "crate::OrderService::create", title = "Create an order")]
/// #[test]
/// fn test_create_order() {}
/// ```
#[proc_macro_attribute]
pub fn doc_spec_example(attr: TokenStream, item: TokenStream) -> TokenStream {
    protocol_attrs::doc_spec_example_impl(attr.into(), item.into()).into()
}
