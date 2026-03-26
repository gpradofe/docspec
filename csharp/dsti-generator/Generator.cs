// @docspec:module {
//   id: "docspec-csharp-dsti-generator",
//   name: "DSTI Test Generator",
//   description: "Generates xUnit + Moq + FsCheck test stubs from DSTI intent graph signals, producing guard clause tests and property-based tests.",
//   since: "3.0.0"
// }

using System.Text.Json;

namespace DocSpec.DstiGenerator;

/// <summary>Generate xUnit + Moq + FsCheck test stubs from DSTI signals.</summary>
// [DocIntentional("Transform DSTI intent graph JSON into executable xUnit/FsCheck test stubs")]
// [DocBoundary("code generation")]
public class CSharpTestGenerator
{
    private readonly string _outputDir;

    public CSharpTestGenerator(string outputDir = "Tests/Generated")
    {
        _outputDir = outputDir;
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Parse intent graph JSON and produce guard tests and property-based tests for each method")]
    public List<GeneratedTestFile> Generate(JsonElement intentGraph)
    {
        var files = new List<GeneratedTestFile>();
        var methods = intentGraph.GetProperty("methods").EnumerateArray();

        foreach (var method in methods)
        {
            var qualified = method.GetProperty("qualified").GetString() ?? "unknown";
            var signals = method.GetProperty("intentSignals");

            if (signals.TryGetProperty("guardClauses", out var guards) && guards.GetInt32() > 0)
            {
                files.Add(GenerateGuardTest(qualified, guards.GetInt32()));
            }

            var intent = signals.TryGetProperty("nameSemantics", out var ns) && ns.TryGetProperty("intent", out var i)
                ? i.GetString() : "unknown";
            if (intent == "query" || intent == "creation" || intent == "mutation")
            {
                files.Add(GeneratePropertyTest(qualified, intent!));
            }
        }

        return files;
    }

    // [DocDeterministic]
    private GeneratedTestFile GenerateGuardTest(string qualified, int guardCount)
    {
        var parts = qualified.Split('#');
        var className = parts[0].Split('.').Last();
        var methodName = parts.Length > 1 ? parts[1] : "Unknown";
        var testClass = $"{className}{methodName}GuardTests";

        var tests = "";
        for (int i = 0; i < guardCount; i++)
        {
            tests += $@"
    [Fact]
    public void ShouldEnforceGuard{i + 1}()
    {{
        // Given: input violating guard condition {i + 1}
        // When/Then: expect exception
        Assert.Throws<ArgumentException>(() =>
        {{
            // TODO: Call {methodName} with invalid input
        }});
    }}
";
        }

        var content = $@"using Xunit;

/// <summary>Guard clause tests for {className}#{methodName}.</summary>
public class {testClass}
{{
{tests}
}}
";
        return new GeneratedTestFile($"{_outputDir}/{testClass}.cs", content, "guard");
    }

    // [DocDeterministic]
    private GeneratedTestFile GeneratePropertyTest(string qualified, string intent)
    {
        var parts = qualified.Split('#');
        var className = parts[0].Split('.').Last();
        var methodName = parts.Length > 1 ? parts[1] : "Unknown";
        var testClass = $"{className}{methodName}PropertyTests";

        var test = intent switch
        {
            "query" => $@"
    [Property]
    public Property QueryIsIdempotent(NonEmptyString input)
    {{
        // var result1 = sut.{methodName}(input.Get);
        // var result2 = sut.{methodName}(input.Get);
        // return (result1 == result2).ToProperty();
        return true.ToProperty();
    }}",
            "creation" or "mutation" => $@"
    [Property]
    public Property MutationChangesState(NonEmptyString input)
    {{
        // var before = sut.GetState();
        // sut.{methodName}(input.Get);
        // var after = sut.GetState();
        // return (before != after).ToProperty();
        return true.ToProperty();
    }}",
            _ => ""
        };

        var content = $@"using FsCheck;
using FsCheck.Xunit;

/// <summary>Property-based tests for {className}#{methodName}.</summary>
public class {testClass}
{{
{test}
}}
";
        return new GeneratedTestFile($"{_outputDir}/{testClass}.cs", content, "property");
    }
}

public record GeneratedTestFile(string Path, string Content, string Type);
