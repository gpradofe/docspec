"""DocSpec processor for Python — generates docspec.json from Python source."""
# @docspec:module {
#   id: "docspec-py-processor-pkg",
#   name: "DocSpec Python Processor Package",
#   description: "Top-level package for the DocSpec Python processor. Re-exports the main orchestrator, coverage calculator, naming analyzer, and intent density calculator.",
#   since: "3.0.0"
# }
from docspec_processor.processor import DocSpecPythonProcessor
from docspec_processor.metrics.coverage_calculator import CoverageCalculator
from docspec_processor.dsti.naming_analyzer import NamingAnalyzer
from docspec_processor.dsti.intent_density_calculator import IntentDensityCalculator

__all__ = [
    "DocSpecPythonProcessor",
    "CoverageCalculator",
    "NamingAnalyzer",
    "IntentDensityCalculator",
]
