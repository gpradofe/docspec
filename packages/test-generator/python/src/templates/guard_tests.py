"""Generate guard clause tests for Python."""
# @docspec:module {
#   id: "docspec-py-dsti-guard-tests",
#   name: "Guard Clause Test Template",
#   description: "Generates pytest test classes that validate guard clause enforcement, producing one test per guard plus a None-rejection test for each method.",
#   since: "3.0.0"
# }


# @docspec:method { since: "3.0.0" }
# @docspec:deterministic
# @docspec:intentional "Generate guard clause test file content from DSTI intent signals"
def generate_guard_tests(method: dict, output_dir: str) -> list[dict]:
    qualified = method.get("qualified", "unknown")
    parts = qualified.rsplit("#", 1)
    class_name = parts[0].rsplit(".", 1)[-1] if parts else "Unknown"
    method_name = parts[1] if len(parts) > 1 else "unknown_method"
    test_file = f"test_{class_name.lower()}_{method_name}_guards.py"

    signals = method.get("intentSignals", {})
    guard_clauses = signals.get("guardClauses", 0)
    guard_count = guard_clauses if isinstance(guard_clauses, int) else len(guard_clauses) if isinstance(guard_clauses, list) else 0

    tests = ""
    for i in range(guard_count):
        guard = guard_clauses[i] if isinstance(guard_clauses, list) and i < len(guard_clauses) else None
        condition = guard.get("condition", f"guard condition {i + 1}") if isinstance(guard, dict) else f"guard condition {i + 1}"
        error = guard.get("error", "ValueError") if isinstance(guard, dict) else "ValueError"

        tests += f'''
    def test_guard_{i + 1}_{method_name}(self):
        """Should enforce guard: {condition}"""
        # Given: input that violates the guard
        # When/Then: expect {error}
        with pytest.raises({error}):
            # TODO: Call {method_name} with invalid input
            pass

'''

    tests += f'''
    def test_{method_name}_rejects_none(self):
        """Should reject None input."""
        with pytest.raises((TypeError, ValueError)):
            # TODO: Call {method_name} with None
            pass
'''

    content = f'''"""Guard clause tests for {class_name}#{method_name}.

Auto-generated from DSTI intent signals.
"""
import pytest


class Test{class_name.capitalize()}{method_name.capitalize()}Guards:
{tests}
'''

    return [{"path": f"{output_dir}/{test_file}", "content": content, "type": "guard"}]
