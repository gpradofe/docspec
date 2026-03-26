"""Read docspec decorators from AST nodes."""
# @docspec:module {
#   id: "docspec-py-decorator-reader",
#   name: "Decorator Reader",
#   description: "Reads @doc_* decorator metadata from Python AST nodes, extracting keyword arguments into structured annotation dictionaries.",
#   since: "3.0.0"
# }
import ast
from typing import Any


# @docspec:boundary "DocSpec decorator metadata extraction from AST"
class DecoratorReader:
    # @docspec:method { since: "3.0.0" }
    # @docspec:deterministic
    # @docspec:intentional "Extract all @doc_* decorator keyword arguments from an AST node"
    def read(self, node: ast.ClassDef | ast.FunctionDef) -> dict[str, Any]:
        meta: dict[str, Any] = {}
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Name):
                name = decorator.func.id
                if name.startswith("doc_"):
                    kwargs = {}
                    for kw in decorator.keywords:
                        if kw.arg and isinstance(kw.value, ast.Constant):
                            kwargs[kw.arg] = kw.value.value
                    meta[name] = kwargs
        return meta
