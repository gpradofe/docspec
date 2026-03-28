// @docspec:module {
//   id: "docspec-ts-dsti-guard-tests-template",
//   name: "Guard Clause Test Template (TypeScript)",
//   description: "Generates vitest/jest test stubs for guard clause verification. Creates one test case per detected guard clause plus a null/undefined rejection test, all driven by DSTI intent signals.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { TSTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates guard clause test stubs from DSTI intent signals"
 * @docspec:deterministic
 */
export function generateGuardTests(method: IntentMethod, config: TSTestGeneratorConfig): GeneratedTestFile[] {
  const parts = method.qualified.split("#");
  const className = parts[0].split(".").pop() ?? "Unknown";
  const methodName = parts[1] ?? "unknownMethod";
  const testFileName = `${className}.${methodName}.guard.test.ts`;

  const signals = method.intentSignals!;
  const guardCount = typeof signals.guardClauses === "number"
    ? signals.guardClauses
    : Array.isArray(signals.guardClauses) ? signals.guardClauses.length : 0;

  const importLine = config.framework === "vitest"
    ? `import { describe, it, expect } from "vitest";`
    : `import { describe, it, expect } from "@jest/globals";`;

  let tests = "";
  for (let i = 0; i < guardCount; i++) {
    const guard = Array.isArray(signals.guardClauses) ? signals.guardClauses[i] : null;
    const condition = guard?.condition ?? `guard condition ${i + 1}`;

    tests += `
  it("should enforce guard: ${condition.replace(/"/g, '\\"')}", () => {
    // Given: input that violates the guard
    // When/Then: expect error to be thrown
    expect(() => {
      // TODO: Call ${methodName} with invalid input
    }).toThrow();
  });
`;
  }

  tests += `
  it("should reject null/undefined input", () => {
    expect(() => {
      // TODO: Call ${methodName} with null
    }).toThrow();
  });
`;

  const content = `${importLine}

/**
 * Guard clause tests for ${className}#${methodName}.
 * Auto-generated from DSTI intent signals.
 */
describe("${className}#${methodName} — Guard Clauses", () => {
${tests}
});
`;

  return [{ path: `${config.outputDir}/${testFileName}`, content, type: "guard" }];
}
