"""DocSpec DSTI — Documentation Semantic & Temporal Intelligence."""
# @docspec:module {
#   id: "docspec-py-dsti-pkg",
#   name: "DSTI Package",
#   description: "Deep Structural and Textual Intent analysis package. Provides intent extraction, naming analysis, and ISD scoring for Python source methods.",
#   since: "3.0.0"
# }
from docspec_processor.dsti.intent_extractor import IntentExtractor
from docspec_processor.dsti.naming_analyzer import NamingAnalyzer
from docspec_processor.dsti.intent_density_calculator import IntentDensityCalculator

__all__ = ["IntentExtractor", "NamingAnalyzer", "IntentDensityCalculator"]
