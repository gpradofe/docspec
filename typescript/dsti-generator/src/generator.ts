// @docspec:module {
//   id: "docspec-ts-dsti-test-generator",
//   name: "TypeScript DSTI Test Generator",
//   description: "Generates test stubs from DSTI intent graphs for TypeScript projects. Produces guard clause tests and property-based tests (via fast-check) driven by extracted intent signals. Supports vitest and jest frameworks.",
//   since: "3.0.0"
// }

import type { IntentGraph, IntentMethod, IntentSignals } from "@docspec/dsti-core";
import { generateGuardTests } from "./templates/guard-tests.js";
import { generatePropertyTests } from "./templates/property-tests.js";

export interface TSTestGeneratorConfig {
  framework?: "vitest" | "jest";
  propertyTesting?: boolean;
  outputDir?: string;
}

export interface GeneratedTestFile {
  path: string;
  content: string;
  type: "guard" | "property";
}

export class TypeScriptTestGenerator {
  private config: TSTestGeneratorConfig;

  constructor(config: TSTestGeneratorConfig = {}) {
    this.config = {
      framework: config.framework ?? "vitest",
      propertyTesting: config.propertyTesting ?? true,
      outputDir: config.outputDir ?? "src/__tests__",
    };
  }

  generate(intentGraph: IntentGraph): GeneratedTestFile[] {
    const files: GeneratedTestFile[] = [];
    const methods = intentGraph.methods ?? [];

    for (const method of methods) {
      if (!method.intentSignals) continue;

      const guardCount = typeof method.intentSignals.guardClauses === "number"
        ? method.intentSignals.guardClauses
        : Array.isArray(method.intentSignals.guardClauses) ? method.intentSignals.guardClauses.length : 0;

      if (guardCount > 0) {
        files.push(...generateGuardTests(method, this.config));
      }

      if (this.config.propertyTesting) {
        files.push(...generatePropertyTests(method, this.config));
      }
    }

    return files;
  }
}
