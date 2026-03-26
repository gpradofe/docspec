"""Metadata storage for DocSpec decorators.

Low-level storage layer that attaches structured documentation data to Python
objects via a ``__docspec__`` attribute dictionary. All DocSpec decorators delegate
to ``set_metadata`` / ``append_metadata`` to persist annotation values, and the
processor reads them back via ``get_metadata`` / ``get_docspec_metadata`` during
the extraction pipeline.
"""
from typing import Any

# ---------------------------------------------------------------------------
# Module-level self-documentation (DocSpec documents itself)
# ---------------------------------------------------------------------------
_MODULE_META = {
    "docspec:module": {
        "id": "docspec-py-metadata",
        "name": "DocSpec Python Metadata Store",
        "description": (
            "Attribute-based metadata storage for DocSpec decorators. "
            "Stores and retrieves documentation metadata on any Python object "
            "using the __docspec__ dunder attribute."
        ),
        "since": "3.0.0",
    },
    "docspec:boundary": "metadata storage",
    "docspec:tags": ["self-documented", "metadata", "python"],
}

DOCSPEC_ATTR = "__docspec__"


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Store a documentation metadata key-value pair on a Python object"
def set_metadata(obj: Any, key: str, value: Any) -> None:
    if not hasattr(obj, DOCSPEC_ATTR):
        setattr(obj, DOCSPEC_ATTR, {})
    getattr(obj, DOCSPEC_ATTR)[key] = value


# @docspec:method { since: "3.0.0" }
# @docspec:deterministic
# @docspec:intentional "Retrieve a single documentation metadata value by key from a Python object"
def get_metadata(obj: Any, key: str) -> Any | None:
    meta = getattr(obj, DOCSPEC_ATTR, {})
    return meta.get(key)


# @docspec:method { since: "3.0.0" }
# @docspec:intentional "Append a documentation metadata value to a list under the given key"
def append_metadata(obj: Any, key: str, value: Any) -> None:
    if not hasattr(obj, DOCSPEC_ATTR):
        setattr(obj, DOCSPEC_ATTR, {})
    meta = getattr(obj, DOCSPEC_ATTR)
    if key not in meta:
        meta[key] = []
    meta[key].append(value)


# @docspec:method { since: "3.0.0" }
# @docspec:deterministic
# @docspec:intentional "Retrieve the complete __docspec__ metadata dictionary from a Python object"
def get_docspec_metadata(obj: Any) -> dict[str, Any]:
    return getattr(obj, DOCSPEC_ATTR, {})
