"""Extract intent signals from Python AST."""
# @docspec:module {
#   id: "docspec-py-intent-extractor",
#   name: "Intent Signal Extractor",
#   description: "Extracts 13-channel DSTI intent signals from Python AST function nodes, including name semantics, guard clauses, branches, error handling, loops, dependencies, and constants.",
#   since: "3.0.0"
# }
import ast
import re
from typing import Any

# Python stream-like / functional operations to track in streamOps.
_STREAM_OPS: set[str] = {
    "map", "filter", "reduce", "sorted", "enumerate",
    "zip", "any", "all", "sum", "min", "max",
}

VERB_INTENT = {
    "get": "query", "find": "query", "fetch": "query", "load": "query", "list": "query", "search": "query",
    "create": "creation", "add": "creation", "insert": "creation", "save": "creation",
    "update": "mutation", "modify": "mutation", "patch": "mutation", "set": "mutation",
    "delete": "deletion", "remove": "deletion", "destroy": "deletion",
    "validate": "validation", "check": "validation", "verify": "validation",
    "process": "transformation", "handle": "transformation", "transform": "transformation",
    "send": "communication", "publish": "communication", "emit": "communication",
    "calculate": "calculation", "compute": "calculation", "count": "calculation",
    "is_": "query", "has_": "query",
}


# @docspec:boundary "AST-based intent signal extraction"
class IntentExtractor:
    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Extract all 13 DSTI channels from a function AST node"
    def extract(self, node: ast.FunctionDef) -> dict[str, Any] | None:
        name = node.name
        if name.startswith("_"):
            return None

        signals: dict[str, Any] = {}

        # Name semantics
        words = name.split("_")
        verb = words[0].lower()
        obj = "_".join(words[1:]) if len(words) > 1 else ""
        intent = VERB_INTENT.get(verb, "unknown")
        signals["nameSemantics"] = {"verb": verb, "object": obj, "intent": intent}

        # Guard clauses
        guards = self._count_guards(node)
        if guards > 0:
            signals["guardClauses"] = guards

        # Branches
        branches = self._count_branches(node)
        if branches > 0:
            signals["branches"] = branches

        # Error handling
        catch_blocks, caught_types = self._analyze_error_handling(node)
        if catch_blocks > 0:
            signals["errorHandling"] = {"catchBlocks": catch_blocks, "caughtTypes": caught_types}

        # Loop properties (for loops, comprehensions, stream-like ops)
        loop_props = self._extract_loop_properties(node)
        if loop_props:
            signals["loopProperties"] = loop_props

        # Dependencies (function calls)
        deps = self._extract_dependencies(node)
        if deps:
            signals["dependencies"] = deps

        # Constants
        constants = self._extract_constants(node)
        if constants:
            signals["constants"] = constants

        return signals if len(signals) > 1 else None

    # @docspec:deterministic
    def _count_guards(self, node: ast.FunctionDef) -> int:
        count = 0
        for stmt in ast.walk(node):
            if isinstance(stmt, ast.If):
                body = stmt.body
                if len(body) == 1 and isinstance(body[0], (ast.Raise, ast.Return)):
                    count += 1
        return count

    # @docspec:deterministic
    def _count_branches(self, node: ast.FunctionDef) -> int:
        count = 0
        for stmt in ast.walk(node):
            if isinstance(stmt, (ast.If, ast.IfExp)):
                count += 1
        return count

    # @docspec:deterministic
    def _analyze_error_handling(self, node: ast.FunctionDef) -> tuple[int, list[str]]:
        catch_blocks = 0
        caught_types: list[str] = []
        for stmt in ast.walk(node):
            if isinstance(stmt, ast.ExceptHandler):
                catch_blocks += 1
                if stmt.type:
                    caught_types.append(ast.unparse(stmt.type))
        return catch_blocks, caught_types

    # @docspec:deterministic
    def _extract_dependencies(self, node: ast.FunctionDef) -> list[str]:
        deps: set[str] = set()
        for stmt in ast.walk(node):
            if isinstance(stmt, ast.Call):
                if isinstance(stmt.func, ast.Attribute) and isinstance(stmt.func.value, ast.Attribute):
                    if isinstance(stmt.func.value.value, ast.Name) and stmt.func.value.value.id == "self":
                        deps.add(f"{stmt.func.value.attr}.{stmt.func.attr}")
        return list(deps)[:20]

    # @docspec:deterministic
    def _extract_constants(self, node: ast.FunctionDef) -> list[str]:
        constants: set[str] = set()
        for stmt in ast.walk(node):
            if isinstance(stmt, ast.Constant):
                if isinstance(stmt.value, str) and len(stmt.value) > 1:
                    constants.add(stmt.value)
                elif isinstance(stmt.value, (int, float)):
                    constants.add(str(stmt.value))
        return list(constants)[:10]

    # @docspec:deterministic
    def _extract_loop_properties(self, node: ast.FunctionDef) -> dict[str, Any] | None:
        """Extract loop and stream/functional operation signals.

        Detects:
        - ``for`` loops (``hasEnhancedFor`` in the schema; Python ``for`` is
          always an enhanced / range-based loop)
        - List/set/dict/generator comprehensions (``hasStreams``)
        - Calls to built-in functional helpers such as ``map``, ``filter``,
          ``reduce``, ``sorted``, ``enumerate`` (recorded in ``streamOps``)
        """
        has_for = False
        has_comprehensions = False
        stream_ops: set[str] = set()

        for child in ast.walk(node):
            # Standard for-loops
            if isinstance(child, ast.For) or isinstance(child, ast.AsyncFor):
                has_for = True

            # Comprehensions count as stream-like constructs
            if isinstance(child, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
                has_comprehensions = True

            # Detect calls to stream-like built-in functions (e.g. map(...), filter(...))
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name) and child.func.id in _STREAM_OPS:
                    stream_ops.add(child.func.id)
                # Also detect method-call form: e.g. functools.reduce(...)
                elif isinstance(child.func, ast.Attribute) and child.func.attr in _STREAM_OPS:
                    stream_ops.add(child.func.attr)

        if not has_for and not has_comprehensions and not stream_ops:
            return None

        props: dict[str, Any] = {}
        if has_comprehensions or stream_ops:
            props["hasStreams"] = True
        if has_for:
            props["hasEnhancedFor"] = True
        if stream_ops:
            props["streamOps"] = sorted(stream_ops)
        return props
