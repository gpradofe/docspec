// @docspec:module {
//   id: "docspec-dsti-typescript-test-generator",
//   name: "TypeScript DSTI Test Generator",
//   description: "Generates Vitest + fast-check test stubs from DSTI intent graphs for TypeScript projects. Produces guard clause tests, property-based tests with fast-check, and mock setup fixtures driven by extracted intent signals.",
//   since: "3.0.0"
// }

import type { IntentGraph, IntentMethod, IntentSignals } from "@docspec/dsti-core";
import { generateGuardTests } from "./templates/guard-tests.js";
import { generatePropertyTests } from "./templates/property-tests.js";
import { generateMockSetup } from "./templates/mock-setup.js";

export interface TypeScriptTestGeneratorConfig {
  framework?: "vitest" | "jest";
  propertyTesting?: boolean;
  mockFramework?: "vi" | "jest";
  outputDir?: string;
}

export interface GeneratedTestFile {
  path: string;
  content: string;
  type: "guard" | "property" | "mock-setup" | "integration";
}

/**
 * Resolves the guard clause count from either a number or an array of GuardClause objects.
 */
export function resolveGuardCount(signals: IntentSignals): number {
  return typeof signals.guardClauses === "number"
    ? signals.guardClauses
    : Array.isArray(signals.guardClauses)
      ? signals.guardClauses.length
      : 0;
}

/**
 * Resolves the branch count from either a number or an array of BranchInfo objects.
 */
export function resolveBranchCount(signals: IntentSignals): number {
  return typeof signals.branches === "number"
    ? signals.branches
    : Array.isArray(signals.branches)
      ? signals.branches.length
      : 0;
}

/**
 * Determines test complexity tier based on ISD score.
 * - low  (< 0.3): basic smoke tests only
 * - mid  (0.3-0.6): smoke + guard + basic property tests
 * - high (> 0.6): full property-based + mock + integration tests
 */
export function getComplexityTier(signals: IntentSignals): "low" | "mid" | "high" {
  const isd = signals.intentDensityScore ?? 0;
  if (isd >= 0.6) return "high";
  if (isd >= 0.3) return "mid";
  return "low";
}

export class TypeScriptTestGenerator {
  private config: TypeScriptTestGeneratorConfig;

  constructor(config: TypeScriptTestGeneratorConfig = {}) {
    this.config = {
      framework: config.framework ?? "vitest",
      propertyTesting: config.propertyTesting ?? true,
      mockFramework: config.mockFramework ?? "vi",
      outputDir: config.outputDir ?? "src/__generated__",
    };
  }

  generate(intentGraph: IntentGraph): GeneratedTestFile[] {
    const files: GeneratedTestFile[] = [];
    const methods = intentGraph.methods ?? [];

    for (const method of methods) {
      if (!method.intentSignals) continue;
      const signals = method.intentSignals;
      const tier = getComplexityTier(signals);

      // Generate guard clause tests (all tiers)
      const guardCount = resolveGuardCount(signals);
      if (guardCount > 0) {
        files.push(...generateGuardTests(method, this.config));
      }

      // Generate property-based tests (mid and high tiers)
      if (this.config.propertyTesting && tier !== "low") {
        files.push(...generatePropertyTests(method, this.config));
      }

      // Generate mock setup (high tier only)
      const deps = signals.dependencies;
      const depCount = Array.isArray(deps) ? deps.length : 0;
      if (depCount > 0 && tier === "high") {
        files.push(...generateMockSetup(method, this.config));
      }
    }

    return files;
  }
}
