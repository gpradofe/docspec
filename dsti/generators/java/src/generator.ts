// @docspec:module {
//   id: "docspec-dsti-java-test-generator",
//   name: "Java DSTI Test Generator",
//   description: "Generates JUnit 5 test stubs from DSTI intent graphs for Java projects. Produces guard clause tests, jqwik property-based tests, and Mockito mock setup fixtures driven by extracted intent signals.",
//   since: "3.0.0"
// }

import type { IntentGraph, IntentMethod, IntentSignals } from "@docspec/dsti-core";
import { generateGuardTests } from "./templates/guard-tests.js";
import { generatePropertyTests } from "./templates/property-tests.js";
import { generateMockSetup } from "./templates/mock-setup.js";

export interface JavaTestGeneratorConfig {
  framework?: "junit5" | "testng";
  propertyTesting?: boolean;
  mockFramework?: "mockito" | "wiremock";
  containerTesting?: boolean;
  outputDir?: string;
  basePackage?: string;
}

export interface GeneratedTestFile {
  path: string;
  content: string;
  type: "guard" | "property" | "mock-setup" | "integration";
}

export class JavaTestGenerator {
  private config: JavaTestGeneratorConfig;

  constructor(config: JavaTestGeneratorConfig = {}) {
    this.config = {
      framework: config.framework ?? "junit5",
      propertyTesting: config.propertyTesting ?? true,
      mockFramework: config.mockFramework ?? "mockito",
      containerTesting: config.containerTesting ?? false,
      outputDir: config.outputDir ?? "src/test/java",
      basePackage: config.basePackage ?? "io.docspec.generated",
    };
  }

  generate(intentGraph: IntentGraph): GeneratedTestFile[] {
    const files: GeneratedTestFile[] = [];
    const methods = intentGraph.methods ?? [];

    for (const method of methods) {
      if (!method.intentSignals) continue;
      const signals = method.intentSignals;

      // Generate guard clause tests
      const guardCount = typeof signals.guardClauses === "number" ? signals.guardClauses : (Array.isArray(signals.guardClauses) ? signals.guardClauses.length : 0);
      if (guardCount > 0) {
        files.push(...generateGuardTests(method, this.config));
      }

      // Generate property-based tests
      if (this.config.propertyTesting) {
        files.push(...generatePropertyTests(method, this.config));
      }

      // Generate mock setup
      const deps = signals.dependencies;
      const depCount = Array.isArray(deps) ? deps.length : 0;
      if (depCount > 0) {
        files.push(...generateMockSetup(method, this.config));
      }
    }

    return files;
  }
}
