// @docspec:module {
//   id: "docspec-dsti-java-mock-setup-template",
//   name: "Mock Setup Fixture Template (Java/Mockito)",
//   description: "Generates Mockito @Mock field declarations and @BeforeEach setup methods based on DSTI dependency analysis. Creates a test fixture class with mock fields for each detected dependency.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { JavaTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates Mockito mock setup fixtures from DSTI dependency signals"
 * @docspec:deterministic
 */
export function generateMockSetup(method: IntentMethod, config: JavaTestGeneratorConfig): GeneratedTestFile[] {
  const parts = method.qualified.split("#");
  const className = parts[0].split(".").pop() ?? "Unknown";
  const methodName = parts[1] ?? "unknownMethod";
  const testClassName = `${className}TestFixture`;
  const packageName = config.basePackage ?? "io.docspec.generated";
  const packagePath = packageName.replace(/\./g, "/");

  const signals = method.intentSignals!;
  const deps = Array.isArray(signals.dependencies) ? signals.dependencies : [];

  let mockFields = "";
  let mockSetup = "";

  for (const dep of deps.slice(0, 10)) {
    const depName = typeof dep === "string" ? dep : dep.name ?? "unknown";
    const simpleName = depName.split(".").pop() ?? depName;
    const fieldName = simpleName.charAt(0).toLowerCase() + simpleName.slice(1);

    mockFields += `    @Mock\n    private ${simpleName} ${fieldName};\n`;
    mockSetup += `        // Configure ${fieldName} mock behavior\n`;
  }

  const content = `package ${packageName};

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.*;

/**
 * Mock setup fixture for ${className} tests.
 * Auto-generated from DSTI dependency analysis.
 */
@ExtendWith(MockitoExtension.class)
class ${testClassName} {

${mockFields}
    private ${className} sut;

    @BeforeEach
    void setUp() {
${mockSetup}
        // sut = new ${className}(...);
    }
}
`;

  return [{
    path: `${config.outputDir}/${packagePath}/${testClassName}.java`,
    content,
    type: "mock-setup",
  }];
}
