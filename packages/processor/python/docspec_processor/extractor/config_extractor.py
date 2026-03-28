"""Detect configuration patterns in Python projects.

Targets:
  - python-decouple: ``config("KEY", default=..., cast=int)``
  - pydantic ``BaseSettings`` subclasses with ``Field(...)``
  - ``os.environ`` / ``os.getenv`` calls
  - dotenv ``load_dotenv`` usage
"""
# @docspec:module {
#   id: "docspec-py-config-extractor",
#   name: "Configuration Extractor",
#   description: "Detects configuration access patterns (decouple, pydantic BaseSettings, os.environ, dotenv) and extracts property keys, types, defaults, and usage locations.",
#   since: "3.0.0"
# }
from __future__ import annotations

import ast
import re
from typing import Any

from docspec_processor.extractor.extractor_interface import DocSpecExtractor, ExtractionContext

# Import patterns that signal config frameworks
_CONFIG_IMPORTS: list[str] = [
    "decouple",
    "pydantic_settings",
    "pydantic.BaseSettings",
    "dotenv",
    "environ",
    "dynaconf",
]


# @docspec:boundary "Configuration property detection and extraction from Python source"
class ConfigExtractor(DocSpecExtractor):
    """Extracts configuration properties from source code."""

    # @docspec:deterministic
    def extractor_name(self) -> str:
        return "configuration"

    # @docspec:intentional "Check if any configuration framework imports are present in the source"
    def is_available(self, context: ExtractionContext) -> bool:
        for item in context.sources:
            source: str = item["source"]
            for imp in _CONFIG_IMPORTS:
                if imp in source:
                    return True
            # os.environ / os.getenv is always available
            if "os.environ" in source or "os.getenv" in source:
                return True
        return False

    # @docspec:intentional "Extract configuration properties from pydantic BaseSettings, decouple, and os.environ patterns"
    def extract(self, context: ExtractionContext) -> None:
        properties: list[dict[str, Any]] = []

        for item in context.sources:
            try:
                tree = ast.parse(item["source"])
            except SyntaxError:
                continue
            prefix = item["qualified_prefix"]

            # Walk entire tree looking for config access patterns
            for node in ast.walk(tree):
                # --- pydantic BaseSettings fields ---
                if isinstance(node, ast.ClassDef) and self._is_settings_class(node):
                    properties.extend(self._extract_settings_fields(node, prefix))

                # --- decouple config() / os.getenv / os.environ ---
                if isinstance(node, ast.Call):
                    prop = self._extract_config_call(node, prefix)
                    if prop:
                        properties.append(prop)

        if not properties:
            return

        existing: list[dict] = context.model.setdefault("configuration", [])
        existing.extend(properties)

    # ------------------------------------------------------------------
    # Pydantic BaseSettings
    # ------------------------------------------------------------------

    # @docspec:deterministic
    @staticmethod
    def _is_settings_class(node: ast.ClassDef) -> bool:
        for base in node.bases:
            name = ""
            if isinstance(base, ast.Name):
                name = base.id
            elif isinstance(base, ast.Attribute):
                name = base.attr
            if name in ("BaseSettings", "Settings"):
                return True
        return False

    # @docspec:intentional "Extract field names, types, and defaults from a pydantic BaseSettings class body"
    def _extract_settings_fields(self, cls_node: ast.ClassDef, prefix: str) -> list[dict[str, Any]]:
        props: list[dict[str, Any]] = []
        qualified = f"{prefix}.{cls_node.name}"

        for stmt in cls_node.body:
            if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
                field_name = stmt.target.id
                field_type = ast.unparse(stmt.annotation) if stmt.annotation else "Any"
                # Convert snake_case field name to dotted config key
                key = self._snake_to_dotted(cls_node.name, field_name)

                prop: dict[str, Any] = {
                    "key": key,
                    "type": field_type,
                    "source": "BaseSettings",
                    "usedBy": [qualified],
                }

                # Extract default value
                if stmt.value is not None:
                    default = self._extract_default(stmt.value)
                    if default is not None:
                        prop["defaultValue"] = default

                props.append(prop)
        return props

    # ------------------------------------------------------------------
    # decouple / os.getenv / os.environ
    # ------------------------------------------------------------------

    # @docspec:intentional "Classify and dispatch config access calls to decouple, os.getenv, or os.environ handlers"
    def _extract_config_call(self, node: ast.Call, prefix: str) -> dict[str, Any] | None:
        func_name = self._call_name(node)
        if func_name is None:
            return None

        if func_name in ("config", "Config"):
            return self._extract_decouple_call(node, prefix)
        if func_name in ("getenv", "os.getenv"):
            return self._extract_getenv_call(node, prefix)
        if func_name == "get" and self._is_environ_get(node):
            return self._extract_environ_get(node, prefix)
        return None

    # @docspec:deterministic
    def _extract_decouple_call(self, node: ast.Call, prefix: str) -> dict[str, Any] | None:
        if not node.args:
            return None
        first_arg = node.args[0]
        if not isinstance(first_arg, ast.Constant) or not isinstance(first_arg.value, str):
            return None

        key = first_arg.value
        prop: dict[str, Any] = {"key": key, "source": "decouple", "usedBy": [prefix]}

        for kw in node.keywords:
            if kw.arg == "default" and isinstance(kw.value, ast.Constant):
                prop["defaultValue"] = str(kw.value.value)
            if kw.arg == "cast" and isinstance(kw.value, ast.Name):
                prop["type"] = kw.value.id
        return prop

    # @docspec:deterministic
    def _extract_getenv_call(self, node: ast.Call, prefix: str) -> dict[str, Any] | None:
        if not node.args:
            return None
        first_arg = node.args[0]
        if not isinstance(first_arg, ast.Constant) or not isinstance(first_arg.value, str):
            return None

        key = first_arg.value
        prop: dict[str, Any] = {"key": key, "source": "os.getenv", "usedBy": [prefix]}

        if len(node.args) > 1 and isinstance(node.args[1], ast.Constant):
            prop["defaultValue"] = str(node.args[1].value)

        return prop

    # @docspec:deterministic
    def _extract_environ_get(self, node: ast.Call, prefix: str) -> dict[str, Any] | None:
        if not node.args:
            return None
        first_arg = node.args[0]
        if not isinstance(first_arg, ast.Constant) or not isinstance(first_arg.value, str):
            return None

        key = first_arg.value
        prop: dict[str, Any] = {"key": key, "source": "os.environ", "usedBy": [prefix]}

        if len(node.args) > 1 and isinstance(node.args[1], ast.Constant):
            prop["defaultValue"] = str(node.args[1].value)

        return prop

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    # @docspec:deterministic
    @staticmethod
    def _call_name(node: ast.Call) -> str | None:
        func = node.func
        if isinstance(func, ast.Name):
            return func.id
        if isinstance(func, ast.Attribute):
            if isinstance(func.value, ast.Name):
                return f"{func.value.id}.{func.attr}"
            return func.attr
        return None

    # @docspec:deterministic
    @staticmethod
    def _is_environ_get(node: ast.Call) -> bool:
        """Check whether *node* is ``os.environ.get(...)``."""
        func = node.func
        if isinstance(func, ast.Attribute) and func.attr == "get":
            val = func.value
            if isinstance(val, ast.Attribute) and val.attr == "environ":
                if isinstance(val.value, ast.Name) and val.value.id == "os":
                    return True
        return False

    # @docspec:deterministic
    @staticmethod
    def _extract_default(node: ast.expr) -> str | None:
        """Extract a literal default value from an assignment RHS or Field(default=...)."""
        if isinstance(node, ast.Constant):
            return str(node.value)
        if isinstance(node, ast.Call):
            for kw in node.keywords:
                if kw.arg == "default" and isinstance(kw.value, ast.Constant):
                    return str(kw.value.value)
        return None

    # @docspec:deterministic
    @staticmethod
    def _snake_to_dotted(class_name: str, field_name: str) -> str:
        """Convert ``AppSettings.database_url`` to ``app-settings.database-url``."""
        prefix = re.sub(r"([a-z])([A-Z])", r"\1-\2", class_name).lower()
        key = field_name.replace("_", "-")
        return f"{prefix}.{key}"
