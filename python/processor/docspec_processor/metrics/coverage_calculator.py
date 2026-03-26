"""Calculate documentation coverage percentages.

Mirrors the Java ``CoverageCalculator``: counts total vs documented classes,
methods, and parameters, then produces a ``discovery`` model section with
coverage percentages.
"""
# @docspec:module {
#   id: "docspec-py-coverage-calculator",
#   name: "Coverage Calculator",
#   description: "Computes documentation coverage percentages for classes, methods, and parameters. Produces the discovery model section with auto-discovered vs annotated counts.",
#   since: "3.0.0"
# }
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# @docspec:boundary "Documentation coverage statistics and discovery model generation"
@dataclass
class CoverageCalculator:
    """Accumulates documentation coverage statistics and produces a summary.

    Usage::

        calc = CoverageCalculator()
        calc.analyze(model)
        discovery = calc.to_discovery_model(mode="auto", frameworks=["fastapi"])
    """

    total_classes: int = 0
    documented_classes: int = 0
    auto_discovered_classes: int = 0
    annotated_classes: int = 0
    inferred_descriptions: int = 0
    total_methods: int = 0
    documented_methods: int = 0
    total_params: int = 0
    documented_params: int = 0

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Walk the output model and tally coverage counters for classes, methods, and params"
    def analyze(self, model: dict[str, Any]) -> None:
        """Walk the *model* dict and tally coverage counters.

        Expects the model to follow the standard DocSpec JSON shape with
        ``modules[].members[]``.
        """
        for module in model.get("modules", []):
            for member in module.get("members", []):
                self.total_classes += 1

                description = member.get("description")
                if description and description.strip():
                    self.documented_classes += 1

                discovered_from = member.get("discoveredFrom")
                if discovered_from == "annotation":
                    self.annotated_classes += 1
                elif discovered_from in ("auto", "framework"):
                    self.auto_discovered_classes += 1

                # Methods
                for method in member.get("methods", []):
                    self.total_methods += 1
                    method_desc = method.get("description")
                    if method_desc and method_desc.strip():
                        self.documented_methods += 1

                    # Params
                    for param in method.get("params", []):
                        self.total_params += 1
                        param_desc = param.get("description")
                        if param_desc and param_desc.strip():
                            self.documented_params += 1

    def increment_inferred_descriptions(self, count: int = 1) -> None:
        """Track descriptions that were inferred from names."""
        self.inferred_descriptions += count

    # @docspec:deterministic
    # @docspec:preserves "Coverage percent is always in [0.0, 100.0] range"
    @property
    def coverage_percent(self) -> float:
        """Class-level coverage percentage, rounded to one decimal."""
        if self.total_classes == 0:
            return 0.0
        return round(self.documented_classes / self.total_classes * 100.0, 1)

    # @docspec:deterministic
    @property
    def method_coverage_percent(self) -> float:
        """Method-level coverage percentage, rounded to one decimal."""
        if self.total_methods == 0:
            return 0.0
        return round(self.documented_methods / self.total_methods * 100.0, 1)

    # @docspec:deterministic
    @property
    def param_coverage_percent(self) -> float:
        """Parameter-level coverage percentage, rounded to one decimal."""
        if self.total_params == 0:
            return 0.0
        return round(self.documented_params / self.total_params * 100.0, 1)

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Build the discovery section for docspec.json from accumulated coverage data"
    # @docspec:deterministic
    def to_discovery_model(
        self,
        mode: str = "auto",
        frameworks: list[str] | None = None,
        scanned_packages: list[str] | None = None,
        excluded_packages: list[str] | None = None,
    ) -> dict[str, Any]:
        """Build the ``discovery`` section for ``docspec.json``.

        Mirrors ``CoverageCalculator.toDiscoveryModel()`` in the Java reference.
        """
        discovery: dict[str, Any] = {
            "mode": mode,
            "totalClasses": self.total_classes,
            "documentedClasses": self.documented_classes,
        }

        if frameworks:
            discovery["frameworks"] = frameworks
        if scanned_packages:
            discovery["scannedPackages"] = scanned_packages
        if excluded_packages:
            discovery["excludedPackages"] = excluded_packages

        if self.auto_discovered_classes > 0:
            discovery["autoDiscoveredClasses"] = self.auto_discovered_classes
        if self.annotated_classes > 0:
            discovery["annotatedClasses"] = self.annotated_classes
        if self.inferred_descriptions > 0:
            discovery["inferredDescriptions"] = self.inferred_descriptions

        if self.total_methods > 0:
            discovery["totalMethods"] = self.total_methods
            discovery["documentedMethods"] = self.documented_methods

        if self.total_params > 0:
            discovery["totalParams"] = self.total_params
            discovery["documentedParams"] = self.documented_params

        if self.total_classes > 0:
            discovery["coveragePercent"] = self.coverage_percent

        return discovery
