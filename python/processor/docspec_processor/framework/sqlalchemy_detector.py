"""Detect SQLAlchemy framework usage."""
# @docspec:module {
#   id: "docspec-py-sqlalchemy-detector",
#   name: "SQLAlchemy Framework Detector",
#   description: "Detects SQLAlchemy framework presence by scanning source files for SQLAlchemy imports.",
#   since: "3.0.0"
# }
from pathlib import Path


# @docspec:boundary "SQLAlchemy framework presence detection"
class SQLAlchemyDetector:
    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Scan source directory to detect SQLAlchemy framework presence via import analysis"
    def detect(self, source_dir: str) -> bool:
        for py_file in Path(source_dir).rglob("*.py"):
            try:
                content = py_file.read_text(encoding="utf-8", errors="replace")
                if "from sqlalchemy" in content or "import sqlalchemy" in content:
                    return True
            except OSError:
                continue
        return False
