// @docspec:module {
//   id: "docspec-dsti-csharp-property-tests-template",
//   name: "Property-Based Test Template (C#/FsCheck)",
//   description: "Generates FsCheck property-based test methods driven by DSTI intent signals. Creates idempotency tests for queries, state-change tests for mutations, conservation tests when reads/writes coexist, and null-safety tests for high-ISD methods.",
//   since: "3.0.0"
// }

import type { IntentMethod } from "@docspec/dsti-core";
import type { CSharpTestGeneratorConfig, GeneratedTestFile } from "../generator.js";

/**
 * @docspec:intentional "Generates FsCheck property-based test stubs using intent-driven templates"
 * @docspec:deterministic
 */
export function generatePropertyTests(method: IntentMethod, config: CSharpTestGeneratorConfig): GeneratedTestFile[] {
  const { className, methodName } = parseQualified(method.qualified);
  const testClassName = `${className}${capitalize(methodName)}PropertyTests`;
  const ns = config.baseNamespace ?? "DocSpec.Generated.Tests";

  const signals = method.intentSignals!;
  const intent = signals.nameSemantics?.intent;
  const isd = signals.intentDensityScore ?? 0;
  const hasReads = (signals.dataFlow?.reads?.length ?? 0) > 0;
  const hasWrites = (signals.dataFlow?.writes?.length ?? 0) > 0;
  const hasStreams = signals.loopProperties?.hasStreams ?? false;
  const streamOps = signals.loopProperties?.streamOps ?? [];
  const catchBlocks = signals.errorHandling?.catchBlocks ?? 0;

  let testMethods = "";

  // Idempotency property for queries
  if (intent === "query") {
    testMethods += `
    [Property]
    public void QueryIsIdempotent(NonEmptyString input)
    {
        var result1 = _sut.${capitalize(methodName)}(input.Get);
        var result2 = _sut.${capitalize(methodName)}(input.Get);
        Assert.Equal(result1, result2);
    }
`;
  }

  // Mutation property: state changes
  if (intent === "creation" || intent === "mutation") {
    testMethods += `
    [Property]
    public void MutationChangesState(NonEmptyString input)
    {
        var stateBefore = _sut.GetHashCode();
        _sut.${capitalize(methodName)}(input.Get);
        var stateAfter = _sut.GetHashCode();
        Assert.NotEqual(stateBefore, stateAfter);
    }
`;
  }

  // Conservation property: data integrity across read/write
  if (hasReads && hasWrites) {
    const reads = signals.dataFlow!.reads!.join(", ");
    const writes = signals.dataFlow!.writes!.join(", ");
    testMethods += `
    [Property]
    public void ConservesDataIntegrity(PositiveInt value)
    {
        // Reads: ${reads}
        // Writes: ${writes}
        var totalBefore = _sut.Count();
        _sut.${capitalize(methodName)}(value.Get);
        var totalAfter = _sut.Count();
        Assert.True(totalAfter >= totalBefore);
    }
`;
  }

  // Stream/LINQ pipeline property
  if (hasStreams && streamOps.length > 0) {
    testMethods += `
    [Property]
    public void LinqPipelinePreservsBounds(int[] items)
    {
        // LINQ ops: ${streamOps.join(", ")}
        var result = _sut.${capitalize(methodName)}(items);
        Assert.True(result.Count() <= items.Length);
    }
`;
  }

  // Null safety for high ISD
  if (isd >= 0.6) {
    testMethods += `
    [Property]
    public void NeverReturnsNullForValidInput(NonEmptyString input)
    {
        // High ISD (${isd.toFixed(2)}) implies robust null handling
        var result = _sut.${capitalize(methodName)}(input.Get);
        Assert.NotNull(result);
    }
`;
  }

  // Error handling round-trip
  if (catchBlocks > 0 && isd >= 0.4) {
    testMethods += `
    [Fact]
    public void HandlesErrorsGracefully()
    {
        // ${catchBlocks} catch block(s) detected — method should not throw unhandled
        var ex = Record.Exception(() => _sut.${capitalize(methodName)}(""));
        Assert.Null(ex);
    }
`;
  }

  if (!testMethods) return [];

  const content = `using Xunit;
using FsCheck;
using FsCheck.Xunit;

namespace ${ns};

/// <summary>
/// Property-based tests for ${className}.${methodName}.
/// Auto-generated from DSTI intent signals using FsCheck.
///
/// ISD Score: ${isd.toFixed(2)}
/// Intent: ${intent ?? "unknown"}
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
    type: "property",
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
