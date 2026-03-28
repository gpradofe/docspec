"""Detect privacy / PII patterns in Python projects.

Targets:
  - ``@doc_pii`` decorator (DocSpec native)
  - ``@doc_sensitive`` decorator (DocSpec native)
  - Field name heuristics: ``email``, ``ssn``, ``phone``, ``address``, etc.
"""
# @docspec:module {
#   id: "docspec-py-privacy-extractor",
#   name: "Privacy Extractor",
#   description: "Detects PII fields via @doc_pii/@doc_sensitive decorators and field-name heuristics (email, SSN, phone, address, etc.), extracting privacy metadata with GDPR context.",
#   since: "3.0.0"
# }
from __future__ import annotations

import ast
import re
from typing import Any

from docspec_processor.extractor.extractor_interface import DocSpecExtractor, ExtractionContext

# Field name patterns that commonly hold PII
_PII_FIELD_PATTERNS: dict[str, str] = {
    r"(?i)email": "email",
    r"(?i)phone": "phone",
    r"(?i)ssn|social.?security": "government-id",
    r"(?i)passport": "government-id",
    r"(?i)tax.?id|tin": "government-id",
    r"(?i)credit.?card|card.?number": "financial",
    r"(?i)iban|account.?number": "financial",
    r"(?i)address|street|zip.?code|postal": "address",
    r"(?i)date.?of.?birth|dob|birth.?date": "date-of-birth",
    r"(?i)first.?name|last.?name|full.?name|surname": "name",
    r"(?i)ip.?addr": "ip-address",
    r"(?i)password|passwd|secret|token": "credential",
}


# @docspec:boundary "PII field detection and privacy metadata extraction"
class PrivacyExtractor(DocSpecExtractor):
    """Extracts privacy / PII metadata from decorators and field-name heuristics."""

    # @docspec:deterministic
    def extractor_name(self) -> str:
        return "privacy"

    # @docspec:intentional "Check if doc_pii/doc_sensitive decorators or common PII field names are present in the source"
    def is_available(self, context: ExtractionContext) -> bool:
        for item in context.sources:
            source: str = item["source"]
            if "doc_pii" in source or "doc_sensitive" in source:
                return True
            # Also enable if we find common PII field names in type-annotated classes
            if "email" in source.lower() or "password" in source.lower():
                return True
        return False

    # @docspec:intentional "Extract PII fields from doc_pii/doc_sensitive decorators and field-name heuristics"
    def extract(self, context: ExtractionContext) -> None:
        privacy_fields: list[dict[str, Any]] = []

        for item in context.sources:
            try:
                tree = ast.parse(item["source"])
            except SyntaxError:
                continue
            prefix = item["qualified_prefix"]

            for node in ast.walk(tree):
                if not isinstance(node, ast.ClassDef):
                    continue

                qualified = f"{prefix}.{node.name}"

                for stmt in node.body:
                    # --- Decorated fields via @doc_pii / @doc_sensitive ---
                    if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        pf = self._extract_from_decorator(stmt, qualified)
                        if pf:
                            privacy_fields.append(pf)

                    # --- Annotated assignments (class fields) ---
                    if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
                        field_name = stmt.target.id
                        pii_type = self._match_pii_pattern(field_name)
                        if pii_type:
                            privacy_fields.append({
                                "field": f"{qualified}.{field_name}",
                                "piiType": pii_type,
                                "detectedBy": "heuristic",
                            })

                    # --- Regular assignments ---
                    if isinstance(stmt, ast.Assign):
                        for target in stmt.targets:
                            if isinstance(target, ast.Name):
                                pii_type = self._match_pii_pattern(target.id)
                                if pii_type:
                                    privacy_fields.append({
                                        "field": f"{qualified}.{target.id}",
                                        "piiType": pii_type,
                                        "detectedBy": "heuristic",
                                    })

        if not privacy_fields:
            return

        existing: list[dict] = context.model.setdefault("privacy", [])
        # Deduplicate by field path
        existing_fields = {pf["field"] for pf in existing}
        for pf in privacy_fields:
            if pf["field"] not in existing_fields:
                existing.append(pf)
                existing_fields.add(pf["field"])

    # ------------------------------------------------------------------
    # Decorator extraction
    # ------------------------------------------------------------------

    # @docspec:intentional "Extract PII metadata from @doc_pii and @doc_sensitive decorator keyword arguments"
    def _extract_from_decorator(
        self, node: ast.FunctionDef | ast.AsyncFunctionDef, parent_qualified: str
    ) -> dict[str, Any] | None:
        """Look for ``@doc_pii(...)`` or ``@doc_sensitive`` on a method/property."""
        for dec in node.decorator_list:
            dec_name = self._decorator_name(dec)
            if dec_name == "doc_pii":
                pf: dict[str, Any] = {
                    "field": f"{parent_qualified}.{node.name}",
                    "detectedBy": "@doc_pii",
                }
                # Extract keyword args
                if isinstance(dec, ast.Call):
                    for kw in dec.keywords:
                        if kw.arg and isinstance(kw.value, ast.Constant):
                            if kw.arg == "value":
                                pf["piiType"] = kw.value.value
                            elif kw.arg == "retention":
                                pf["retention"] = kw.value.value
                            elif kw.arg == "gdpr_basis":
                                pf["gdprBasis"] = kw.value.value
                            elif kw.arg == "encrypted":
                                pf["encrypted"] = kw.value.value
                            elif kw.arg == "never_log":
                                pf["neverLog"] = kw.value.value
                            elif kw.arg == "never_return":
                                pf["neverReturn"] = kw.value.value
                    # First positional arg = pii type
                    if dec.args and isinstance(dec.args[0], ast.Constant):
                        pf.setdefault("piiType", dec.args[0].value)
                pf.setdefault("piiType", "other")
                return pf

            if dec_name == "doc_sensitive":
                return {
                    "field": f"{parent_qualified}.{node.name}",
                    "piiType": "other",
                    "neverLog": True,
                    "detectedBy": "@doc_sensitive",
                }
        return None

    # ------------------------------------------------------------------
    # Heuristic PII matching
    # ------------------------------------------------------------------

    # @docspec:deterministic
    @staticmethod
    def _match_pii_pattern(field_name: str) -> str | None:
        """Return PII type if *field_name* matches a known pattern, else ``None``."""
        for pattern, pii_type in _PII_FIELD_PATTERNS.items():
            if re.search(pattern, field_name):
                return pii_type
        return None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

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
