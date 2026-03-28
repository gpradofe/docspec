"""Detect security patterns in Python projects.

Targets:
  - Flask-Login: ``@login_required``
  - Django auth: ``@login_required``, ``@permission_required``
  - Custom decorators: ``@requires_role``, ``@requires_permission``
  - Direct decorator inspection via AST
"""
# @docspec:module {
#   id: "docspec-py-security-extractor",
#   name: "Security Extractor",
#   description: "Detects security decorators (login_required, permission_required, requires_role, jwt_required) and extracts roles, endpoint protection rules, and access control metadata.",
#   since: "3.0.0"
# }
from __future__ import annotations

import ast
import re
from typing import Any

from docspec_processor.extractor.extractor_interface import DocSpecExtractor, ExtractionContext

# Decorator names we recognise as security-related
_SECURITY_DECORATORS: set[str] = {
    "login_required",
    "permission_required",
    "requires_role",
    "requires_permission",
    "requires_auth",
    "authenticated",
    "admin_required",
    "staff_required",
    "jwt_required",
    "token_required",
}

# Import patterns that signal security frameworks
_SECURITY_IMPORTS: list[str] = [
    "flask_login",
    "flask_jwt_extended",
    "flask_httpauth",
    "django.contrib.auth",
    "rest_framework.permissions",
    "rest_framework.decorators",
    "fastapi.security",
    "starlette.authentication",
]


# @docspec:boundary "Security decorator detection and access control extraction"
class SecurityExtractor(DocSpecExtractor):
    """Extracts security metadata from decorator usage and import analysis."""

    # @docspec:deterministic
    def extractor_name(self) -> str:
        return "security"

    # @docspec:intentional "Check if any security framework imports are present in the source"
    def is_available(self, context: ExtractionContext) -> bool:
        for item in context.sources:
            source: str = item["source"]
            for imp in _SECURITY_IMPORTS:
                if imp in source:
                    return True
        return False

    # @docspec:intentional "Extract security roles and endpoint protection rules from security decorator usage"
    def extract(self, context: ExtractionContext) -> None:
        roles: set[str] = set()
        endpoints: list[dict[str, Any]] = []

        for item in context.sources:
            try:
                tree = ast.parse(item["source"])
            except SyntaxError:
                continue
            prefix = item["qualified_prefix"]
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    rules = self._extract_security_rules(node)
                    if rules:
                        qualified = f"{prefix}.{node.name}"
                        for rule in rules:
                            extracted_roles = self._extract_roles_from_rule(rule)
                            roles.update(extracted_roles)
                        endpoints.append({
                            "path": qualified,
                            "rules": rules,
                            "public": False,
                        })

        if not endpoints:
            return

        security = context.model.setdefault("security", {})
        existing_roles: list[str] = security.get("roles", [])
        merged_roles = sorted(set(existing_roles) | roles)
        security["roles"] = merged_roles
        existing_endpoints: list[dict] = security.get("endpoints", [])
        existing_endpoints.extend(endpoints)
        security["endpoints"] = existing_endpoints

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    # @docspec:intentional "Collect security rule strings from recognized security decorators on a function"
    def _extract_security_rules(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[str]:
        """Return a list of security rule strings found on *node*."""
        rules: list[str] = []
        for decorator in node.decorator_list:
            name = self._decorator_name(decorator)
            if name is None:
                continue
            if name in _SECURITY_DECORATORS:
                args = self._decorator_args(decorator)
                if args:
                    rules.append(f"{name}({', '.join(args)})")
                else:
                    rules.append(name)
        return rules

    # @docspec:deterministic
    @staticmethod
    def _decorator_name(decorator: ast.expr) -> str | None:
        if isinstance(decorator, ast.Name):
            return decorator.id
        if isinstance(decorator, ast.Attribute):
            return decorator.attr
        if isinstance(decorator, ast.Call):
            func = decorator.func
            if isinstance(func, ast.Name):
                return func.id
            if isinstance(func, ast.Attribute):
                return func.attr
        return None

    # @docspec:deterministic
    @staticmethod
    def _decorator_args(decorator: ast.expr) -> list[str]:
        if not isinstance(decorator, ast.Call):
            return []
        args: list[str] = []
        for arg in decorator.args:
            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                args.append(arg.value)
        for kw in decorator.keywords:
            if kw.arg and isinstance(kw.value, ast.Constant):
                args.append(f"{kw.arg}={kw.value.value!r}")
        return args

    # @docspec:deterministic
    @staticmethod
    def _extract_roles_from_rule(rule: str) -> list[str]:
        """Pull role names out of rule strings like ``requires_role('admin')``."""
        roles: list[str] = []
        for match in re.finditer(r"'([^']+)'", rule):
            value = match.group(1)
            # Strip common ROLE_ prefix like Java counterpart
            if value.startswith("ROLE_"):
                value = value[5:]
            roles.append(value)
        return roles
