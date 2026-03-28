using System.CommandLine;
using System.Text.Json;

namespace DocSpec.Cli.Commands;

/// <summary>
/// Implements the <c>docspec coverage</c> command.
/// Reads the generated docspec.json and reports documentation coverage
/// statistics, optionally enforcing a minimum threshold.
/// </summary>
// @docspec:intentional "Parse docspec.json, extract coverage metrics, print report, enforce threshold"
public static class CoverageCommand
{
    public static Command Create()
    {
        var fileOption = new Option<FileInfo>(
            aliases: new[] { "--file", "-f" },
            description: "Path to docspec.json file",
            getDefaultValue: () => new FileInfo("bin/docspec/docspec.json")
        );

        var minimumOption = new Option<int>(
            aliases: new[] { "--minimum", "-m" },
            description: "Minimum coverage percentage required",
            getDefaultValue: () => 0
        );

        var failOnBelowOption = new Option<bool>(
            name: "--fail-on-below",
            description: "Fail with non-zero exit code when below threshold",
            getDefaultValue: () => true
        );

        var command = new Command("coverage", "Check documentation coverage against a minimum threshold")
        {
            fileOption,
            minimumOption,
            failOnBelowOption
        };

        command.SetHandler(async (file, minimum, failOnBelow) =>
        {
            await ExecuteAsync(file, minimum, failOnBelow);
        }, fileOption, minimumOption, failOnBelowOption);

        return command;
    }

    private static async Task ExecuteAsync(FileInfo file, int minimum, bool failOnBelow)
    {
        Console.WriteLine();
        WriteColored("========================================", ConsoleColor.Cyan);
        WriteColored("  DocSpec Documentation Coverage Report", ConsoleColor.Cyan);
        WriteColored("========================================", ConsoleColor.Cyan);
        Console.WriteLine();

        // 1. Verify the spec file exists
        if (!file.Exists)
        {
            WriteColored($"  Error: Specification file not found: {file.FullName}", ConsoleColor.Red);
            WriteColored("  Run 'docspec generate' first.", ConsoleColor.Red);
            Environment.ExitCode = 1;
            return;
        }

        // 2. Parse the specification
        JsonDocument specDoc;
        try
        {
            var content = await File.ReadAllTextAsync(file.FullName);
            specDoc = JsonDocument.Parse(content);
        }
        catch (Exception ex)
        {
            WriteColored($"  Error: Could not parse specification: {ex.Message}", ConsoleColor.Red);
            Environment.ExitCode = 1;
            return;
        }

        var root = specDoc.RootElement;

        // 3. Extract coverage from discovery section
        int actualCoverage;
        bool hasDiscovery = root.TryGetProperty("discovery", out var discovery) &&
                            discovery.ValueKind == JsonValueKind.Object;

        if (hasDiscovery &&
            discovery.TryGetProperty("coveragePercent", out var coverageProp) &&
            coverageProp.TryGetInt32(out var coverageValue))
        {
            actualCoverage = coverageValue;
        }
        else
        {
            // Compute coverage from module/member data
            WriteColored("  No 'discovery.coveragePercent' found. Computing from modules...", ConsoleColor.Yellow);
            actualCoverage = ComputeCoverageFromModules(root);
        }

        // 4. Print coverage bar
        PrintCoverageBar(actualCoverage, minimum);
        Console.WriteLine();

        // 5. Print detailed stats from discovery section
        if (hasDiscovery)
        {
            PrintDiscoveryField(discovery, "mode", "Discovery mode");
            PrintDiscoveryNumericField(discovery, "totalTypes", "Total types");
            PrintDiscoveryNumericField(discovery, "documentedTypes", "Documented types");
            PrintDiscoveryNumericField(discovery, "totalMethods", "Total methods");
            PrintDiscoveryNumericField(discovery, "documentedMethods", "Documented methods");
            PrintDiscoveryNumericField(discovery, "inferredDescriptions", "Inferred desc.");

            if (discovery.TryGetProperty("detectedFrameworks", out var frameworks) &&
                frameworks.ValueKind == JsonValueKind.Array)
            {
                var fwList = new List<string>();
                foreach (var fw in frameworks.EnumerateArray())
                {
                    if (fw.ValueKind == JsonValueKind.String)
                    {
                        fwList.Add(fw.GetString()!);
                    }
                }
                if (fwList.Count > 0)
                {
                    Console.WriteLine($"  Frameworks:          {string.Join(", ", fwList)}");
                }
            }
        }

        // 6. Module/member counts
        Console.WriteLine();
        var moduleCount = 0;
        var totalMembers = 0;
        var documentedMembers = 0;

        if (root.TryGetProperty("modules", out var modules) && modules.ValueKind == JsonValueKind.Array)
        {
            moduleCount = modules.GetArrayLength();
            foreach (var module in modules.EnumerateArray())
            {
                if (module.TryGetProperty("members", out var members) && members.ValueKind == JsonValueKind.Array)
                {
                    foreach (var member in members.EnumerateArray())
                    {
                        totalMembers++;
                        if (member.TryGetProperty("description", out var desc) &&
                            desc.ValueKind == JsonValueKind.String &&
                            !string.IsNullOrWhiteSpace(desc.GetString()))
                        {
                            documentedMembers++;
                        }
                    }
                }
            }
        }

        Console.WriteLine($"  Modules:             {moduleCount}");
        Console.WriteLine($"  Total members:       {totalMembers}");
        Console.WriteLine($"  Documented members:  {documentedMembers}");

        // Intent graph info
        if (root.TryGetProperty("intentGraph", out var intentGraph) &&
            intentGraph.ValueKind == JsonValueKind.Object &&
            intentGraph.TryGetProperty("methods", out var intentMethods) &&
            intentMethods.ValueKind == JsonValueKind.Array)
        {
            var intentCount = intentMethods.GetArrayLength();
            if (intentCount > 0)
            {
                Console.WriteLine($"  Intent methods:      {intentCount}");
            }
        }

        Console.WriteLine();

        // 7. Enforce threshold
        if (actualCoverage >= minimum)
        {
            WriteColored($"  Coverage check PASSED ({actualCoverage}% >= {minimum}%)", ConsoleColor.Green);
        }
        else
        {
            var message = $"  Coverage check FAILED ({actualCoverage}% < {minimum}%)";
            if (failOnBelow)
            {
                WriteColored(message, ConsoleColor.Red);
                Console.WriteLine();
                WriteColored("========================================", ConsoleColor.Cyan);
                Console.WriteLine();
                Environment.ExitCode = 1;
                specDoc.Dispose();
                return;
            }
            else
            {
                WriteColored(message, ConsoleColor.Yellow);
                WriteColored("  Build will not fail because --fail-on-below is false.", ConsoleColor.Yellow);
            }
        }

        Console.WriteLine();
        WriteColored("========================================", ConsoleColor.Cyan);
        Console.WriteLine();

        specDoc.Dispose();
    }

    /// <summary>
    /// Computes documentation coverage from module and member descriptions
    /// when <c>discovery.coveragePercent</c> is not present.
    /// </summary>
    private static int ComputeCoverageFromModules(JsonElement root)
    {
        if (!root.TryGetProperty("modules", out var modules) || modules.ValueKind != JsonValueKind.Array)
        {
            return 0;
        }

        var total = 0;
        var documented = 0;

        foreach (var module in modules.EnumerateArray())
        {
            // Count the module itself
            total++;
            if (module.TryGetProperty("description", out var moduleDesc) &&
                moduleDesc.ValueKind == JsonValueKind.String &&
                !string.IsNullOrWhiteSpace(moduleDesc.GetString()))
            {
                documented++;
            }

            // Count members
            if (module.TryGetProperty("members", out var members) && members.ValueKind == JsonValueKind.Array)
            {
                foreach (var member in members.EnumerateArray())
                {
                    total++;
                    if (member.TryGetProperty("description", out var memberDesc) &&
                        memberDesc.ValueKind == JsonValueKind.String &&
                        !string.IsNullOrWhiteSpace(memberDesc.GetString()))
                    {
                        documented++;
                    }
                }
            }
        }

        return total == 0 ? 0 : (int)((double)documented / total * 100);
    }

    /// <summary>
    /// Prints a colored progress bar for coverage visualization.
    /// </summary>
    private static void PrintCoverageBar(int actual, int minimum)
    {
        const int barLength = 40;
        var filled = actual * barLength / 100;
        var thresholdPos = minimum > 0 ? minimum * barLength / 100 : 0;
        var passed = actual >= minimum;

        Console.Write("  [");
        for (int i = 0; i < barLength; i++)
        {
            if (i < filled)
            {
                Console.ForegroundColor = passed ? ConsoleColor.Green : ConsoleColor.Red;
                Console.Write('#');
                Console.ResetColor();
            }
            else if (minimum > 0 && i == thresholdPos)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.Write('|');
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.DarkGray;
                Console.Write('-');
                Console.ResetColor();
            }
        }
        Console.Write($"] {actual}%");
        if (minimum > 0)
        {
            Console.Write($"  (min: {minimum}%)");
        }
        Console.WriteLine();
    }

    private static void PrintDiscoveryField(JsonElement discovery, string field, string label)
    {
        if (discovery.TryGetProperty(field, out var prop) && prop.ValueKind == JsonValueKind.String)
        {
            Console.WriteLine($"  {label,-22} {prop.GetString()}");
        }
    }

    private static void PrintDiscoveryNumericField(JsonElement discovery, string field, string label)
    {
        if (discovery.TryGetProperty(field, out var prop) && prop.TryGetInt32(out var value))
        {
            Console.WriteLine($"  {label,-22} {value}");
        }
    }

    private static void WriteColored(string message, ConsoleColor color)
    {
        var prev = Console.ForegroundColor;
        Console.ForegroundColor = color;
        Console.WriteLine(message);
        Console.ForegroundColor = prev;
    }
}
