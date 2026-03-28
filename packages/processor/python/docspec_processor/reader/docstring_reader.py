"""Read docstrings from AST nodes."""
# @docspec:module {
#   id: "docspec-py-docstring-reader",
#   name: "Docstring Reader",
#   description: "Reads the first line of Python docstrings from AST nodes, providing the summary sentence for documentation descriptions.",
#   since: "3.0.0"
# }
import ast


# @docspec:boundary "Docstring extraction from AST nodes"
class DocstringReader:
    # @docspec:method { since: "3.0.0" }
    # @docspec:deterministic
    # @docspec:intentional "Extract the first-line summary from a Python docstring"
    def read(self, node: ast.AST) -> str | None:
        docstring = ast.get_docstring(node)
        if docstring:
            lines = docstring.strip().split("\n")
            return lines[0].strip() if lines else None
        return None
