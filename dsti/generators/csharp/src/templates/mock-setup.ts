// @docspec:module {
//   id: "docspec-dsti-csharp-mock-setup-template",
//   name: "Mock Setup Fixture Template (C#/Moq)",
//   description: "Generates Moq mock declarations and test fixture setup based on DSTI dependency analysis. Creates a test fixture class with Mock<T> fields for each detected dependency.",
//   since: "3.0.0"
// }

import type { IntentMethod, DependencyInfo } from "@docspec/dsti-core";
import type { CSharpTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates Moq mock setup fixtures from DSTI dependency signals"
 * @docspec:deterministic
 */
export function generateMockSetup(method: IntentMethod, config: CSharpTestGeneratorConfig): GeneratedTestFile[] {
  const { className, methodName } = parseQualified(method.qualified);
  const testClassName = `${className}TestFixture`;
  const ns = config.baseNamespace ?? "DocSpec.Generated.Tests";

  const signals = method.intentSignals!;
  const deps = Array.isArray(signals.dependencies) ? signals.dependencies : [];

  let mockFields = "";
  let mockSetup = "";
  let ctorArgs: string[] = [];

  for (const dep of deps.slice(0, 10)) {
    const depName = typeof dep === "string" ? dep : dep.name ?? "unknown";
    const classification = typeof dep === "object" && "classification" in dep ? (dep as DependencyInfo).classification : "other";
    const simpleName = depName.split(".").pop() ?? depName;
    const fieldName = `_mock${simpleName}`;
    const interfaceName = `I${simpleName}`;

    mockFields += `    private readonly Mock<${interfaceName}> ${fieldName} = new();\n`;
    mockSetup += `        // Dependency: ${simpleName} (${classification ?? "unknown"})\n`;
    ctorArgs.push(`${fieldName}.Object`);
  }

  const content = `using Moq;
using Xunit;

namespace ${ns};

/// <summary>
/// Mock setup fixture for ${className} tests.
/// Auto-generated from DSTI dependency analysis.
///
/// Dependencies detected: ${deps.length}
/// </summary>
public class ${testClassName}
{
${mockFields}
    private readonly ${className} _sut;

    public ${testClassName}()
    {
${mockSetup}
        _sut = new ${className}(${ctorArgs.join(", ")});
    }

    [Fact]
    public void FixtureCanBeConstructed()
    {
        Assert.NotNull(_sut);
    }
}
`;

  return [{
    path: `${config.outputDir}/${testClassName}.cs`,
    content,
    type: "mock-setup",
  }];
}

function parseQualified(qualified: string): { className: string; methodName: string } {
  const parts = qualified.split("#");
  const className = parts[0].split(".").pop() ?? "Unknown";
  const methodName = parts[1] ?? "unknownMethod";
  return { className, methodName };
}
