"""Analyze function/method names to extract semantic intent.

Mirrors the Java ``NamingAnalyzer``: splits names by underscore (Python
convention) or camelCase, identifies verb prefixes, and maps them to
intent categories.
"""
# @docspec:module {
#   id: "docspec-py-naming-analyzer",
#   name: "Naming Analyzer",
#   description: "Decomposes Python function names into verb-object-intent triples using snake_case and camelCase conventions, mapping verb prefixes to semantic intent categories.",
#   since: "3.0.0"
# }
from __future__ import annotations

import re
from dataclasses import dataclass


# @docspec:boundary "Immutable semantic decomposition of a function name"
@dataclass(frozen=True)
class NameSemantics:
    """Semantic decomposition of a function name."""

    verb: str
    """The leading verb prefix (e.g. ``get``, ``create``, ``validate``)."""

    object: str
    """The rest of the name after the verb, space-separated."""

    intent: str
    """Semantic intent category (e.g. ``query``, ``mutation``, ``creation``)."""


# Verb prefixes, ordered longest-first where needed.
_VERBS: list[str] = [
    "get", "set", "is", "has", "find", "create", "delete", "remove",
    "update", "save", "add", "validate", "check", "compute", "calculate",
    "process", "handle", "convert", "transform", "parse", "format",
    "build", "generate", "initialize", "init", "load", "fetch",
    "send", "receive", "publish", "subscribe", "notify", "dispatch",
    "sync", "migrate", "schedule", "retry", "batch",
    "aggregate", "merge", "split", "emit", "enrich", "filter",
    "list", "count", "search", "query", "lookup", "resolve",
    "register", "unregister", "start", "stop", "open", "close",
    "read", "write", "flush", "reset", "clear", "clean",
    "encode", "decode", "encrypt", "decrypt", "sign", "verify",
    "assert",
]

_INTENT_MAP: dict[str, str] = {
    "get": "query", "find": "query", "fetch": "query", "load": "query",
    "is": "query", "has": "query", "list": "query", "count": "query",
    "search": "query", "query": "query", "lookup": "query", "resolve": "query",
    "read": "query",

    "set": "mutation", "update": "mutation", "save": "mutation", "add": "mutation",
    "write": "mutation",

    "create": "creation", "build": "creation", "generate": "creation",
    "initialize": "creation", "init": "creation", "register": "creation",
    "open": "creation",

    "delete": "deletion", "remove": "deletion", "unregister": "deletion",
    "close": "deletion", "clear": "deletion", "clean": "deletion",

    "validate": "validation", "check": "validation", "verify": "validation",
    "assert": "validation",

    "compute": "computation", "calculate": "computation", "process": "computation",

    "convert": "transformation", "transform": "transformation",
    "parse": "transformation", "format": "transformation",
    "encode": "transformation", "decode": "transformation",
    "encrypt": "transformation", "decrypt": "transformation",
    "sign": "transformation",

    "handle": "handler", "dispatch": "handler",

    "send": "emission", "emit": "emission", "publish": "emission",
    "notify": "emission",

    "receive": "consumption", "subscribe": "consumption",

    "sync": "synchronization",
    "migrate": "migration",
    "schedule": "scheduling",
    "retry": "retry",
    "batch": "batch-process",
    "aggregate": "aggregation",
    "merge": "merge",
    "split": "split",
    "enrich": "enrichment",
    "filter": "filter",
    "start": "lifecycle",
    "stop": "lifecycle",
    "flush": "lifecycle",
    "reset": "lifecycle",
}


# @docspec:boundary "Name-to-intent semantic mapping"
class NamingAnalyzer:
    """Analyze Python function names (snake_case convention) for semantic intent.

    Usage::

        analyzer = NamingAnalyzer()
        result = analyzer.analyze("get_user_by_email")
        # NameSemantics(verb="get", object="user by email", intent="query")
    """

    # @docspec:method { since: "3.0.0" }
    # @docspec:deterministic
    # @docspec:intentional "Parse a function name into verb, object, and intent category"
    # @docspec:preserves "Always returns a valid NameSemantics, never None"
    def analyze(self, name: str) -> NameSemantics:
        """Split *name* into verb, object, and intent category.

        Handles both ``snake_case`` (preferred in Python) and ``camelCase``.
        """
        # Normalize: convert camelCase to snake_case first
        normalized = re.sub(r"([a-z])([A-Z])", r"\1_\2", name).lower()
        parts = [p for p in normalized.split("_") if p]

        if not parts:
            return NameSemantics(verb=name, object="", intent="unknown")

        # Try greedy match: check 2-word verb, then 1-word verb
        if len(parts) >= 2:
            two_word = f"{parts[0]}_{parts[1]}"
            # Treat e.g. "is_valid" specially
            if two_word in _INTENT_MAP:
                verb = two_word
                obj = " ".join(parts[2:])
                return NameSemantics(verb=verb, object=obj, intent=_INTENT_MAP[verb])

        first = parts[0]
        if first in _INTENT_MAP:
            verb = first
            obj = " ".join(parts[1:])
            return NameSemantics(verb=verb, object=obj, intent=_INTENT_MAP[verb])

        # Prefix match against the verb list (e.g. "getUser" after camelCase normalization)
        for v in _VERBS:
            if first.startswith(v) and len(first) > len(v):
                obj_parts = [first[len(v):]] + parts[1:]
                return NameSemantics(verb=v, object=" ".join(obj_parts), intent=_INTENT_MAP.get(v, "unknown"))

        # Fallback: entire name is the verb
        return NameSemantics(verb=normalized, object="", intent="unknown")
