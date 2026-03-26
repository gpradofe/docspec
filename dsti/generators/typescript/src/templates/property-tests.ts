// @docspec:module {
//   id: "docspec-dsti-typescript-property-tests-template",
//   name: "Property-Based Test Template (TypeScript/fast-check)",
//   description: "Generates fast-check property-based test methods driven by DSTI intent signals. Creates idempotency tests for queries, state-change tests for mutations, conservation tests when reads/writes coexist, and ordering/monotonic tests from semantic annotations.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { TypeScriptTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates fast-check property-based test stubs using intent-driven templates"
 * @docspec:deterministic
 */
export function generatePropertyTests(method: IntentMethod, config: TypeScriptTestGeneratorConfig): GeneratedTestFile[] {
  const { className, methodName } = parseQualified(method.qualified);
  const testFileName = `${camelToKebab(className)}.${camelToKebab(methodName)}.property.test.ts`;

  const signals = method.intentSignals!;
  const intent = signals.nameSemantics?.intent;
  const isd = signals.intentDensityScore ?? 0;
  const hasReads = (signals.dataFlow?.reads?.length ?? 0) > 0;
  const hasWrites = (signals.dataFlow?.writes?.length ?? 0) > 0;
  const hasStreams = signals.loopProperties?.hasStreams ?? false;
  const streamOps = signals.loopProperties?.streamOps ?? [];

  let testCases = "";

  // Idempotency property: queries called twice produce same result
  if (intent === "query") {
    testCases += `
  it('query is idempotent', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 100 }), (input) => {
        // Calling ${methodName} twice with the same input should return the same result
        // const result1 = instance.${methodName}(input);
        // const result2 = instance.${methodName}(input);
        // expect(result1).toEqual(result2);
        return true; // TODO: implement
      })
    );
  });
`;
  }

  // Mutation property: state changes after mutation
  if (intent === "creation" || intent === "mutation") {
    testCases += `
  it('mutation changes observable state', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 100 }), (input) => {
        // Calling ${methodName} should produce a state change
        // const before = instance.getState();
        // instance.${methodName}(input);
        // const after = instance.getState();
        // expect(after).not.toEqual(before);
        return true; // TODO: implement
      })
    );
  });
`;
  }

  // Conservation property: total is preserved across read/write cycles
  if (hasReads && hasWrites) {
    const reads = signals.dataFlow!.reads!.join(", ");
    const writes = signals.dataFlow!.writes!.join(", ");
    testCases += `
  it('preserves data integrity across reads and writes', () => {
    // Reads: ${reads}
    // Writes: ${writes}
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (value) => {
        // ${methodName} should preserve data integrity
        // const totalBefore = instance.getTotal();
        // instance.${methodName}(value);
        // const totalAfter = instance.getTotal();
        // Conservation: totalAfter should relate predictably to totalBefore
        return true; // TODO: implement
      })
    );
  });
`;
  }

  // Stream pipeline property: filter/map chains preserve structure
  if (hasStreams && streamOps.length > 0) {
    testCases += `
  it('stream pipeline preserves element count or reduces (${streamOps.join(" -> ")})', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 50 }), (items) => {
        // Stream ops: ${streamOps.join(", ")}
        // Verify the pipeline does not produce more elements than the input
        // const result = instance.${methodName}(items);
        // expect(result.length).toBeLessThanOrEqual(items.length);
        return true; // TODO: implement
      })
    );
  });
`;
  }

  // Null-safety property for high-ISD methods
  if (isd >= 0.6) {
    testCases += `
  it('never returns null or undefined for valid input', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (input) => {
        // High ISD (${isd.toFixed(2)}) implies robust null handling
        // const result = instance.${methodName}(input);
        // expect(result).not.toBeNull();
        // expect(result).not.toBeUndefined();
        return true; // TODO: implement
      })
    );
  });
`;
  }

  // Error handling round-trip property
  const catchBlocks = signals.errorHandling?.catchBlocks ?? 0;
  if (catchBlocks > 0 && isd >= 0.4) {
    testCases += `
  it('handles errors gracefully without leaking exceptions (${catchBlocks} catch blocks)', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        // ${catchBlocks} catch block(s) detected — method should not throw unhandled
        // expect(() => instance.${methodName}(input)).not.toThrow();
        return true; // TODO: implement
      })
    );
  });
`;
  }

  if (!testCases) return [];

  const content = `import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-based tests for ${className}#${methodName}.
 * Auto-generated from DSTI intent signals using fast-check.
 *
 * ISD Score: ${isd.toFixed(2)}
 * Intent: ${intent ?? "unknown"}
 */
describe('${className}#${methodName} — Properties', () => {
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
    type: "property",
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
