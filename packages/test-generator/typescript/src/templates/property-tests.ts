// @docspec:module {
//   id: "docspec-ts-dsti-property-tests-template",
//   name: "Property-Based Test Template (TypeScript)",
//   description: "Generates fast-check property-based test stubs driven by DSTI intent signals. Creates idempotency tests for queries, state-change tests for mutations/creations, and purity tests for validations.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import { mapDslToAssertions } from "@docspec/dsti-core";
import type { TSTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates property-based test stubs using intent-driven templates"
 * @docspec:deterministic
 */
export function generatePropertyTests(method: IntentMethod, config: TSTestGeneratorConfig): GeneratedTestFile[] {
  const parts = method.qualified.split("#");
  const className = parts[0].split(".").pop() ?? "Unknown";
  const methodName = parts[1] ?? "unknownMethod";
  const testFileName = `${className}.${methodName}.property.test.ts`;
  const signals = method.intentSignals!;
  const intent = signals.nameSemantics?.intent;

  let tests = "";

  if (intent === "query") {
    tests += `
  it.prop("query is idempotent", [fc.string()], (input) => {
    // const result1 = sut.${methodName}(input);
    // const result2 = sut.${methodName}(input);
    // expect(result1).toEqual(result2);
  });
`;
  }

  if (intent === "creation" || intent === "mutation") {
    tests += `
  it.prop("mutation changes state", [fc.string()], (input) => {
    // const before = sut.getState();
    // sut.${methodName}(input);
    // const after = sut.getState();
    // expect(after).not.toEqual(before);
  });
`;
  }

  if (intent === "validation") {
    tests += `
  it.prop("validation is pure", [fc.string()], (input) => {
    // const result1 = sut.${methodName}(input);
    // const result2 = sut.${methodName}(input);
    // expect(result1).toBe(result2);
  });
`;
  }

  // Generate invariant rule tests from @DocInvariant Property DSL expressions
  if (signals.invariantRules) {
    for (const rule of signals.invariantRules) {
      const assertions = mapDslToAssertions(rule);
      const safeRuleName = rule.replace(/[^a-zA-Z0-9]/g, " ").replace(/\s+/g, " ").trim();
      tests += `
  it("invariant: ${safeRuleName}", () => {
    const result = sut.${methodName}(/* input */);
    ${assertions.typescriptAssertion}
  });
`;
    }
  }

  if (!tests) return [];

  const importLine = config.framework === "vitest"
    ? `import { describe, it, expect } from "vitest";\nimport * as fc from "fast-check";`
    : `import { describe, it, expect } from "@jest/globals";\nimport * as fc from "fast-check";`;

  const content = `${importLine}

/**
 * Property-based tests for ${className}#${methodName}.
 * Auto-generated from DSTI intent signals using fast-check.
 */
describe("${className}#${methodName} — Properties", () => {
${tests}
});
`;

  return [{ path: `${config.outputDir}/${testFileName}`, content, type: "property" }];
}
