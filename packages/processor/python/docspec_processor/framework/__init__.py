"""DocSpec framework detectors."""
# @docspec:module {
#   id: "docspec-py-framework-pkg",
#   name: "Framework Detectors Package",
#   description: "Re-exports all framework detector classes: FastAPI, SQLAlchemy, Pydantic, and Django. Each detector scans source files for framework-specific imports.",
#   since: "3.0.0"
# }
from docspec_processor.framework.fastapi_detector import FastAPIDetector
from docspec_processor.framework.sqlalchemy_detector import SQLAlchemyDetector
from docspec_processor.framework.pydantic_detector import PydanticDetector
from docspec_processor.framework.django_detector import DjangoDetector

__all__ = [
    "FastAPIDetector",
    "SQLAlchemyDetector",
    "PydanticDetector",
    "DjangoDetector",
]
