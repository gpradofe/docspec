"""Detect observability patterns in Python projects.

Targets:
  - prometheus_client: ``Counter``, ``Histogram``, ``Gauge``, ``Summary``
  - structlog / logging: structured log usage
  - OpenTelemetry: ``tracer``, ``meter`` usage
  - Health check patterns (e.g. ``/health``, ``/ready`` endpoints)
"""
# @docspec:module {
#   id: "docspec-py-observability-extractor",
#   name: "Observability Extractor",
#   description: "Detects observability infrastructure (Prometheus metrics, OpenTelemetry traces, structlog, health checks) and extracts metric declarations, timing decorators, and health endpoints.",
#   since: "3.0.0"
# }
from __future__ import annotations

import ast
from typing import Any

from docspec_processor.extractor.extractor_interface import DocSpecExtractor, ExtractionContext

# Import patterns that signal observability frameworks
_OBS_IMPORTS: list[str] = [
    "prometheus_client",
    "opentelemetry",
    "structlog",
    "logging",
    "datadog",
    "sentry_sdk",
    "newrelic",
]

# prometheus_client metric class names
_PROMETHEUS_TYPES: dict[str, str] = {
    "Counter": "counter",
    "Histogram": "histogram",
    "Gauge": "gauge",
    "Summary": "summary",
    "Info": "info",
    "Enum": "enum",
}

# Decorator names that indicate timing / tracing
_TIMING_DECORATORS: set[str] = {
    "timed",
    "timer",
    "counted",
    "traced",
    "instrument",
    "trace",
    "measure",
}


# @docspec:boundary "Observability metric and health check extraction from Python source"
class ObservabilityExtractor(DocSpecExtractor):
    """Extracts observability metadata from source code."""

    # @docspec:deterministic
    def extractor_name(self) -> str:
        return "observability"

    # @docspec:intentional "Check if any observability framework imports are present in the source"
    def is_available(self, context: ExtractionContext) -> bool:
        for item in context.sources:
            source: str = item["source"]
            for imp in _OBS_IMPORTS:
                if imp in source:
                    return True
        return False

    # @docspec:intentional "Extract prometheus metrics, timing decorators, health checks, and logging frameworks from source AST"
    def extract(self, context: ExtractionContext) -> None:
        metrics: list[dict[str, Any]] = []
        health_checks: list[dict[str, Any]] = []
        logging_frameworks: set[str] = set()

        for item in context.sources:
            try:
                tree = ast.parse(item["source"])
            except SyntaxError:
                continue
            prefix = item["qualified_prefix"]

            for node in ast.walk(tree):
                # --- prometheus_client metric declarations ---
                if isinstance(node, ast.Assign):
                    metric = self._extract_prometheus_metric(node, prefix)
                    if metric:
                        metrics.append(metric)

                # --- Timing/tracing decorators on functions ---
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    for dec in node.decorator_list:
                        dec_name = self._decorator_name(dec)
                        if dec_name and dec_name in _TIMING_DECORATORS:
                            metric_name = self._extract_decorator_metric_name(dec)
                            metrics.append({
                                "name": metric_name or f"{prefix}.{node.name}",
                                "type": "timer",
                                "emittedBy": [f"{prefix}.{node.name}"],
                            })

                    # Detect health-check endpoints
                    if self._is_health_endpoint(node):
                        health_checks.append({
                            "path": self._infer_health_path(node),
                            "checks": [f"{prefix}.{node.name}"],
                        })

                # --- Detect logging framework imports ---
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name in ("structlog", "logging"):
                            logging_frameworks.add(alias.name)
                if isinstance(node, ast.ImportFrom) and node.module:
                    if node.module.startswith("structlog"):
                        logging_frameworks.add("structlog")
                    elif node.module.startswith("logging"):
                        logging_frameworks.add("logging")

        if not metrics and not health_checks and not logging_frameworks:
            return

        observability = context.model.setdefault("observability", {})
        if metrics:
            existing: list[dict] = observability.setdefault("metrics", [])
            existing.extend(metrics)
        if health_checks:
            existing_hc: list[dict] = observability.setdefault("healthChecks", [])
            existing_hc.extend(health_checks)
        if logging_frameworks:
            observability["loggingFrameworks"] = sorted(logging_frameworks)

    # ------------------------------------------------------------------
    # Prometheus metric extraction
    # ------------------------------------------------------------------

    # @docspec:intentional "Detect prometheus_client metric constructor calls and extract name, type, description, and labels"
    def _extract_prometheus_metric(self, node: ast.Assign, prefix: str) -> dict[str, Any] | None:
        """Detect ``my_counter = Counter("name", "desc", ["label"])``."""
        if not isinstance(node.value, ast.Call):
            return None

        call = node.value
        func_name: str | None = None
        if isinstance(call.func, ast.Name):
            func_name = call.func.id
        elif isinstance(call.func, ast.Attribute):
            func_name = call.func.attr

        if func_name is None or func_name not in _PROMETHEUS_TYPES:
            return None

        metric: dict[str, Any] = {
            "type": _PROMETHEUS_TYPES[func_name],
            "emittedBy": [prefix],
        }

        # First positional arg is the metric name
        if call.args and isinstance(call.args[0], ast.Constant) and isinstance(call.args[0].value, str):
            metric["name"] = call.args[0].value
        else:
            # Fallback to variable name
            if node.targets and isinstance(node.targets[0], ast.Name):
                metric["name"] = node.targets[0].id
            else:
                return None

        # Second positional arg is usually the description
        if len(call.args) > 1 and isinstance(call.args[1], ast.Constant) and isinstance(call.args[1].value, str):
            metric["description"] = call.args[1].value

        # Third positional arg or labelnames= is the label list
        labels = self._extract_labels(call)
        if labels:
            metric["labels"] = labels

        return metric

    # @docspec:deterministic
    @staticmethod
    def _extract_labels(call: ast.Call) -> list[str]:
        """Extract label names from a prometheus_client constructor call."""
        # Third positional arg
        label_node: ast.expr | None = None
        if len(call.args) > 2:
            label_node = call.args[2]
        else:
            for kw in call.keywords:
                if kw.arg == "labelnames":
                    label_node = kw.value
                    break

        if label_node is None:
            return []

        if isinstance(label_node, (ast.List, ast.Tuple)):
            return [
                elt.value
                for elt in label_node.elts
                if isinstance(elt, ast.Constant) and isinstance(elt.value, str)
            ]
        return []

    # ------------------------------------------------------------------
    # Health-check detection
    # ------------------------------------------------------------------

    # @docspec:deterministic
    @staticmethod
    def _is_health_endpoint(node: ast.FunctionDef | ast.AsyncFunctionDef) -> bool:
        """Detect health-check endpoints by name or decorator path."""
        name_lower = node.name.lower()
        if any(kw in name_lower for kw in ("health", "ready", "liveness", "readiness")):
            return True
        for dec in node.decorator_list:
            dec_str = ast.dump(dec)
            if any(kw in dec_str.lower() for kw in ("/health", "/ready", "/liveness", "/readiness")):
                return True
        return False

    # @docspec:deterministic
    @staticmethod
    def _infer_health_path(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
        """Try to extract the actual route path from decorators, fallback to name."""
        for dec in node.decorator_list:
            if isinstance(dec, ast.Call) and dec.args:
                first = dec.args[0]
                if isinstance(first, ast.Constant) and isinstance(first.value, str):
                    if "/" in first.value:
                        return first.value
        name_lower = node.name.lower()
        if "readiness" in name_lower or "ready" in name_lower:
            return "/ready"
        if "liveness" in name_lower or "alive" in name_lower:
            return "/liveness"
        return "/health"

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

    # @docspec:deterministic
    @staticmethod
    def _extract_decorator_metric_name(decorator: ast.expr) -> str | None:
        """Extract metric name from ``@timed("my_metric")`` style decorators."""
        if isinstance(decorator, ast.Call) and decorator.args:
            first = decorator.args[0]
            if isinstance(first, ast.Constant) and isinstance(first.value, str):
                return first.value
        return None
