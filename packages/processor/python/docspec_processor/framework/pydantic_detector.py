"""Detect Pydantic framework usage."""
# @docspec:module {
#   id: "docspec-py-pydantic-detector",
#   name: "Pydantic Framework Detector",
#   description: "Detects Pydantic framework presence by scanning source files for Pydantic imports.",
#   since: "3.0.0"
# }
from pathlib import Path


# @docspec:boundary "Pydantic framework presence detection"
class PydanticDetector:
    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Scan source directory to detect Pydantic framework presence via import analysis"
    def detect(self, source_dir: str) -> bool:
        for py_file in Path(source_dir).rglob("*.py"):
            try:
                content = py_file.read_text(encoding="utf-8", errors="replace")
                if "from pydantic" in content or "import pydantic" in content:
                    return True
            except OSError:
                continue
        return False
