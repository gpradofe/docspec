// @docspec:module {
//   id: "docspec-dsti-typescript-guard-tests-template",
//   name: "Guard Clause Test Template (TypeScript/Vitest)",
//   description: "Generates Vitest test cases for guard clause verification. Creates one expect().toThrow() test per detected guard clause plus a null/undefined rejection test, all driven by DSTI intent signals.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { TypeScriptTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates Vitest guard clause test stubs from DSTI intent signals"
 * @docspec:deterministic
 */
export function generateGuardTests(method: IntentMethod, config: TypeScriptTestGeneratorConfig): GeneratedTestFile[] {
  const { className, methodName } = parseQualified(method.qualified);
  const testFileName = `${camelToKebab(className)}.${camelToKebab(methodName)}.guard.test.ts`;

  const signals = method.intentSignals!;
  const guardCount = typeof signals.guardClauses === "number"
    ? signals.guardClauses
    : (Array.isArray(signals.guardClauses) ? signals.guardClauses.length : 0);

  const nullChecks = signals.nullChecks ?? 0;
  const branchCount = typeof signals.branches === "number"
    ? signals.branches
    : (Array.isArray(signals.branches) ? signals.branches.length : 0);

  let testCases = "";

  // Generate a test for each guard clause
  for (let i = 0; i < guardCount; i++) {
    const guardInfo = Array.isArray(signals.guardClauses) ? signals.guardClauses[i] : null;
    const condition = guardInfo?.condition ?? `guard condition ${i + 1}`;
    const error = guardInfo?.error ?? "Error";
    const boundary = guardInfo?.boundary ?? "input";

    testCases += `
  it('should enforce guard: ${escapeTS(condition)}', () => {
    // Guard type: ${boundary}
    // Expected error: ${error}
    expect(() => {
      instance.${methodName}(/* invalid ${boundary} input */);
    }).toThrow();
  });
`;
  }

  // Generate null/undefined rejection tests based on null check count
  if (nullChecks > 0 || guardCount > 0) {
    testCases += `
  it('should reject null input', () => {
    // ${nullChecks} null checks detected in source
    expect(() => {
      instance.${methodName}(null as any);
    }).toThrow();
  });

  it('should reject undefined input', () => {
    expect(() => {
      instance.${methodName}(undefined as any);
    }).toThrow();
  });
`;
  }

  // Add branch coverage smoke test when branch count is high
  if (branchCount >= 3) {
    testCases += `
  it('should handle all ${branchCount} branch conditions', () => {
    // ${branchCount} branches detected — consider testing each path
    // TODO: Add tests for each conditional branch
    expect(true).toBe(true);
  });
`;
  }

  const content = `import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Guard clause tests for ${className}#${methodName}.
 * Auto-generated from DSTI intent signals.
 *
 * ${guardCount} guard clause(s) detected.
 * ${nullChecks} null check(s) detected.
 * ${branchCount} branch(es) detected.
 */
describe('${className}#${methodName} — Guard Clauses', () => {
  let instance: any; // TODO: Replace with actual type

  beforeEach(() => {
    // TODO: Initialize instance
    // instance = new ${className}(...);
  });
${testCases}
});
`;

  return [{
    path: `${config.outputDir}/${testFileName}`,
    content,
    type: "guard",
  }];
}

function parseQualified(qualified: string): { className: string; methodName: string } {
  const parts = qualified.split("#");
  const className = parts[0].split(".").pop() ?? "Unknown";
  const methodName = parts[1] ?? "unknownMethod";
  return { className, methodName };
}

function camelToKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function escapeTS(s: string): string {
  return s.replace(/'/g, "\\'").replace(/\n/g, "\\n");
}
