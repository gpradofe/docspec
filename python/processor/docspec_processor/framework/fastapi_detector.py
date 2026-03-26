"""Detect FastAPI framework usage."""
# @docspec:module {
#   id: "docspec-py-fastapi-detector",
#   name: "FastAPI Framework Detector",
#   description: "Detects FastAPI framework presence by scanning source files for FastAPI imports.",
#   since: "3.0.0"
# }
from pathlib import Path


# @docspec:boundary "FastAPI framework presence detection"
class FastAPIDetector:
    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Scan source directory to detect FastAPI framework presence via import analysis"
    def detect(self, source_dir: str) -> bool:
        for py_file in Path(source_dir).rglob("*.py"):
            try:
                content = py_file.read_text(encoding="utf-8", errors="replace")
                if "from fastapi" in content or "import fastapi" in content:
                    return True
            except OSError:
                continue
        return False
