"""Auto-discovery scanner for Python source files."""
# @docspec:module {
#   id: "docspec-py-scanner",
#   name: "Auto-Discovery Scanner",
#   description: "Recursively scans Python source directories, discovering all public modules and building qualified name prefixes for each file.",
#   since: "3.0.0"
# }
import os
from pathlib import Path


# @docspec:boundary "File system scanning and module discovery"
class AutoDiscoveryScanner:
    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Discover all Python source files and build module metadata for each"
    def scan(self, source_dir: str, exclude: list[str]) -> list[dict]:
        results = []
        base = Path(source_dir)
        if not base.exists():
            return results

        for py_file in base.rglob("*.py"):
            rel = py_file.relative_to(base)
            if any(part in exclude for part in rel.parts):
                continue
            if py_file.name.startswith("_") and py_file.name != "__init__.py":
                continue

            source = py_file.read_text(encoding="utf-8", errors="replace")
            module_parts = list(rel.parent.parts)
            if py_file.name != "__init__.py":
                module_parts.append(py_file.stem)
            module_name = ".".join(module_parts) if module_parts else py_file.stem

            results.append({
                "path": str(py_file),
                "source": source,
                "module": module_name or "default",
                "qualified_prefix": module_name or "default",
            })
        return results
