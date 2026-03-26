"""Write docspec.json output."""
# @docspec:module {
#   id: "docspec-py-serializer",
#   name: "Spec Serializer",
#   description: "Serializes the DocSpec output model to docspec.json and intent-graph.json files, stripping None values during serialization.",
#   since: "3.0.0"
# }
import json
import os
from pathlib import Path


# @docspec:boundary "JSON output serialization for docspec.json and intent-graph.json"
class Serializer:
    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Serialize the output model to docspec.json and optionally intent-graph.json"
    def write(self, data: dict, output_dir: str) -> None:
        os.makedirs(output_dir, exist_ok=True)
        spec_path = Path(output_dir) / "docspec.json"
        # Remove None values
        cleaned = self._clean(data)
        with open(spec_path, "w", encoding="utf-8") as f:
            json.dump(cleaned, f, indent=2, ensure_ascii=False)

        # Write intent-graph.json if present
        if data.get("intentGraph"):
            intent_path = Path(output_dir) / "intent-graph.json"
            intent_data = {
                "docspec": data["docspec"],
                "artifact": {
                    "groupId": data["artifact"]["groupId"],
                    "artifactId": data["artifact"]["artifactId"],
                    "version": data["artifact"]["version"],
                },
                "methods": data["intentGraph"]["methods"],
            }
            with open(intent_path, "w", encoding="utf-8") as f:
                json.dump(self._clean(intent_data), f, indent=2, ensure_ascii=False)

    # @docspec:deterministic
    # @docspec:intentional "Recursively strip None values from nested dicts and lists"
    def _clean(self, obj):
        if isinstance(obj, dict):
            return {k: self._clean(v) for k, v in obj.items() if v is not None}
        elif isinstance(obj, list):
            return [self._clean(item) for item in obj]
        return obj
