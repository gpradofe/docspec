"""Detect error and event patterns in Python projects.

Targets:
  - ``raise`` statements with custom exception classes
  - Django/Flask signals: ``signal.send``, ``signal.connect``
  - Blinker signals
  - Custom event emitter patterns (``emit``, ``dispatch``, ``publish``)
"""
# @docspec:module {
#   id: "docspec-py-error-event-extractor",
#   name: "Error and Event Extractor",
#   description: "Extracts error catalogs from custom exception classes and raise statements, plus event catalogs from signal declarations, emission, and subscription patterns.",
#   since: "3.0.0"
# }
from __future__ import annotations

import ast
from typing import Any

from docspec_processor.extractor.extractor_interface import DocSpecExtractor, ExtractionContext

# Method names that indicate event emission
_EVENT_EMIT_METHODS: set[str] = {
    "emit", "send", "dispatch", "publish", "fire", "trigger",
    "send_robust", "notify",
}

# Method names that indicate event subscription
_EVENT_SUBSCRIBE_METHODS: set[str] = {
    "connect", "subscribe", "on", "listen", "add_listener",
    "register_handler", "register",
}


# @docspec:boundary "Error catalog and event catalog extraction from Python source"
class ErrorEventExtractor(DocSpecExtractor):
    """Extracts error catalog and event catalog from source code."""

    # @docspec:deterministic
    def extractor_name(self) -> str:
        return "error-event"

    # @docspec:deterministic
    def is_available(self, context: ExtractionContext) -> bool:
        # Errors and events exist in virtually every Python project
        return True

    # @docspec:intentional "Extract error catalog from exception classes and event catalog from signal patterns"
    def extract(self, context: ExtractionContext) -> None:
        errors: list[dict[str, Any]] = []
        events: list[dict[str, Any]] = []

        for item in context.sources:
            try:
                tree = ast.parse(item["source"])
            except SyntaxError:
                continue
            prefix = item["qualified_prefix"]

            # --- Custom exception classes ---
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef) and self._is_exception_class(node):
                    error_entry = self._extract_error_class(node, prefix)
                    errors.append(error_entry)

            # --- Raise statements ---
            for node in ast.walk(tree):
                if isinstance(node, ast.Raise) and node.exc is not None:
                    error_ref = self._extract_raise(node, prefix)
                    if error_ref:
                        # Merge with existing error or create new
                        self._merge_raise(errors, error_ref)

            # --- Event emission / subscription ---
            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    event = self._extract_event_call(node, prefix)
                    if event:
                        events.append(event)

                # --- Signal object declarations ---
                if isinstance(node, ast.Assign):
                    event = self._extract_signal_declaration(node, prefix)
                    if event:
                        events.append(event)

        if errors:
            # Deduplicate by name
            seen: set[str] = set()
            unique_errors: list[dict] = []
            existing_errors: list[dict] = context.model.get("errors", [])
            for e in existing_errors:
                seen.add(e["name"])
                unique_errors.append(e)
            for e in errors:
                if e["name"] not in seen:
                    unique_errors.append(e)
                    seen.add(e["name"])
            context.model["errors"] = unique_errors

        if events:
            seen_events: set[str] = set()
            unique_events: list[dict] = []
            existing_events: list[dict] = context.model.get("events", [])
            for ev in existing_events:
                seen_events.add(ev["name"])
                unique_events.append(ev)
            for ev in events:
                if ev["name"] not in seen_events:
                    unique_events.append(ev)
                    seen_events.add(ev["name"])
            context.model["events"] = unique_events

    # ------------------------------------------------------------------
    # Error extraction
    # ------------------------------------------------------------------

    # @docspec:deterministic
    @staticmethod
    def _is_exception_class(node: ast.ClassDef) -> bool:
        """Check if *node* inherits from an Exception-like base."""
        exception_bases = {
            "Exception", "BaseException", "ValueError", "TypeError",
            "RuntimeError", "KeyError", "IOError", "OSError",
            "AttributeError", "NotImplementedError", "PermissionError",
            "HTTPException", "APIException", "ValidationError",
        }
        for base in node.bases:
            name = ""
            if isinstance(base, ast.Name):
                name = base.id
            elif isinstance(base, ast.Attribute):
                name = base.attr
            if name in exception_bases or name.endswith("Error") or name.endswith("Exception"):
                return True
        return False

    # @docspec:deterministic
    @staticmethod
    def _extract_error_class(node: ast.ClassDef, prefix: str) -> dict[str, Any]:
        qualified = f"{prefix}.{node.name}"
        docstring = ast.get_docstring(node)
        description = docstring.split("\n")[0].strip() if docstring else None

        # Try to extract HTTP status code from class body
        status_code: int | None = None
        for stmt in node.body:
            if isinstance(stmt, ast.Assign):
                for target in stmt.targets:
                    if isinstance(target, ast.Name) and target.id in ("status_code", "code", "http_status"):
                        if isinstance(stmt.value, ast.Constant) and isinstance(stmt.value.value, int):
                            status_code = stmt.value.value

        error: dict[str, Any] = {
            "name": node.name,
            "qualified": qualified,
        }
        if description:
            error["description"] = description
        if status_code is not None:
            error["statusCode"] = status_code

        # Determine base class name
        if node.bases:
            base = node.bases[0]
            if isinstance(base, ast.Name):
                error["extends"] = base.id
            elif isinstance(base, ast.Attribute):
                error["extends"] = base.attr

        return error

    # @docspec:deterministic
    @staticmethod
    def _extract_raise(node: ast.Raise, prefix: str) -> dict[str, Any] | None:
        """Extract the exception class name from a ``raise`` statement."""
        exc = node.exc
        name: str | None = None

        if isinstance(exc, ast.Call):
            if isinstance(exc.func, ast.Name):
                name = exc.func.id
            elif isinstance(exc.func, ast.Attribute):
                name = exc.func.attr
        elif isinstance(exc, ast.Name):
            name = exc.id

        if name is None:
            return None

        return {
            "name": name,
            "raisedBy": [prefix],
        }

    # @docspec:preserves "No duplicates in the error list"
    @staticmethod
    def _merge_raise(errors: list[dict], raise_ref: dict) -> None:
        """Merge a raise reference into the error list."""
        for error in errors:
            if error["name"] == raise_ref["name"]:
                raised_by = error.setdefault("raisedBy", [])
                for loc in raise_ref.get("raisedBy", []):
                    if loc not in raised_by:
                        raised_by.append(loc)
                return
        # Not found — add as a new entry
        errors.append(raise_ref)

    # ------------------------------------------------------------------
    # Event extraction
    # ------------------------------------------------------------------

    # @docspec:intentional "Detect event emission and subscription calls from method names"
    def _extract_event_call(self, node: ast.Call, prefix: str) -> dict[str, Any] | None:
        """Detect event emission/subscription calls."""
        func = node.func
        method_name: str | None = None
        obj_name: str | None = None

        if isinstance(func, ast.Attribute):
            method_name = func.attr
            if isinstance(func.value, ast.Name):
                obj_name = func.value.id

        if method_name is None:
            return None

        event: dict[str, Any] | None = None

        if method_name in _EVENT_EMIT_METHODS:
            event_name = self._extract_event_name(node) or f"{obj_name or 'unknown'}.{method_name}"
            event = {
                "name": event_name,
                "type": "emission",
                "emittedBy": [prefix],
            }
        elif method_name in _EVENT_SUBSCRIBE_METHODS:
            event_name = self._extract_event_name(node) or f"{obj_name or 'unknown'}.{method_name}"
            event = {
                "name": event_name,
                "type": "subscription",
                "subscribedBy": [prefix],
            }

        return event

    # @docspec:intentional "Detect signal object declarations like Signal() or Event()"
    def _extract_signal_declaration(self, node: ast.Assign, prefix: str) -> dict[str, Any] | None:
        """Detect ``my_signal = Signal()`` or ``post_save = django.dispatch.Signal()``."""
        if not isinstance(node.value, ast.Call):
            return None

        func = node.value.func
        func_name: str | None = None
        if isinstance(func, ast.Name):
            func_name = func.id
        elif isinstance(func, ast.Attribute):
            func_name = func.attr

        if func_name not in ("Signal", "signal", "Event"):
            return None

        # Variable name is the signal/event name
        if not node.targets or not isinstance(node.targets[0], ast.Name):
            return None

        signal_name = node.targets[0].id
        return {
            "name": signal_name,
            "type": "signal",
            "declaredIn": prefix,
        }

    # @docspec:deterministic
    @staticmethod
    def _extract_event_name(node: ast.Call) -> str | None:
        """Extract event name from first string positional arg."""
        if node.args:
            first = node.args[0]
            if isinstance(first, ast.Constant) and isinstance(first.value, str):
                return first.value
        # Check sender= keyword for Django signals
        for kw in node.keywords:
            if kw.arg == "sender" and isinstance(kw.value, ast.Name):
                return kw.value.id
        return None
