// @docspec:module {
//   id: "docspec-csharp-dsti-generator",
//   name: "DSTI Test Generator",
//   description: "Generates xUnit + Moq + FsCheck test stubs from DSTI intent graph signals, producing guard clause tests and property-based tests.",
//   since: "3.0.0"
// }

using System.Text.Json;
using System.Text.RegularExpressions;

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

            var invariantRules = new List<string>();
            if (signals.TryGetProperty("invariantRules", out var rulesElement))
            {
                foreach (var ruleEl in rulesElement.EnumerateArray())
                {
                    var ruleStr = ruleEl.GetString();
                    if (!string.IsNullOrEmpty(ruleStr))
                        invariantRules.Add(ruleStr);
                }
            }

            if (intent == "query" || intent == "creation" || intent == "mutation" || invariantRules.Count > 0)
            {
                files.Add(GeneratePropertyTest(qualified, intent!, invariantRules));
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
    private GeneratedTestFile GeneratePropertyTest(string qualified, string intent, List<string> invariantRules)
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

        // Generate invariant rule tests from @DocInvariant Property DSL expressions
        foreach (var rule in invariantRules)
        {
            var assertion = MapDslToCSharpAssertion(rule);
            var safeName = Regex.Replace(rule, @"[^a-zA-Z0-9]", "_");
            safeName = Regex.Replace(safeName, @"_+", "_").Trim('_');
            test += $@"

    [Fact]
    public void Invariant_{safeName}()
    {{
        var result = sut.{methodName}(/* input */);
        {assertion}
    }}";
        }

        var content = $@"using Xunit;
using FsCheck;
using FsCheck.Xunit;

/// <summary>Property-based tests for {className}#{methodName}.</summary>
public class {testClass}
{{
{test}
}}
";
        return new GeneratedTestFile($"{_outputDir}/{testClass}.cs", content, "property");
    }

    /// <summary>Maps a Property DSL expression to a C# assertion string.</summary>
    private static string MapDslToCSharpAssertion(string expression)
    {
        var expr = expression.Trim();

        // RANGE shorthand: field RANGE min..max
        var rangeMatch = Regex.Match(expr, @"(?i)^(.+)\s+RANGE\s+(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$");
        if (rangeMatch.Success)
        {
            var accessor = ToCSharpAccessor(rangeMatch.Groups[1].Value.Trim());
            return $"Assert.InRange({accessor}, {rangeMatch.Groups[2].Value}, {rangeMatch.Groups[3].Value});";
        }

        // Monotonicity: field UP/DOWN -> field UP/DOWN
        var monoMatch = Regex.Match(expr, @"^(.+)\s+(UP|DOWN)\s*[→\->]+\s*(.+)\s+(UP|DOWN)$");
        if (monoMatch.Success)
        {
            var outputAccessor = ToCSharpAccessor(monoMatch.Groups[3].Value.Trim());
            var cmp = monoMatch.Groups[4].Value == "UP" ? ">=" : "<=";
            return $"var baseline = {outputAccessor};\n        // Increase {monoMatch.Groups[1].Value.Trim()} and verify {monoMatch.Groups[3].Value.Trim()} moves {monoMatch.Groups[4].Value}\n        Assert.True({outputAccessor} {cmp} baseline);";
        }

        // NOT_NULL
        var notNullMatch = Regex.Match(expr, @"(?i)^(\S+)\s+NOT_NULL$");
        if (notNullMatch.Success)
            return $"Assert.NotNull({ToCSharpAccessor(notNullMatch.Groups[1].Value)});";

        // NOT_EMPTY
        var notEmptyMatch = Regex.Match(expr, @"(?i)^(\S+)\s+NOT_EMPTY$");
        if (notEmptyMatch.Success)
            return $"Assert.NotEmpty({ToCSharpAccessor(notEmptyMatch.Groups[1].Value)});";

        // NOT_BLANK
        var notBlankMatch = Regex.Match(expr, @"(?i)^(\S+)\s+NOT_BLANK$");
        if (notBlankMatch.Success)
            return $"Assert.False(string.IsNullOrWhiteSpace({ToCSharpAccessor(notBlankMatch.Groups[1].Value)}));";

        // SIZE comparison
        var sizeMatch = Regex.Match(expr, @"(?i)^(\S+)\s+SIZE\s*(>=?|<=?|==|!=)\s*(-?\d+(?:\.\d+)?)$");
        if (sizeMatch.Success)
        {
            var accessor = ToCSharpAccessor(sizeMatch.Groups[1].Value);
            var op = sizeMatch.Groups[2].Value;
            var val = sizeMatch.Groups[3].Value;
            if (op == ">" && val == "0")
                return $"Assert.NotEmpty({accessor});";
            return $"Assert.True({accessor}.Count {op} {val});";
        }

        // IN [values]
        var inMatch = Regex.Match(expr, @"(?i)^(\S+)\s+IN\s*\[(.+)]$");
        if (inMatch.Success)
        {
            var accessor = ToCSharpAccessor(inMatch.Groups[1].Value);
            var vals = string.Join(", ", inMatch.Groups[2].Value.Split(',')
                .Select(v =>
                {
                    var trimmed = v.Trim().Trim('"', '\'');
                    return int.TryParse(trimmed, out _) ? trimmed : $"\"{trimmed}\"";
                }));
            return $"Assert.Contains({accessor}, new[] {{ {vals} }});";
        }

        // BETWEEN min AND max
        var betweenMatch = Regex.Match(expr, @"(?i)^(\S+)\s+BETWEEN\s+(-?\d+(?:\.\d+)?)\s+AND\s+(-?\d+(?:\.\d+)?)$");
        if (betweenMatch.Success)
        {
            var accessor = ToCSharpAccessor(betweenMatch.Groups[1].Value);
            return $"Assert.InRange({accessor}, {betweenMatch.Groups[2].Value}, {betweenMatch.Groups[3].Value});";
        }

        // MATCHES pattern
        var matchesMatch = Regex.Match(expr, @"(?i)^(\S+)\s+MATCHES\s+(.+)$");
        if (matchesMatch.Success)
        {
            var accessor = ToCSharpAccessor(matchesMatch.Groups[1].Value);
            var pattern = matchesMatch.Groups[2].Value.Trim().Trim('"', '\'');
            return $"Assert.Matches(@\"{pattern}\", {accessor});";
        }

        // Comparison: >=, <=, !=, ==, >, <
        var compMatch = Regex.Match(expr, @"^(\S+)\s*(>=|<=|!=|==|>|<)\s*(.+)$");
        if (compMatch.Success)
        {
            var accessor = ToCSharpAccessor(compMatch.Groups[1].Value);
            var op = compMatch.Groups[2].Value;
            var val = compMatch.Groups[3].Value.Trim();
            if (op == "==")
            {
                var wrappedVal = int.TryParse(val, out _) ? val : $"\"{val}\"";
                return $"Assert.Equal({wrappedVal}, {accessor});";
            }
            if (op == "!=")
            {
                var wrappedVal = int.TryParse(val, out _) ? val : $"\"{val}\"";
                return $"Assert.NotEqual({wrappedVal}, {accessor});";
            }
            return $"Assert.True({accessor} {op} {val});";
        }

        return $"// Property: {expression}";
    }

    /// <summary>Converts a dotted field path to a C# accessor, mapping "output" to "result" and capitalizing properties.</summary>
    private static string ToCSharpAccessor(string field)
    {
        var parts = field.Split('.');
        var result = new List<string>();
        for (int i = 0; i < parts.Length; i++)
        {
            if (i == 0)
            {
                result.Add(parts[i] == "output" ? "result" : parts[i]);
            }
            else
            {
                result.Add(char.ToUpper(parts[i][0]) + parts[i][1..]);
            }
        }
        return string.Join(".", result);
    }
}

public record GeneratedTestFile(string Path, string Content, string Type);
