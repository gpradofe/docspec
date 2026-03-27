"""Generate property-based tests for Python using Hypothesis."""
# @docspec:module {
#   id: "docspec-py-dsti-property-tests",
#   name: "Property-Based Test Template",
#   description: "Generates Hypothesis property-based test classes from DSTI intent signals, producing idempotency tests for queries, state-change tests for mutations, purity tests for validations, and invariant rule assertions from @DocInvariant Property DSL expressions.",
#   since: "3.0.0"
# }

import re


def _to_python_accessor(field: str) -> str:
    """Convert a dotted field path to a Python attribute access, mapping 'output' to 'result'."""
    parts = field.split(".")
    if parts[0] == "output":
        parts[0] = "result"
    return ".".join(parts)


def _map_dsl_to_python_assertion(expression: str) -> str:
    """Map a Property DSL expression to a Python assertion string.

    Supports NOT_NULL, NOT_EMPTY, NOT_BLANK, SIZE, IN, BETWEEN, RANGE,
    MATCHES, comparison operators, and monotonicity patterns.
    """
    expr = expression.strip()

    # RANGE shorthand: field RANGE min..max
    m = re.match(r"^(.+)\s+RANGE\s+(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$", expr, re.IGNORECASE)
    if m:
        accessor = _to_python_accessor(m.group(1).strip())
        return f"assert {m.group(2)} <= {accessor} <= {m.group(3)}"

    # Monotonicity: field UP/DOWN -> field UP/DOWN
    m = re.match(r"^(.+)\s+(UP|DOWN)\s*[→\->]+\s*(.+)\s+(UP|DOWN)$", expr)
    if m:
        input_field = _to_python_accessor(m.group(1).strip())
        input_dir = m.group(2)
        output_field = _to_python_accessor(m.group(3).strip())
        output_dir = m.group(4)
        cmp = ">=" if output_dir == "UP" else "<="
        return (
            f"baseline = {output_field}\n"
            f"        # Increase {m.group(1).strip()} and verify {m.group(3).strip()} moves {output_dir}\n"
            f"        assert {output_field} {cmp} baseline"
        )

    # NOT_NULL
    m = re.match(r"^(\S+)\s+NOT_NULL$", expr, re.IGNORECASE)
    if m:
        return f"assert {_to_python_accessor(m.group(1))} is not None"

    # NOT_EMPTY
    m = re.match(r"^(\S+)\s+NOT_EMPTY$", expr, re.IGNORECASE)
    if m:
        return f"assert len({_to_python_accessor(m.group(1))}) > 0"

    # NOT_BLANK
    m = re.match(r"^(\S+)\s+NOT_BLANK$", expr, re.IGNORECASE)
    if m:
        accessor = _to_python_accessor(m.group(1))
        return f"assert {accessor} is not None and {accessor}.strip() != \"\""

    # SIZE comparison
    m = re.match(r"^(\S+)\s+SIZE\s*(>=?|<=?|==|!=)\s*(-?\d+(?:\.\d+)?)$", expr, re.IGNORECASE)
    if m:
        accessor = _to_python_accessor(m.group(1))
        return f"assert len({accessor}) {m.group(2)} {m.group(3)}"

    # IN [values]
    m = re.match(r"^(\S+)\s+IN\s*\[(.+)]$", expr, re.IGNORECASE)
    if m:
        accessor = _to_python_accessor(m.group(1))
        vals = ", ".join(
            f'"{v.strip().strip("\\\"\\\'")}"' if not v.strip().lstrip("-").isdigit() else v.strip()
            for v in m.group(2).split(",")
        )
        return f"assert {accessor} in [{vals}]"

    # BETWEEN min AND max
    m = re.match(r"^(\S+)\s+BETWEEN\s+(-?\d+(?:\.\d+)?)\s+AND\s+(-?\d+(?:\.\d+)?)$", expr, re.IGNORECASE)
    if m:
        accessor = _to_python_accessor(m.group(1))
        return f"assert {m.group(2)} <= {accessor} <= {m.group(3)}"

    # MATCHES pattern
    m = re.match(r"^(\S+)\s+MATCHES\s+(.+)$", expr, re.IGNORECASE)
    if m:
        accessor = _to_python_accessor(m.group(1))
        pattern = m.group(2).strip().strip("\"'")
        return f'assert re.match(r"{pattern}", {accessor})'

    # Comparison: >=, <=, !=, ==, >, <
    m = re.match(r"^(\S+)\s*(>=|<=|!=|==|>|<)\s*(.+)$", expr)
    if m:
        accessor = _to_python_accessor(m.group(1))
        return f"assert {accessor} {m.group(2)} {m.group(3).strip()}"

    return f"# Property: {expression}"


# @docspec:method { since: "3.0.0" }
# @docspec:deterministic
# @docspec:intentional "Generate property-based test file content from DSTI intent signals and name semantics"
def generate_property_tests(method: dict, output_dir: str) -> list[dict]:
    qualified = method.get("qualified", "unknown")
    parts = qualified.rsplit("#", 1)
    class_name = parts[0].rsplit(".", 1)[-1] if parts else "Unknown"
    method_name = parts[1] if len(parts) > 1 else "unknown_method"
    test_file = f"test_{class_name.lower()}_{method_name}_properties.py"

    signals = method.get("intentSignals", {})
    intent = signals.get("nameSemantics", {}).get("intent", "unknown")

    tests = ""

    if intent == "query":
        tests += f'''
    @given(text=st.text(max_size=100))
    def test_{method_name}_is_idempotent(self, text):
        """Query should return same result for same input."""
        # result1 = sut.{method_name}(text)
        # result2 = sut.{method_name}(text)
        # assert result1 == result2
        pass
'''

    if intent in ("creation", "mutation"):
        tests += f'''
    @given(text=st.text(max_size=100))
    def test_{method_name}_changes_state(self, text):
        """Mutation should change observable state."""
        # before = sut.get_state()
        # sut.{method_name}(text)
        # after = sut.get_state()
        # assert before != after
        pass
'''

    if intent == "validation":
        tests += f'''
    @given(text=st.text(max_size=100))
    def test_{method_name}_is_pure(self, text):
        """Validation should be a pure function."""
        # result1 = sut.{method_name}(text)
        # result2 = sut.{method_name}(text)
        # assert result1 == result2
        pass
'''

    # Generate invariant rule tests from @DocInvariant Property DSL expressions
    invariant_rules = signals.get("invariantRules", [])
    for rule_expr in invariant_rules:
        assertion = _map_dsl_to_python_assertion(rule_expr)
        safe_name = re.sub(r"[^a-zA-Z0-9]", "_", rule_expr).strip("_")
        safe_name = re.sub(r"_+", "_", safe_name).lower()
        tests += f'''
    @given(text=st.text(max_size=100))
    def test_invariant_{safe_name}(self, text):
        """Invariant: {rule_expr}"""
        result = sut.{method_name}(text)
        {assertion}
'''

    if not tests:
        return []

    content = f'''"""Property-based tests for {class_name}#{method_name}.

Auto-generated from DSTI intent signals using Hypothesis.
"""
from hypothesis import given, strategies as st


class Test{class_name.capitalize()}{method_name.capitalize()}Properties:
{tests}
'''

    return [{"path": f"{output_dir}/{test_file}", "content": content, "type": "property"}]
