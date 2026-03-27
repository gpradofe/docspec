// @docspec:module {
//   id: "docspec-dsti-typescript-mock-setup-template",
//   name: "Mock Setup Fixture Template (TypeScript/Vitest)",
//   description: "Generates Vitest vi.fn() mock declarations and beforeEach setup methods based on DSTI dependency analysis. Creates a test fixture with mock objects for each detected dependency, classified by type.",
//   since: "3.0.0"
// }

import type { IntentMethod, DependencyInfo } from "@docspec/dsti-core";
import type { TypeScriptTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates Vitest mock setup fixtures from DSTI dependency signals"
 * @docspec:deterministic
 */
export function generateMockSetup(method: IntentMethod, config: TypeScriptTestGeneratorConfig): GeneratedTestFile[] {
  const { className, methodName } = parseQualified(method.qualified);
  const testFileName = `${camelToKebab(className)}.fixture.ts`;

  const signals = method.intentSignals!;
  const deps = Array.isArray(signals.dependencies) ? signals.dependencies : [];

  let mockDeclarations = "";
  let mockAssignments = "";
  let typeImports = "";

  for (const dep of deps.slice(0, 10)) {
    const depName = typeof dep === "string" ? dep : dep.name ?? "unknown";
    const classification = typeof dep === "object" && "classification" in dep ? (dep as DependencyInfo).classification : "other";
    const simpleName = depName.split(".").pop() ?? depName;
    const varName = simpleName.charAt(0).toLowerCase() + simpleName.slice(1);

    // Classify the mock style based on dependency type
    const mockStyle = getMockStyle(classification);

    mockDeclarations += `  let ${varName}: ${mockStyle.type};\n`;
    mockAssignments += `    // Dependency: ${simpleName} (${classification ?? "unknown"})\n`;
    mockAssignments += `    ${varName} = ${mockStyle.factory};\n`;
    typeImports += `// import type { ${simpleName} } from './${camelToKebab(simpleName)}';\n`;
  }

  const content = `import { vi, beforeEach } from 'vitest';

${typeImports}
/**
 * Mock setup fixture for ${className} tests.
 * Auto-generated from DSTI dependency analysis.
 *
 * Dependencies detected: ${deps.length}
 */
${mockDeclarations}
let instance: any; // Replace with ${className}

beforeEach(() => {
${mockAssignments}
    // Initialize instance with mocked dependencies
    instance = new ${className}(${deps.slice(0, 10).map(d => {
      const name = typeof d === "string" ? d : d.name ?? "unknown";
      return name.split(".").pop()!.charAt(0).toLowerCase() + name.split(".").pop()!.slice(1);
    }).join(", ")});
});
`;

  return [{
    path: `${config.outputDir}/${testFileName}`,
    content,
    type: "mock-setup",
  }];
}

interface MockStyle {
  type: string;
  factory: string;
}

function getMockStyle(classification?: string): MockStyle {
  switch (classification) {
    case "repository":
    case "database":
      return {
        type: "any",
        factory: `{
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(undefined),
    }`,
      };
    case "client":
      return {
        type: "any",
        factory: `{
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
    }`,
      };
    case "cache":
      return {
        type: "any",
        factory: `{
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    }`,
      };
    case "message_broker":
      return {
        type: "any",
        factory: `{
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
    }`,
      };
    case "service":
    default:
      return {
        type: "any",
        factory: `{
      // Add mock methods for this service dependency
    }`,
      };
  }
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
