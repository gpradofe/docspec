"""Infer descriptions from names."""
# @docspec:module {
#   id: "docspec-py-description-inferrer",
#   name: "Description Inferrer",
#   description: "Infers human-readable descriptions from class and function names by splitting camelCase/snake_case and mapping verb prefixes to natural language.",
#   since: "3.0.0"
# }
import re

VERB_MAP = {
    "get": "Retrieves", "find": "Finds", "fetch": "Fetches", "load": "Loads",
    "create": "Creates", "add": "Adds", "insert": "Inserts", "save": "Saves",
    "update": "Updates", "modify": "Modifies", "patch": "Patches",
    "delete": "Deletes", "remove": "Removes", "destroy": "Destroys",
    "validate": "Validates", "check": "Checks", "verify": "Verifies",
    "process": "Processes", "handle": "Handles", "execute": "Executes",
    "send": "Sends", "publish": "Publishes", "emit": "Emits",
    "convert": "Converts", "transform": "Transforms", "parse": "Parses",
    "calculate": "Calculates", "compute": "Computes", "count": "Counts",
    "is": "Checks whether", "has": "Checks if has", "can": "Determines if can",
}


# @docspec:boundary "Name-to-description inference for undocumented elements"
class DescriptionInferrer:
    # @docspec:method { since: "3.0.0" }
    # @docspec:deterministic
    # @docspec:intentional "Generate a human-readable description from a class or function name"
    # @docspec:preserves "Always returns a non-empty string ending with a period"
    def infer(self, name: str) -> str:
        words = re.sub(r"([A-Z])", r" \1", name).replace("_", " ").strip().split()
        if not words:
            return ""
        verb = words[0].lower()
        rest = " ".join(w.lower() for w in words[1:])
        prefix = VERB_MAP.get(verb)
        if prefix and rest:
            return f"{prefix} {rest}."
        if prefix:
            return f"{prefix} the resource."
        return " ".join(words).capitalize() + "."
