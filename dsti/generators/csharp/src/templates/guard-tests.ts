// @docspec:module {
//   id: "docspec-dsti-csharp-guard-tests-template",
//   name: "Guard Clause Test Template (C#/xUnit)",
//   description: "Generates xUnit test methods for guard clause verification. Creates one Assert.Throws test per detected guard clause plus a null rejection test, all driven by DSTI intent signals.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { CSharpTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * Derives a representative invalid input expression for C# from a guard condition string.
 */
function deriveInvalidInput(condition: string): string {
  if (/==\s*null|is\s+null/i.test(condition)) return "null";
  if (/<\s*0|<=\s*0/.test(condition)) return "-1";
  if (/>\s*\d+/.test(condition)) {
    const match = condition.match(/>\s*(\d+)/);
    return match ? String(parseInt(match[1]) + 1) : "int.MaxValue";
  }
  if (/IsNullOrEmpty|IsNullOrWhiteSpace|\.Length\s*==\s*0/.test(condition)) return '""';
  return "null!";
}

/**
 * Maps Java-style exception names to C# exception types.
 */
function mapToCSharpException(error: string): string {
  const map: Record<string, string> = {
    "IllegalArgumentException": "ArgumentException",
    "NullPointerException": "ArgumentNullException",
    "IllegalStateException": "InvalidOperationException",
    "IndexOutOfBoundsException": "ArgumentOutOfRangeException",
    "UnsupportedOperationException": "NotSupportedException",
    "IOException": "IOException",
    "SecurityException": "UnauthorizedAccessException",
    "ArithmeticException": "ArithmeticException",
  };
  return map[error] ?? error;
}

/**
 * @docspec:intentional "Generates xUnit guard clause tests from DSTI intent signals"
 * @docspec:deterministic
 */
export function generateGuardTests(method: IntentMethod, config: CSharpTestGeneratorConfig): GeneratedTestFile[] {
  const { className, methodName } = parseQualified(method.qualified);
  const testClassName = `${className}${capitalize(methodName)}GuardTests`;
  const ns = config.baseNamespace ?? "DocSpec.Generated.Tests";

  const signals = method.intentSignals!;
  const guardCount = typeof signals.guardClauses === "number"
    ? signals.guardClauses
    : (Array.isArray(signals.guardClauses) ? signals.guardClauses.length : 0);

  const nullChecks = signals.nullChecks ?? 0;

  let testMethods = "";

  // Generate a test for each guard clause
  for (let i = 0; i < guardCount; i++) {
    const guardInfo = Array.isArray(signals.guardClauses) ? signals.guardClauses[i] : null;
    const condition = guardInfo?.condition ?? `guard condition ${i + 1}`;
    const error = guardInfo?.error ?? "ArgumentException";
    const csError = mapToCSharpException(error);
    const invalidInput = deriveInvalidInput(condition);

    testMethods += `
    [Fact]
    [Trait("Category", "Guard")]
    public void ShouldEnforceGuard${i + 1}()
    {
        // Guard: ${escapeCS(condition)}
        Assert.Throws<${csError}>(() => _sut.${capitalize(methodName)}(${invalidInput}));
    }
`;
  }

  // Add null parameter test
  if (nullChecks > 0 || guardCount > 0) {
    testMethods += `
    [Fact]
    [Trait("Category", "Guard")]
    public void ShouldRejectNullInput()
    {
        Assert.Throws<ArgumentNullException>(() => _sut.${capitalize(methodName)}(null!));
    }
`;
  }

  const content = `using Xunit;

namespace ${ns};

/// <summary>
/// Guard clause tests for ${className}.${methodName}.
/// Auto-generated from DSTI intent signals.
/// </summary>
public class ${testClassName}
{
    private readonly ${className} _sut = new();
${testMethods}
}
`;

  return [{
    path: `${config.outputDir}/${testClassName}.cs`,
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeCS(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
