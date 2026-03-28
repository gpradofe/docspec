"""Generate pytest + Hypothesis tests from DSTI intent signals."""
# @docspec:module {
#   id: "docspec-py-dsti-test-generator",
#   name: "Python Test Generator",
#   description: "Generates pytest and Hypothesis test files from DSTI intent graph signals. Creates guard clause tests and property-based tests for each method with sufficient intent density.",
#   since: "3.0.0"
# }
import json
from pathlib import Path
from .templates.guard_tests import generate_guard_tests
from .templates.property_tests import generate_property_tests


# @docspec:boundary "DSTI intent-driven test file generation"
class PythonTestGenerator:
    def __init__(self, output_dir: str = "tests/generated"):
        self.output_dir = output_dir

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Generate test file descriptors from DSTI intent graph methods"
    def generate(self, intent_graph: dict) -> list[dict]:
        files: list[dict] = []
        methods = intent_graph.get("methods", [])

        for method in methods:
            signals = method.get("intentSignals", {})
            if not signals:
                continue

            guard_clauses = signals.get("guardClauses", 0)
            guard_count = guard_clauses if isinstance(guard_clauses, int) else len(guard_clauses) if isinstance(guard_clauses, list) else 0

            if guard_count > 0:
                files.extend(generate_guard_tests(method, self.output_dir))

            files.extend(generate_property_tests(method, self.output_dir))

        return files

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Generate and write test files to disk from an intent graph"
    def write(self, intent_graph: dict) -> None:
        files = self.generate(intent_graph)
        for f in files:
            path = Path(f["path"])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(f["content"], encoding="utf-8")
