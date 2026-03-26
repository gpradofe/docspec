"""All DocSpec decorators for Python.

Provides the full set of DocSpec decorators mirroring the 42 Java annotations.
Covers core documentation, flows, contexts, endpoints, errors, events,
DSTI semantic channels, quality/privacy markers, protocol bindings,
and cross-reference decorators. Zero runtime dependencies.
"""
from typing import Any, Callable
from docspec_py.metadata import set_metadata, append_metadata

# ---------------------------------------------------------------------------
# Module-level self-documentation (DocSpec documents itself)
# ---------------------------------------------------------------------------
_MODULE_META = {
    "docspec:module": {
        "id": "docspec-py-annotations",
        "name": "DocSpec Python Decorators",
        "description": (
            "Complete set of Python decorators for the DocSpec v3 annotation system. "
            "Each decorator attaches structured metadata to classes, methods, or properties "
            "via the __docspec__ attribute, which the Python processor reads during extraction."
        ),
        "since": "3.0.0",
        "audience": "library-author",
    },
    "docspec:boundary": "decorator definition",
    "docspec:tags": ["self-documented", "annotations", "python", "decorators"],
}


# -- Core decorators ---------------------------------------------------------

# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Define module-level documentation metadata for a class"
def doc_module(name: str | None = None, description: str | None = None, since: str | None = None, audience: str | None = None):
    def decorator(cls):
        set_metadata(cls, "module", {"name": name, "description": description, "since": since, "audience": audience})
        return cls
    return decorator


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Attach method-level documentation metadata to a function"
def doc_method(name: str | None = None, description: str | None = None, since: str | None = None, deprecated: str | None = None, tags: list[str] | None = None):
    def decorator(func):
        set_metadata(func, "method", {"name": name, "description": description, "since": since, "deprecated": deprecated, "tags": tags})
        return func
    return decorator


# @docspec:intentional "Attach field-level documentation metadata to a property or function"
def doc_field(name: str | None = None, description: str | None = None, since: str | None = None, type_: str | None = None):
    def decorator(func_or_prop):
        set_metadata(func_or_prop, "field", {"name": name, "description": description, "since": since, "type": type_})
        return func_or_prop
    return decorator


# -- Flow decorators ---------------------------------------------------------

# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Define a documentation flow with steps, trigger, and description"
def doc_flow(id: str, name: str | None = None, description: str | None = None, trigger: str | None = None):
    def decorator(cls):
        set_metadata(cls, "flow", {"id": id, "name": name, "description": description, "trigger": trigger})
        return cls
    return decorator


# @docspec:intentional "Declare a flow step with inputs, outputs, and optional AI flag"
def step(id: str, name: str | None = None, description: str | None = None, type: str | None = None, ai: bool = False, inputs: list[str] | None = None, outputs: list[str] | None = None):
    def decorator(func):
        append_metadata(func, "steps", {"id": id, "name": name, "description": description, "type": type, "ai": ai, "inputs": inputs, "outputs": outputs})
        return func
    return decorator


# -- Context decorators ------------------------------------------------------

# @docspec:intentional "Attach context metadata linking a class to a flow or artifact"
def doc_context(id: str, name: str | None = None, attached_to: str | None = None, flow: str | None = None):
    def decorator(cls):
        set_metadata(cls, "context", {"id": id, "name": name, "attachedTo": attached_to, "flow": flow})
        return cls
    return decorator


# @docspec:intentional "Declare a context input with source and optional item list"
def context_input(name: str, source: str | None = None, description: str | None = None, items: list[str] | None = None):
    def decorator(func_or_prop):
        append_metadata(func_or_prop, "contextInputs", {"name": name, "source": source, "description": description, "items": items})
        return func_or_prop
    return decorator


# @docspec:intentional "Declare a cross-reference to an artifact used in context"
def context_uses(artifact: str, what: str, why: str | None = None):
    def decorator(func_or_prop):
        append_metadata(func_or_prop, "contextUses", {"artifact": artifact, "what": what, "why": why})
        return func_or_prop
    return decorator


# -- Endpoint / Error / Event ------------------------------------------------

# @docspec:intentional "Attach endpoint metadata (HTTP method, path) to a handler function"
def doc_endpoint(method: str | None = None, path: str | None = None, description: str | None = None):
    def decorator(func):
        set_metadata(func, "endpoint", {"method": method, "path": path, "description": description})
        return func
    return decorator


# @docspec:intentional "Declare an error code with HTTP status, causes, and resolution"
def doc_error(code: str, http_status: int | None = None, description: str | None = None, causes: list[str] | None = None, resolution: str | None = None):
    def decorator(func):
        append_metadata(func, "errors", {"code": code, "httpStatus": http_status, "description": description, "causes": causes, "resolution": resolution})
        return func
    return decorator


# @docspec:intentional "Declare an event with trigger, channel, and delivery guarantee metadata"
def doc_event(name: str, description: str | None = None, trigger: str | None = None, channel: str | None = None, delivery_guarantee: str | None = None):
    def decorator(func):
        append_metadata(func, "events", {"name": name, "description": description, "trigger": trigger, "channel": channel, "deliveryGuarantee": delivery_guarantee})
        return func
    return decorator


# -- DSTI decorators ---------------------------------------------------------

# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Declare invariant rules that a method must preserve"
def doc_invariant(rules: list[str], description: str | None = None):
    def decorator(func):
        append_metadata(func, "invariants", {"rules": rules, "description": description})
        return func
    return decorator


# @docspec:intentional "Declare a monotonic property constraint on a field"
def doc_monotonic(field: str, direction: str = "increasing", description: str | None = None):
    def decorator(func):
        set_metadata(func, "monotonic", {"field": field, "direction": direction, "description": description})
        return func
    return decorator


# @docspec:intentional "Declare a conservation law constraint on a quantity within a scope"
def doc_conservation(quantity: str, scope: str | None = None, description: str | None = None):
    def decorator(func):
        set_metadata(func, "conservation", {"quantity": quantity, "scope": scope, "description": description})
        return func
    return decorator


# @docspec:intentional "Declare ordering strategy for a class (natural, field-based, or custom comparator)"
def doc_ordering(strategy: str = "natural", field: str | None = None, comparator: str | None = None):
    def decorator(cls):
        set_metadata(cls, "ordering", {"strategy": strategy, "field": field, "comparator": comparator})
        return cls
    return decorator


# @docspec:intentional "Declare an invariant property that the decorated function preserves"
def doc_preserves(property: str):
    def decorator(func):
        append_metadata(func, "preserves", property)
        return func
    return decorator


# @docspec:intentional "Declare comparison strategy and fields for a class"
def doc_compare(strategy: str = "natural", fields: list[str] | None = None):
    def decorator(cls):
        set_metadata(cls, "compare", {"strategy": strategy, "fields": fields})
        return cls
    return decorator


# @docspec:intentional "Declare a typed relationship between the decorated element and a target"
def doc_relation(type: str, target: str, via: str | None = None, description: str | None = None):
    def decorator(func_or_prop):
        append_metadata(func_or_prop, "relations", {"type": type, "target": target, "via": via, "description": description})
        return func_or_prop
    return decorator


# @docspec:intentional "Mark a function as a boundary with a specified type and description"
def doc_boundary(type: str, description: str | None = None):
    def decorator(func):
        set_metadata(func, "boundary", {"type": type, "description": description})
        return func
    return decorator


# @docspec:intentional "Declare state machine states and transitions for a class"
def doc_state_machine(states: list[str], transitions: list[str] | None = None):
    def decorator(cls):
        set_metadata(cls, "stateMachine", {"states": states, "transitions": transitions})
        return cls
    return decorator


# @docspec:intentional "Mark a function as idempotent (safe to call multiple times)"
def doc_idempotent(func=None):
    def decorator(f):
        set_metadata(f, "idempotent", True)
        return f
    if func is not None:
        return decorator(func)
    return decorator


# @docspec:intentional "Mark a function as deterministic (same inputs always produce same outputs)"
def doc_deterministic(func=None):
    def decorator(f):
        set_metadata(f, "deterministic", True)
        return f
    if func is not None:
        return decorator(func)
    return decorator


# @docspec:intentional "Attach an intentional description to a function for DSTI analysis"
def doc_intentional(intent: str):
    def decorator(func):
        set_metadata(func, "intentional", intent)
        return func
    return decorator


# -- Quality decorators ------------------------------------------------------

# @docspec:intentional "Exclude the decorated element from documentation output"
def doc_hidden(func_or_cls=None):
    def decorator(obj):
        set_metadata(obj, "hidden", True)
        return obj
    if func_or_cls is not None:
        return decorator(func_or_cls)
    return decorator


# @docspec:intentional "Set the target audience for the decorated class"
def doc_audience(audience: str):
    def decorator(cls):
        set_metadata(cls, "audience", audience)
        return cls
    return decorator


# @docspec:intentional "Attach searchable tags to the decorated element"
def doc_tags(*tags: str):
    def decorator(obj):
        set_metadata(obj, "tags", list(tags))
        return obj
    return decorator


# @docspec:intentional "Mark a field or function as optional with an optional reason"
def doc_optional(reason: str | None = None):
    def decorator(func_or_prop):
        set_metadata(func_or_prop, "optional", reason or True)
        return func_or_prop
    return decorator


# @docspec:intentional "Attach a code example to the decorated function"
def doc_example(code: str, title: str | None = None, language: str | None = None, verified: bool = False):
    def decorator(func):
        append_metadata(func, "examples", {"title": title, "language": language, "code": code, "verified": verified})
        return func
    return decorator


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Mark a field as containing PII data with GDPR and retention metadata"
def doc_pii(type: str, retention: str | None = None, gdpr_basis: str | None = None, encrypted: bool = False, never_log: bool = False, never_return: bool = False):
    def decorator(func_or_prop):
        set_metadata(func_or_prop, "pii", {"type": type, "retention": retention, "gdprBasis": gdpr_basis, "encrypted": encrypted, "neverLog": never_log, "neverReturn": never_return})
        return func_or_prop
    return decorator


# @docspec:intentional "Mark a field as sensitive with never-log semantics"
def doc_sensitive(reason: str | None = None):
    def decorator(func_or_prop):
        set_metadata(func_or_prop, "sensitive", reason or True)
        return func_or_prop
    return decorator


# @docspec:intentional "Declare performance expectations including latency and bottleneck info"
def doc_performance(expected_latency: str | None = None, bottleneck: str | None = None):
    def decorator(func):
        set_metadata(func, "performance", {"expectedLatency": expected_latency, "bottleneck": bottleneck})
        return func
    return decorator


# @docspec:intentional "Declare the testing strategy type for the decorated function"
def doc_test_strategy(type: str, description: str | None = None):
    def decorator(func):
        set_metadata(func, "testStrategy", {"type": type, "description": description})
        return func
    return decorator


# @docspec:intentional "Mark a function as skipped in test generation with an optional reason"
def doc_test_skip(reason: str | None = None):
    def decorator(func):
        set_metadata(func, "testSkip", reason or True)
        return func
    return decorator


# -- Protocol decorators -----------------------------------------------------

# @docspec:intentional "Declare AsyncAPI channel and operation metadata"
def doc_async_api(channel: str, operation: str | None = None):
    def decorator(cls):
        set_metadata(cls, "asyncApi", {"channel": channel, "operation": operation})
        return cls
    return decorator


# @docspec:intentional "Declare gRPC service and method metadata"
def doc_grpc(service: str | None = None, method: str | None = None):
    def decorator(func_or_cls):
        set_metadata(func_or_cls, "grpc", {"service": service, "method": method})
        return func_or_cls
    return decorator


# @docspec:intentional "Declare GraphQL type and field metadata"
def doc_graphql(type: str | None = None, field: str | None = None):
    def decorator(func_or_cls):
        set_metadata(func_or_cls, "graphql", {"type": type, "field": field})
        return func_or_cls
    return decorator


# @docspec:intentional "Declare WebSocket path and message types"
def doc_websocket(path: str | None = None, messages: list[str] | None = None):
    def decorator(func_or_cls):
        set_metadata(func_or_cls, "websocket", {"path": path, "messages": messages})
        return func_or_cls
    return decorator


# @docspec:intentional "Declare a CQRS command with name and optional aggregate"
def doc_command(name: str, aggregate: str | None = None):
    def decorator(func):
        set_metadata(func, "command", {"name": name, "aggregate": aggregate})
        return func
    return decorator


# -- Cross-reference decorators ----------------------------------------------

# @docspec:intentional "Declare a cross-reference to another artifact, flow, step, or member"
def doc_uses(artifact: str, flow: str | None = None, step: str | None = None, member: str | None = None, description: str | None = None):
    def decorator(func_or_cls):
        append_metadata(func_or_cls, "uses", {"artifact": artifact, "flow": flow, "step": step, "member": member, "description": description})
        return func_or_cls
    return decorator


# @docspec:intentional "Attach a specification example to a target artifact"
def doc_spec_example(attach_to: str, title: str | None = None):
    def decorator(func):
        set_metadata(func, "specExample", {"attachTo": attach_to, "title": title})
        return func
    return decorator
