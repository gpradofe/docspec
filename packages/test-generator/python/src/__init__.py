"""DSTI test generator for Python projects."""
# @docspec:module {
#   id: "docspec-py-dsti-generator-pkg",
#   name: "DSTI Test Generator Package",
#   description: "Top-level package for generating pytest and Hypothesis test stubs from DSTI intent signals. Produces guard clause tests and property-based tests.",
#   since: "3.0.0"
# }
from .generator import PythonTestGenerator

__all__ = ["PythonTestGenerator"]
