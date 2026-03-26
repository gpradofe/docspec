"""DocSpec metrics — documentation coverage calculation."""
# @docspec:module {
#   id: "docspec-py-metrics-pkg",
#   name: "Metrics Package",
#   description: "Re-exports the CoverageCalculator for computing documentation coverage percentages across classes, methods, and parameters.",
#   since: "3.0.0"
# }
from docspec_processor.metrics.coverage_calculator import CoverageCalculator

__all__ = ["CoverageCalculator"]
