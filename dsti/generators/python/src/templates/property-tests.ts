// @docspec:module {
//   id: "docspec-dsti-python-property-tests-template",
//   name: "Property-Based Test Template (Python/Hypothesis)",
//   description: "Generates Hypothesis property-based test methods driven by DSTI intent signals. Creates idempotency tests for queries, state-change tests for mutations, conservation tests for read/write methods, and stream/iteration tests.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { PythonTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates Hypothesis property-based test stubs using intent-driven templates"
 * @docspec:deterministic
 */
export function generatePropertyTests(method: IntentMethod, config: PythonTestGeneratorConfig): GeneratedTestFile[] {
  const { className, methodName, modulePath } = parseQualified(method.qualified);
  const snakeMethod = camelToSnake(methodName);
  const snakeClass = camelToSnake(className);
  const testFileName = `test_${snakeClass}_${snakeMethod}_property.py`;

  const signals = method.intentSignals!;
  const intent = signals.nameSemantics?.intent;
  const isd = signals.intentDensityScore ?? 0;
  const hasReads = (signals.dataFlow?.reads?.length ?? 0) > 0;
  const hasWrites = (signals.dataFlow?.writes?.length ?? 0) > 0;
  const hasStreams = signals.loopProperties?.hasStreams ?? false;
  const hasEnhancedFor = signals.loopProperties?.hasEnhancedFor ?? false;
  const streamOps = signals.loopProperties?.streamOps ?? [];
  const catchBlocks = signals.errorHandling?.catchBlocks ?? 0;
  const caughtTypes = signals.errorHandling?.caughtTypes ?? [];

  let testMethods = "";

  // Idempotency property for queries
  if (intent === "query") {
    testMethods += `
    @given(st.text(max_size=100))
    def test_${snakeMethod}_is_idempotent(self, instance, input_val):
        """Calling ${snakeMethod} twice with the same input should return the same result."""
        result1 = instance.${snakeMethod}(input_val)
        result2 = instance.${snakeMethod}(input_val)
        assert result1 == result2
`;
  }

  // Mutation property: state changes
  if (intent === "creation" || intent === "mutation") {
    testMethods += `
    @given(st.text(max_size=100))
    def test_${snakeMethod}_changes_state(self, instance, input_val):
        """Calling ${snakeMethod} should produce observable state change."""
        before = hash(repr(instance))
        instance.${snakeMethod}(input_val)
        after = hash(repr(instance))
        assert before != after
`;
  }

  // Conservation property: data integrity across read/write
  if (hasReads && hasWrites) {
    const reads = signals.dataFlow!.reads!.join(", ");
    const writes = signals.dataFlow!.writes!.join(", ");
    testMethods += `
    @given(st.integers(min_value=0, max_value=1000))
    def test_${snakeMethod}_preserves_data_integrity(self, instance, value):
        """
        Conservation property: data integrity preserved across reads and writes.
        Reads: ${reads}
        Writes: ${writes}
        """
        total_before = instance.count()
        instance.${snakeMethod}(value)
        total_after = instance.count()
        assert total_after >= total_before
`;
  }

  // Iteration/stream property
  if (hasStreams || hasEnhancedFor) {
    const ops = streamOps.length > 0 ? streamOps.join(" -> ") : "iteration";
    testMethods += `
    @given(st.lists(st.integers(), max_size=50))
    def test_${snakeMethod}_iteration_preserves_structure(self, instance, items):
        """
        Iteration property: ${ops}.
        Pipeline should not produce more elements than input.
        """
        result = instance.${snakeMethod}(items)
        assert len(result) <= len(items)
`;
  }

  // Null safety for high ISD
  if (isd >= 0.6) {
    testMethods += `
    @given(st.text(max_size=200))
    def test_${snakeMethod}_never_returns_none(self, instance, input_val):
        """High ISD (${isd.toFixed(2)}) implies robust None handling."""
        result = instance.${snakeMethod}(input_val)
        assert result is not None
`;
  }

  // Error handling round-trip
  if (catchBlocks > 0 && isd >= 0.4) {
    const types = caughtTypes.length > 0 ? caughtTypes.join(", ") : "general exceptions";
    testMethods += `
    @given(st.from_type(type).flatmap(st.from_type))
    def test_${snakeMethod}_handles_errors_gracefully(self, instance, input_val):
        """
        Error handling: ${catchBlocks} catch block(s) for ${types}.
        Method should not raise unhandled exceptions.
        """
        try:
            instance.${snakeMethod}(input_val)
        except (ValueError, TypeError, RuntimeError):
            pass  # expected error types
`;
  }

  // Transformation property: output type stability
  if (intent === "transformation") {
    testMethods += `
    @given(st.text(max_size=100))
    def test_${snakeMethod}_returns_consistent_type(self, instance, input_val):
        """Transformation should always return the same type."""
        result = instance.${snakeMethod}(input_val)
        assert result is not None
        assert type(result) == type(instance.${snakeMethod}(""))
`;
  }

  if (!testMethods) return [];

  const content = `"""
Property-based tests for ${className}.${methodName}.
Auto-generated from DSTI intent signals using Hypothesis.

ISD Score: ${isd.toFixed(2)}
Intent: ${intent ?? "unknown"}
"""
import pytest
from hypothesis import given, strategies as st, assume, settings
# from ${modulePath} import ${className}


class Test${className}${capitalize(methodName)}Property:
    """Property-based tests for ${className}.${methodName}."""

    @pytest.fixture
    def instance(self):
        """Create a ${className} instance for testing."""
        return ${className}()
${testMethods}
`;

  return [{
    path: `${config.outputDir}/${testFileName}`,
    content,
    type: "property",
  }];
}

function parseQualified(qualified: string): { className: string; methodName: string; modulePath: string } {
  const parts = qualified.split("#");
  const fullClass = parts[0];
  const className = fullClass.split(".").pop() ?? "Unknown";
  const methodName = parts[1] ?? "unknownMethod";
  const modulePath = fullClass.split(".").slice(0, -1).join(".");
  return { className, methodName, modulePath };
}

function camelToSnake(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
