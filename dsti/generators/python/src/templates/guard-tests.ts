// @docspec:module {
//   id: "docspec-dsti-python-guard-tests-template",
//   name: "Guard Clause Test Template (Python/pytest)",
//   description: "Generates pytest test functions for guard clause verification. Creates one pytest.raises test per detected guard clause plus None rejection tests, all driven by DSTI intent signals.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { PythonTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates pytest guard clause test stubs from DSTI intent signals"
 * @docspec:deterministic
 */
export function generateGuardTests(method: IntentMethod, config: PythonTestGeneratorConfig): GeneratedTestFile[] {
  const { className, methodName, modulePath } = parseQualified(method.qualified);
  const snakeMethod = camelToSnake(methodName);
  const snakeClass = camelToSnake(className);
  const testFileName = `test_${snakeClass}_${snakeMethod}_guards.py`;

  const signals = method.intentSignals!;
  const guardCount = typeof signals.guardClauses === "number"
    ? signals.guardClauses
    : (Array.isArray(signals.guardClauses) ? signals.guardClauses.length : 0);

  const nullChecks = signals.nullChecks ?? 0;
  const branchCount = typeof signals.branches === "number"
    ? signals.branches
    : (Array.isArray(signals.branches) ? signals.branches.length : 0);

  let testMethods = "";

  // Generate a test for each guard clause
  for (let i = 0; i < guardCount; i++) {
    const guardInfo = Array.isArray(signals.guardClauses) ? signals.guardClauses[i] : null;
    const condition = guardInfo?.condition ?? `guard condition ${i + 1}`;
    const error = guardInfo?.error ?? "ValueError";
    const boundary = guardInfo?.boundary ?? "input";
    const pyError = mapToPythonException(error);

    testMethods += `
    def test_${snakeMethod}_enforces_guard_${i + 1}(self, instance):
        """Guard: ${escapePy(condition)} (${boundary})"""
        # Expected error: ${pyError}
        with pytest.raises(${pyError}):
            instance.${snakeMethod}(None)  # TODO: provide invalid ${boundary} input
`;
  }

  // Generate None rejection tests
  if (nullChecks > 0 || guardCount > 0) {
    testMethods += `
    def test_${snakeMethod}_rejects_none(self, instance):
        """${nullChecks} null check(s) detected in source"""
        with pytest.raises((TypeError, ValueError)):
            instance.${snakeMethod}(None)
`;
  }

  // Branch coverage hint
  if (branchCount >= 3) {
    testMethods += `
    def test_${snakeMethod}_covers_branches(self, instance):
        """${branchCount} branches detected - consider parametrized testing"""
        # TODO: Use @pytest.mark.parametrize for each branch path
        pass
`;
  }

  const content = `"""
Guard clause tests for ${className}.${methodName}.
Auto-generated from DSTI intent signals.

Guard clauses: ${guardCount}
Null checks: ${nullChecks}
Branches: ${branchCount}
"""
import pytest
# from ${modulePath} import ${className}


class Test${className}${capitalize(methodName)}Guards:
    """Tests guard clauses for ${className}.${methodName}."""

    @pytest.fixture
    def instance(self):
        """Create a ${className} instance for testing."""
        # TODO: Initialize with required dependencies
        # return ${className}(...)
        pass
${testMethods}
`;

  return [{
    path: `${config.outputDir}/${testFileName}`,
    content,
    type: "guard",
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

function escapePy(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function mapToPythonException(javaException: string): string {
  const map: Record<string, string> = {
    "IllegalArgumentException": "ValueError",
    "NullPointerException": "TypeError",
    "IllegalStateException": "RuntimeError",
    "IndexOutOfBoundsException": "IndexError",
    "UnsupportedOperationException": "NotImplementedError",
    "IOException": "IOError",
    "FileNotFoundException": "FileNotFoundError",
    "SecurityException": "PermissionError",
    "ArithmeticException": "ArithmeticError",
    "ClassCastException": "TypeError",
  };
  return map[javaException] ?? "Exception";
}
