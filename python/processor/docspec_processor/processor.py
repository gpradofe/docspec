"""Main processor orchestrator.

Mirrors the 21-step Java ``DocSpecProcessor`` pipeline, adapted for Python:
  1. Auto-discovery scan
  2. Framework detection (FastAPI, SQLAlchemy, Pydantic, Django)
  3. Decorator / docstring / description reading
  4. DSTI intent extraction + ISD scoring
  5. Domain extractor pipeline (security, config, observability, data stores,
     external deps, privacy, errors/events)
  6. Coverage calculation
  7. JSON serialization
"""

# ---------------------------------------------------------------------------
# Module-level self-documentation (DocSpec documents itself)
# ---------------------------------------------------------------------------
_MODULE_META = {
    "docspec:module": {
        "id": "docspec-py-processor",
        "name": "DocSpec Python Processor",
        "description": (
            "Main processor orchestrator for Python codebases. Coordinates the full "
            "DocSpec v3 pipeline: auto-discovery scanning via AST parsing, framework "
            "detection (FastAPI, SQLAlchemy, Pydantic, Django), decorator and docstring "
            "reading, DSTI intent extraction with naming analysis and density scoring, "
            "domain extractor pipeline (security, config, observability, data stores, "
            "external deps, privacy, errors/events), coverage calculation, and JSON "
            "serialization to docspec.json."
        ),
        "since": "3.0.0",
    },
    "docspec:boundary": "Python source code analysis",
    "docspec:tags": ["self-documented", "processor", "python", "pipeline"],
}

import ast
import json
import os
from pathlib import Path
from typing import Any

from docspec_processor.scanner import AutoDiscoveryScanner
from docspec_processor.reader.decorator_reader import DecoratorReader
from docspec_processor.reader.docstring_reader import DocstringReader
from docspec_processor.reader.description_inferrer import DescriptionInferrer
from docspec_processor.framework.fastapi_detector import FastAPIDetector
from docspec_processor.framework.sqlalchemy_detector import SQLAlchemyDetector
from docspec_processor.framework.pydantic_detector import PydanticDetector
from docspec_processor.framework.django_detector import DjangoDetector
from docspec_processor.dsti.intent_extractor import IntentExtractor
from docspec_processor.dsti.naming_analyzer import NamingAnalyzer
from docspec_processor.dsti.intent_density_calculator import IntentDensityCalculator
from docspec_processor.extractor.extractor_interface import ExtractionContext
from docspec_processor.extractor.security_extractor import SecurityExtractor
from docspec_processor.extractor.config_extractor import ConfigExtractor
from docspec_processor.extractor.observability_extractor import ObservabilityExtractor
from docspec_processor.extractor.datastore_extractor import DataStoreExtractor
from docspec_processor.extractor.external_dep_extractor import ExternalDepExtractor
from docspec_processor.extractor.privacy_extractor import PrivacyExtractor
from docspec_processor.extractor.error_event_extractor import ErrorEventExtractor
from docspec_processor.metrics.coverage_calculator import CoverageCalculator
from docspec_processor.output.serializer import Serializer


# @docspec:boundary "Processor orchestrator — coordinates the full 21-step DocSpec pipeline for Python"
class DocSpecPythonProcessor:
    def __init__(self, source_dir: str = "src", output_dir: str = "target",
                 group_id: str = "unknown", artifact_id: str = "unknown", version: str = "0.0.0",
                 include: list[str] | None = None, exclude: list[str] | None = None):
        self.source_dir = source_dir
        self.output_dir = output_dir
        self.group_id = group_id
        self.artifact_id = artifact_id
        self.version = version
        self.include = include or []
        self.exclude = exclude or ["__pycache__", ".venv", "venv", "test", "tests"]

        # Core components
        self.scanner = AutoDiscoveryScanner()
        self.decorator_reader = DecoratorReader()
        self.docstring_reader = DocstringReader()
        self.description_inferrer = DescriptionInferrer()
        self.serializer = Serializer()

        # Framework detectors
        self.fastapi_detector = FastAPIDetector()
        self.sqlalchemy_detector = SQLAlchemyDetector()
        self.pydantic_detector = PydanticDetector()
        self.django_detector = DjangoDetector()

        # DSTI components
        self.intent_extractor = IntentExtractor()
        self.naming_analyzer = NamingAnalyzer()
        self.intent_density_calculator = IntentDensityCalculator()

        # Domain extractors (mirrors Java DocSpecExtractor pipeline)
        self.extractors = [
            SecurityExtractor(),
            ConfigExtractor(),
            ObservabilityExtractor(),
            DataStoreExtractor(),
            ExternalDepExtractor(),
            PrivacyExtractor(),
            ErrorEventExtractor(),
        ]

        # Metrics
        self.coverage_calculator = CoverageCalculator()

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Orchestrate the complete DocSpec extraction pipeline and produce the output model"
    def process(self) -> dict:
        # Step 1: Auto-discovery scan
        discovered = self.scanner.scan(self.source_dir, self.exclude)
        frameworks: list[str] = []
        modules: list[dict] = []
        module_map: dict[str, dict] = {}
        intent_methods: list[dict] = []

        # Step 2: Process discovered source files
        for item in discovered:
            try:
                tree = ast.parse(item["source"])
            except SyntaxError:
                continue
            module_name = item["module"]

            if module_name not in module_map:
                module_map[module_name] = {"id": module_name, "name": module_name, "members": []}

            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    member = self._process_class(node, item["qualified_prefix"], intent_methods)
                    module_map[module_name]["members"].append(member)
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.col_offset == 0:
                    member = self._process_function(node, item["qualified_prefix"], intent_methods)
                    module_map[module_name]["members"].append(member)

        # Step 3: Detect frameworks
        if self.fastapi_detector.detect(self.source_dir):
            frameworks.append("fastapi")
        if self.sqlalchemy_detector.detect(self.source_dir):
            frameworks.append("sqlalchemy")
        if self.pydantic_detector.detect(self.source_dir):
            frameworks.append("pydantic")
        if self.django_detector.detect(self.source_dir):
            frameworks.append("django")

        for mod in module_map.values():
            modules.append(mod)

        # Step 4: Build initial output model
        output: dict[str, Any] = {
            "docspec": "3.0.0",
            "artifact": {
                "groupId": self.group_id,
                "artifactId": self.artifact_id,
                "version": self.version,
                "language": "python",
                "frameworks": frameworks if frameworks else None,
            },
            "modules": modules,
            "intentGraph": {"methods": intent_methods} if intent_methods else None,
        }

        # Step 5: Compute ISD scores for intent methods
        for method_entry in intent_methods:
            signals = method_entry.get("intentSignals", {})
            isd = self.intent_density_calculator.calculate(signals)
            method_entry["intentDensityScore"] = isd

        # Step 6: Run domain extractors
        context = ExtractionContext(
            source_dir=self.source_dir,
            sources=discovered,
            model=output,
        )
        for extractor in self.extractors:
            if extractor.is_available(context):
                extractor.extract(context)

        # Step 7: Extract Django-specific metadata if detected
        if "django" in frameworks:
            django_data = self.django_detector.extract(self.source_dir)
            if django_data.get("models") or django_data.get("views") or django_data.get("serializers"):
                output["django"] = {
                    k: v for k, v in django_data.items() if v
                }

        # Step 8: Calculate coverage
        self.coverage_calculator = CoverageCalculator()  # reset
        self.coverage_calculator.analyze(output)
        output["discovery"] = self.coverage_calculator.to_discovery_model(
            mode="auto",
            frameworks=frameworks,
            excluded_packages=self.exclude,
        )

        return output

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Extract class-level documentation from an AST ClassDef node"
    def _process_class(self, node: ast.ClassDef, prefix: str, intent_methods: list[dict]) -> dict:
        qualified = f"{prefix}.{node.name}"
        docstring = self.docstring_reader.read(node)
        description = docstring or self.description_inferrer.infer(node.name)

        member: dict[str, Any] = {
            "kind": "class",
            "name": node.name,
            "qualified": qualified,
            "description": description,
            "methods": [],
            "fields": [],
        }

        # Track docstring-based vs inferred descriptions
        if not docstring:
            member["discoveredFrom"] = "auto"
        else:
            member["discoveredFrom"] = "annotation"

        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                method = self._process_method(item, qualified, intent_methods)
                member["methods"].append(method)
            elif isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                field: dict[str, Any] = {
                    "name": item.target.id,
                    "type": ast.unparse(item.annotation) if item.annotation else "Any",
                }
                member["fields"].append(field)

        # Read docspec decorators
        decorators = self.decorator_reader.read(node)
        if decorators:
            member["annotations"] = decorators

        return member

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Extract module-level function documentation from an AST FunctionDef node"
    def _process_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef,
                          prefix: str, intent_methods: list[dict]) -> dict:
        qualified = f"{prefix}.{node.name}"
        docstring = self.docstring_reader.read(node)
        description = docstring or self.description_inferrer.infer(node.name)

        member: dict[str, Any] = {
            "kind": "function",
            "name": node.name,
            "qualified": qualified,
            "description": description,
        }

        if not docstring:
            member["discoveredFrom"] = "auto"
        else:
            member["discoveredFrom"] = "annotation"

        # Use NamingAnalyzer for richer name semantics
        name_sem = self.naming_analyzer.analyze(node.name)
        if name_sem.intent != "unknown":
            member["nameSemantics"] = {
                "verb": name_sem.verb,
                "object": name_sem.object,
                "intent": name_sem.intent,
            }

        # Check if it's async
        if isinstance(node, ast.AsyncFunctionDef):
            member["async"] = True

        return member

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Extract method-level documentation and DSTI signals from an AST method node"
    def _process_method(self, node: ast.FunctionDef | ast.AsyncFunctionDef,
                        parent_qualified: str, intent_methods: list[dict]) -> dict:
        qualified = f"{parent_qualified}#{node.name}"
        docstring = self.docstring_reader.read(node)
        description = docstring or self.description_inferrer.infer(node.name)
        params = [
            {
                "name": arg.arg,
                "type": ast.unparse(arg.annotation) if arg.annotation else "Any",
            }
            for arg in node.args.args
            if arg.arg != "self" and arg.arg != "cls"
        ]
        returns = ast.unparse(node.returns) if node.returns else None

        signals = self.intent_extractor.extract(node)
        if signals:
            intent_methods.append({"qualified": qualified, "intentSignals": signals})

        method: dict[str, Any] = {
            "name": node.name,
            "description": description,
            "params": params,
            "returns": {"type": returns} if returns else None,
        }

        if isinstance(node, ast.AsyncFunctionDef):
            method["async"] = True

        return method

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Run the full pipeline and serialize the output to docspec.json"
    def generate(self) -> None:
        output = self.process()
        self.serializer.write(output, self.output_dir)
