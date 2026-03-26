using System.CommandLine;
using System.Text.Json;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace DocSpec.Cli.Commands;

/// <summary>
/// Implements the <c>docspec generate</c> command.
/// Loads C# source files from the specified directory, creates a Roslyn
/// compilation, runs the DocSpec.Analyzer pipeline, and writes docspec.json.
/// </summary>
// @docspec:intentional "Compile C# sources with Roslyn and run the DocSpec analyzer to produce docspec.json"
public static class GenerateCommand
{
    public static Command Create()
    {
        var sourceOption = new Option<DirectoryInfo>(
            aliases: new[] { "--source", "-s" },
            description: "Source directory to scan for .cs files",
            getDefaultValue: () => new DirectoryInfo(".")
        );

        var outputOption = new Option<DirectoryInfo>(
            aliases: new[] { "--output", "-o" },
            description: "Output directory for docspec.json",
            getDefaultValue: () => new DirectoryInfo("bin/docspec")
        );

        var groupIdOption = new Option<string>(
            name: "--group-id",
            description: "Artifact group ID",
            getDefaultValue: () => "unknown"
        );

        var artifactIdOption = new Option<string>(
            name: "--artifact-id",
            description: "Artifact ID (defaults to .csproj name)"
        );

        var versionOption = new Option<string>(
            name: "--version-override",
            description: "Artifact version (defaults to .csproj version)"
        );

        var command = new Command("generate", "Generate docspec.json from C# source code")
        {
            sourceOption,
            outputOption,
            groupIdOption,
            artifactIdOption,
            versionOption
        };

        command.SetHandler(async (source, output, groupId, artifactId, versionOverride) =>
        {
            await ExecuteAsync(source, output, groupId, artifactId, versionOverride);
        }, sourceOption, outputOption, groupIdOption, artifactIdOption, versionOption);

        return command;
    }

    private static async Task ExecuteAsync(
        DirectoryInfo source,
        DirectoryInfo output,
        string groupId,
        string? artifactId,
        string? versionOverride)
    {
        Console.WriteLine();
        WriteColored("========================================", ConsoleColor.Cyan);
        WriteColored("  DocSpec: Generating Specification", ConsoleColor.Cyan);
        WriteColored("========================================", ConsoleColor.Cyan);
        Console.WriteLine();

        // 1. Resolve artifact metadata from .csproj if not provided
        var (resolvedArtifactId, resolvedVersion) = ResolveCsprojMetadata(source, artifactId, versionOverride);

        Console.WriteLine($"  Artifact:  {groupId}:{resolvedArtifactId}");
        Console.WriteLine($"  Version:   {resolvedVersion}");
        Console.WriteLine($"  Source:    {source.FullName}");
        Console.WriteLine($"  Output:    {output.FullName}");
        Console.WriteLine();

        // 2. Collect C# source files
        if (!source.Exists)
        {
            WriteColored($"  Error: Source directory '{source.FullName}' does not exist.", ConsoleColor.Red);
            Environment.ExitCode = 1;
            return;
        }

        var sourceFiles = source.GetFiles("*.cs", SearchOption.AllDirectories);
        if (sourceFiles.Length == 0)
        {
            WriteColored("  No C# source files found. Skipping generation.", ConsoleColor.Yellow);
            return;
        }

        Console.WriteLine($"  Found {sourceFiles.Length} C# source file(s)");

        // 3. Parse source files into syntax trees
        var syntaxTrees = new List<SyntaxTree>();
        foreach (var file in sourceFiles)
        {
            try
            {
                var code = await File.ReadAllTextAsync(file.FullName);
                var tree = CSharpSyntaxTree.ParseText(code, path: file.FullName);
                syntaxTrees.Add(tree);
            }
            catch (Exception ex)
            {
                WriteColored($"  Warning: Could not parse {file.Name}: {ex.Message}", ConsoleColor.Yellow);
            }
        }

        Console.WriteLine($"  Parsed {syntaxTrees.Count} syntax tree(s)");

        // 4. Create a Roslyn compilation
        var references = CollectMetadataReferences();
        var compilation = CSharpCompilation.Create(
            assemblyName: resolvedArtifactId,
            syntaxTrees: syntaxTrees,
            references: references,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
                .WithNullableContextOptions(NullableContextOptions.Enable)
        );

        // Report compilation diagnostics (errors only)
        var errors = compilation.GetDiagnostics()
            .Where(d => d.Severity == DiagnosticSeverity.Error)
            .ToList();

        if (errors.Count > 0)
        {
            WriteColored($"  Warning: {errors.Count} compilation error(s) detected.", ConsoleColor.Yellow);
            WriteColored("  The analyzer will proceed but results may be incomplete.", ConsoleColor.Yellow);
            foreach (var error in errors.Take(5))
            {
                WriteColored($"    {error.Id}: {error.GetMessage()}", ConsoleColor.Yellow);
            }
            if (errors.Count > 5)
            {
                WriteColored($"    ... and {errors.Count - 5} more", ConsoleColor.Yellow);
            }
            Console.WriteLine();
        }

        // 5. Run the DocSpec analyzer
        Console.WriteLine("  Running DocSpec analyzer...");

        var analyzer = new DocSpec.Analyzer.DocSpecAnalyzer
        {
            GroupId = groupId,
            ArtifactId = resolvedArtifactId,
            Version = resolvedVersion
        };

        var result = analyzer.Analyze(compilation);

        // 6. Serialize output
        output.Create(); // Ensure output directory exists

        var specPath = Path.Combine(output.FullName, "docspec.json");
        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        var json = JsonSerializer.Serialize(result, jsonOptions);
        await File.WriteAllTextAsync(specPath, json);

        var sizeKb = new FileInfo(specPath).Length / 1024;

        Console.WriteLine();
        WriteColored($"  Generated: {specPath} ({sizeKb} KB)", ConsoleColor.Green);

        // 7. Print summary
        PrintSummary(specPath);

        Console.WriteLine();
        WriteColored("========================================", ConsoleColor.Cyan);
        Console.WriteLine();
    }

    /// <summary>
    /// Scans for a .csproj file in the source directory to extract artifact ID and version.
    /// </summary>
    private static (string artifactId, string version) ResolveCsprojMetadata(
        DirectoryInfo source, string? artifactIdOverride, string? versionOverride)
    {
        var artifactId = artifactIdOverride ?? "unknown";
        var version = versionOverride ?? "0.0.0";

        // Search for .csproj files
        var csprojFiles = source.Exists
            ? source.GetFiles("*.csproj", SearchOption.TopDirectoryOnly)
            : Array.Empty<FileInfo>();

        if (csprojFiles.Length == 0 && source.Parent != null)
        {
            // Try parent directory (common when --source points to a subdirectory)
            csprojFiles = source.Parent.GetFiles("*.csproj", SearchOption.TopDirectoryOnly);
        }

        if (csprojFiles.Length > 0)
        {
            var csproj = csprojFiles[0];

            if (string.IsNullOrEmpty(artifactIdOverride))
            {
                artifactId = Path.GetFileNameWithoutExtension(csproj.Name);
            }

            // Simple XML parsing to extract Version
            if (string.IsNullOrEmpty(versionOverride))
            {
                try
                {
                    var content = File.ReadAllText(csproj.FullName);
                    var versionMatch = System.Text.RegularExpressions.Regex.Match(
                        content, @"<Version>(.*?)</Version>");
                    if (versionMatch.Success)
                    {
                        version = versionMatch.Groups[1].Value;
                    }
                }
                catch
                {
                    // Ignore parsing errors
                }
            }
        }

        return (artifactId, version);
    }

    /// <summary>
    /// Collects metadata references from the runtime assemblies so the
    /// Roslyn compilation can resolve base types.
    /// </summary>
    private static List<MetadataReference> CollectMetadataReferences()
    {
        var references = new List<MetadataReference>();
        var trustedAssemblies = AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string;

        if (trustedAssemblies != null)
        {
            foreach (var assemblyPath in trustedAssemblies.Split(Path.PathSeparator))
            {
                if (File.Exists(assemblyPath))
                {
                    try
                    {
                        references.Add(MetadataReference.CreateFromFile(assemblyPath));
                    }
                    catch
                    {
                        // Skip assemblies that can't be loaded
                    }
                }
            }
        }

        return references;
    }

    /// <summary>
    /// Reads the generated docspec.json and prints a quick summary.
    /// </summary>
    private static void PrintSummary(string specPath)
    {
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(specPath));
            var root = doc.RootElement;

            var moduleCount = 0;
            var memberCount = 0;
            var intentCount = 0;
            var coverage = "N/A";

            if (root.TryGetProperty("modules", out var modules) && modules.ValueKind == JsonValueKind.Array)
            {
                moduleCount = modules.GetArrayLength();
                foreach (var module in modules.EnumerateArray())
                {
                    if (module.TryGetProperty("members", out var members) && members.ValueKind == JsonValueKind.Array)
                    {
                        memberCount += members.GetArrayLength();
                    }
                }
            }

            if (root.TryGetProperty("intentGraph", out var intent) &&
                intent.TryGetProperty("methods", out var methods) &&
                methods.ValueKind == JsonValueKind.Array)
            {
                intentCount = methods.GetArrayLength();
            }

            if (root.TryGetProperty("discovery", out var discovery) &&
                discovery.TryGetProperty("coveragePercent", out var coverageProp))
            {
                coverage = $"{coverageProp.GetInt32()}%";
            }

            Console.WriteLine();
            Console.WriteLine($"  Modules:        {moduleCount}");
            Console.WriteLine($"  Members:        {memberCount}");
            Console.WriteLine($"  Intent methods: {intentCount}");
            Console.WriteLine($"  Coverage:       {coverage}");
        }
        catch
        {
            // Summary is best-effort
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
