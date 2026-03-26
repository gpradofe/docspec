"""DocSpec decorators for Python — annotate your code for machine-readable documentation."""
# @docspec:module {
#   id: "docspec-py-annotations-pkg",
#   name: "DocSpec Python Annotations",
#   description: "Top-level package for the DocSpec Python annotation library. Re-exports all 42 decorators and the metadata retrieval function for use by annotated codebases.",
#   since: "3.0.0"
# }

from docspec_py.decorators import (
    doc_module, doc_method, doc_field, doc_flow, step,
    doc_context, context_input, context_uses,
    doc_endpoint, doc_error, doc_event,
    doc_invariant, doc_monotonic, doc_conservation, doc_ordering,
    doc_preserves, doc_compare, doc_relation, doc_boundary,
    doc_state_machine, doc_idempotent, doc_deterministic, doc_intentional,
    doc_hidden, doc_audience, doc_tags, doc_optional, doc_example,
    doc_pii, doc_sensitive, doc_performance, doc_test_strategy, doc_test_skip,
    doc_async_api, doc_grpc, doc_graphql, doc_websocket,
    doc_command, doc_uses, doc_spec_example,
)
from docspec_py.metadata import get_docspec_metadata

__all__ = [
    "doc_module", "doc_method", "doc_field", "doc_flow", "step",
    "doc_context", "context_input", "context_uses",
    "doc_endpoint", "doc_error", "doc_event",
    "doc_invariant", "doc_monotonic", "doc_conservation", "doc_ordering",
    "doc_preserves", "doc_compare", "doc_relation", "doc_boundary",
    "doc_state_machine", "doc_idempotent", "doc_deterministic", "doc_intentional",
    "doc_hidden", "doc_audience", "doc_tags", "doc_optional", "doc_example",
    "doc_pii", "doc_sensitive", "doc_performance", "doc_test_strategy", "doc_test_skip",
    "doc_async_api", "doc_grpc", "doc_graphql", "doc_websocket",
    "doc_command", "doc_uses", "doc_spec_example",
    "get_docspec_metadata",
]
