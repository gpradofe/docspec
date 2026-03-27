// @docspec:module {
//   id: "docspec-dsti-typescript-guard-tests-template",
//   name: "Guard Clause Test Template (TypeScript/Vitest)",
//   description: "Generates Vitest test cases for guard clause verification. Creates one expect().toThrow() test per detected guard clause plus a null/undefined rejection test, all driven by DSTI intent signals.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { TypeScriptTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * Derives a representative invalid input value from a guard condition string.
 */
function deriveInvalidInput(condition: string): string {
  if (/==\s*null|===\s*null|is\s+null/i.test(condition)) return "null as any";
  if (/==\s*undefined|===\s*undefined/.test(condition)) return "undefined as any";
  if (/<\s*0|<=\s*0/.test(condition)) return "-1";
  if (/>\s*\d+/.test(condition)) {
    const match = condition.match(/>\s*(\d+)/);
    return match ? String(parseInt(match[1]) + 1) : "Number.MAX_SAFE_INTEGER";
  }
  if (/isEmpty|\.length\s*===?\s*0|=== ''|=== ""/.test(condition)) return "''";
  return "null as any";
}

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

    const invalidInput = deriveInvalidInput(condition);
    testCases += `
  it('should enforce guard: ${escapeTS(condition)}', () => {
    // Guard type: ${boundary}
    // Expected error: ${error}
    expect(() => {
      instance.${methodName}(${invalidInput});
    }).toThrow(${error});
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
    const branches = Array.isArray(signals.branches) ? signals.branches : [];
    const branchAssertions = branches.map((b, idx) => {
      const cond = b.condition ?? `condition ${idx + 1}`;
      const output = b.output ?? "defined";
      return `    // Branch ${idx + 1}: ${escapeTS(cond)} -> ${escapeTS(output)}`;
    }).join("\n");
    testCases += `
  it('should handle all ${branchCount} branch conditions', () => {
    // ${branchCount} branches detected — each path should produce a defined result
${branchAssertions ? branchAssertions + "\n" : ""}    const result = instance.${methodName}(null as any);
    expect(result).toBeDefined();
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
  let instance: any; // Replace with actual ${className} type

  beforeEach(() => {
    instance = new ${className}();
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
