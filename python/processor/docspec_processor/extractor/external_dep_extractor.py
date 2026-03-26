"""Detect external HTTP dependency patterns in Python projects.

Targets:
  - requests: ``requests.get/post/put/delete``
  - httpx: ``httpx.Client``, ``httpx.AsyncClient``
  - urllib3 / urllib: direct HTTP calls
  - aiohttp: ``aiohttp.ClientSession``
"""
# @docspec:module {
#   id: "docspec-py-external-dep-extractor",
#   name: "External Dependency Extractor",
#   description: "Detects HTTP client usage (requests, httpx, aiohttp, urllib, gRPC, SOAP) and extracts external service dependencies with endpoint methods, URLs, and usage locations.",
#   since: "3.0.0"
# }
from __future__ import annotations

import ast
import re
from typing import Any

from docspec_processor.extractor.extractor_interface import DocSpecExtractor, ExtractionContext

# Import patterns that signal HTTP client frameworks
_HTTP_IMPORTS: list[str] = [
    "requests",
    "httpx",
    "aiohttp",
    "urllib3",
    "urllib.request",
    "grpc",
    "zeep",  # SOAP
]

# Method names that indicate HTTP calls
_HTTP_METHODS: set[str] = {
    "get", "post", "put", "patch", "delete", "head", "options", "request",
}

# Attribute names that indicate an HTTP client
_CLIENT_ATTRS: set[str] = {
    "Client", "AsyncClient", "ClientSession", "Session",
}


# @docspec:boundary "External HTTP/RPC dependency detection and extraction"
class ExternalDepExtractor(DocSpecExtractor):
    """Extracts external service dependency metadata from source code."""

    # @docspec:deterministic
    def extractor_name(self) -> str:
        return "external-dependency"

    # @docspec:intentional "Check if any HTTP client library imports are present in the source"
    def is_available(self, context: ExtractionContext) -> bool:
        for item in context.sources:
            source: str = item["source"]
            for imp in _HTTP_IMPORTS:
                if imp in source:
                    return True
        return False

    # @docspec:intentional "Detect external HTTP/RPC dependency patterns and extract endpoint metadata"
    def extract(self, context: ExtractionContext) -> None:
        dependencies: dict[str, dict[str, Any]] = {}  # name -> dep

        for item in context.sources:
            try:
                tree = ast.parse(item["source"])
            except SyntaxError:
                continue
            prefix = item["qualified_prefix"]

            # Detect which HTTP libraries are imported
            http_libs = self._detect_http_imports(tree)
            if not http_libs:
                continue

            # Walk looking for HTTP call patterns
            for node in ast.walk(tree):
                if not isinstance(node, ast.Call):
                    continue

                dep = self._extract_http_call(node, http_libs, prefix)
                if dep is None:
                    continue

                dep_name = dep["name"]
                if dep_name in dependencies:
                    # Merge endpoints
                    existing_eps = dependencies[dep_name].setdefault("endpoints", [])
                    for ep in dep.get("endpoints", []):
                        if ep not in existing_eps:
                            existing_eps.append(ep)
                else:
                    dependencies[dep_name] = dep

        if not dependencies:
            return

        existing: list[dict] = context.model.setdefault("externalDependencies", [])
        existing.extend(dependencies.values())

    # ------------------------------------------------------------------
    # Import detection
    # ------------------------------------------------------------------

    # @docspec:deterministic
    def _detect_http_imports(self, tree: ast.Module) -> set[str]:
        found: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    for imp in _HTTP_IMPORTS:
                        if alias.name == imp or alias.name.startswith(f"{imp}."):
                            found.add(imp)
            elif isinstance(node, ast.ImportFrom) and node.module:
                for imp in _HTTP_IMPORTS:
                    if node.module == imp or node.module.startswith(f"{imp}."):
                        found.add(imp)
        return found

    # ------------------------------------------------------------------
    # HTTP call extraction
    # ------------------------------------------------------------------

    # @docspec:intentional "Detect HTTP client method calls and extract URL, method, and dependency info"
    def _extract_http_call(
        self, node: ast.Call, http_libs: set[str], prefix: str
    ) -> dict[str, Any] | None:
        """Detect ``requests.get("https://...")`` and similar patterns."""
        func = node.func
        method: str | None = None
        lib_name: str | None = None

        # requests.get(...) / httpx.post(...)
        if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name):
            if func.value.id in http_libs or func.value.id in ("requests", "httpx", "aiohttp"):
                if func.attr.lower() in _HTTP_METHODS:
                    method = func.attr.upper()
                    lib_name = func.value.id

        # self.client.get(...) / session.post(...)
        if method is None and isinstance(func, ast.Attribute):
            if func.attr.lower() in _HTTP_METHODS:
                method = func.attr.upper()
                lib_name = self._infer_lib_from_context(func, http_libs)

        if method is None or lib_name is None:
            return None

        # Extract URL from first positional argument
        url = self._extract_url(node)
        base_url = self._extract_base_url(url) if url else None

        dep_name = f"external-via-{lib_name}"
        if base_url:
            dep_name = self._url_to_name(base_url)

        endpoint: dict[str, Any] = {
            "method": method,
            "path": self._extract_path(url) if url else "/",
            "usedBy": [prefix],
        }

        return {
            "name": dep_name,
            "baseUrl": base_url or f"(detected from {lib_name})",
            "endpoints": [endpoint],
        }

    # ------------------------------------------------------------------
    # URL parsing helpers
    # ------------------------------------------------------------------

    # @docspec:deterministic
    @staticmethod
    def _extract_url(node: ast.Call) -> str | None:
        """Extract the URL string from the first positional arg."""
        if not node.args:
            # Check for url= keyword
            for kw in node.keywords:
                if kw.arg == "url" and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                    return kw.value.value
            return None
        first = node.args[0]
        if isinstance(first, ast.Constant) and isinstance(first.value, str):
            return first.value
        # f-string or concatenation: can't resolve at static analysis time
        return None

    # @docspec:deterministic
    @staticmethod
    def _extract_base_url(url: str) -> str | None:
        match = re.match(r"(https?://[^/]+)", url)
        return match.group(1) if match else None

    # @docspec:deterministic
    @staticmethod
    def _extract_path(url: str) -> str:
        match = re.match(r"https?://[^/]+(/.*)$", url)
        return match.group(1) if match else "/"

    # @docspec:deterministic
    @staticmethod
    def _url_to_name(base_url: str) -> str:
        """Turn ``https://api.example.com`` into ``api-example-com``."""
        host = re.sub(r"https?://", "", base_url)
        return re.sub(r"[^a-zA-Z0-9]", "-", host).strip("-")

    # @docspec:deterministic
    @staticmethod
    def _infer_lib_from_context(func: ast.Attribute, http_libs: set[str]) -> str | None:
        """Best-effort inference of which HTTP lib a ``self.client.get(...)`` belongs to."""
        # Default to the first detected lib
        for lib in http_libs:
            return lib
        return None
