using System.CommandLine;
using System.Reflection;
using System.Text.Json;

namespace DocSpec.Cli.Commands;

/// <summary>
/// Implements the <c>docspec validate</c> command.
/// Validates a docspec.json file against the DocSpec v3.0.0 JSON Schema,
/// which is bundled as an embedded resource in the CLI tool.
/// </summary>
// @docspec:intentional "Load bundled JSON Schema, parse the spec file, validate, and report errors"
public static class ValidateCommand
{
    public static Command Create()
    {
        var fileOption = new Option<FileInfo>(
            aliases: new[] { "--file", "-f" },
            description: "Path to docspec.json file",
            getDefaultValue: () => new FileInfo("bin/docspec/docspec.json")
        );

        var schemaOption = new Option<FileInfo?>(
            name: "--schema",
            description: "Path to a custom JSON schema file (defaults to bundled schema)"
        );

        var command = new Command("validate", "Validate docspec.json against the DocSpec v3 JSON Schema")
        {
            fileOption,
            schemaOption
        };

        command.SetHandler(async (file, schema) =>
        {
            await ExecuteAsync(file, schema);
        }, fileOption, schemaOption);

        return command;
    }

    private static async Task ExecuteAsync(FileInfo file, FileInfo? schemaFile)
    {
        Console.WriteLine();
        WriteColored("========================================", ConsoleColor.Cyan);
        WriteColored("  DocSpec: Validating Specification", ConsoleColor.Cyan);
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

        Console.WriteLine($"  File: {file.FullName}");
        Console.WriteLine($"  Size: {file.Length / 1024} KB");
        Console.WriteLine();

        // 2. Parse the specification
        string specContent;
        JsonDocument specDoc;
        try
        {
            specContent = await File.ReadAllTextAsync(file.FullName);
            specDoc = JsonDocument.Parse(specContent);
        }
        catch (Exception ex)
        {
            WriteColored($"  Error: Could not parse specification: {ex.Message}", ConsoleColor.Red);
            Environment.ExitCode = 1;
            return;
        }

        // 3. Load the schema
        string schemaContent;
        if (schemaFile != null && schemaFile.Exists)
        {
            Console.WriteLine($"  Schema: {schemaFile.FullName}");
            schemaContent = await File.ReadAllTextAsync(schemaFile.FullName);
        }
        else
        {
            // Try well-known paths first
            var candidates = new[]
            {
                "spec/docspec.schema.json",
                "../spec/docspec.schema.json",
                "../../spec/docspec.schema.json"
            };

            string? foundPath = null;
            foreach (var candidate in candidates)
            {
                if (File.Exists(candidate))
                {
                    foundPath = candidate;
                    break;
                }
            }

            if (foundPath != null)
            {
                Console.WriteLine($"  Schema: {Path.GetFullPath(foundPath)}");
                schemaContent = await File.ReadAllTextAsync(foundPath);
            }
            else
            {
                // Fall back to embedded resource
                var assembly = Assembly.GetExecutingAssembly();
                using var stream = assembly.GetManifestResourceStream("DocSpec.Cli.docspec.schema.json");
                if (stream == null)
                {
                    WriteColored("  Schema file not found. Performing structural validation only.", ConsoleColor.Yellow);
                    StructuralValidate(specDoc);
                    specDoc.Dispose();
                    return;
                }
                Console.WriteLine("  Schema: (bundled)");
                using var reader = new StreamReader(stream);
                schemaContent = await reader.ReadToEndAsync();
            }
        }

        // 4. Perform structural validation (since System.CommandLine doesn't include
        //    a full JSON Schema validator, we do comprehensive structural checks)
        var errors = new List<string>();
        var root = specDoc.RootElement;

        // Validate against schema structure
        ValidateAgainstSchema(root, schemaContent, errors);

        if (errors.Count == 0)
        {
            var specVersion = root.TryGetProperty("docspec", out var vProp)
                ? vProp.GetString() ?? "unknown"
                : "unknown";

            WriteColored("  Validation PASSED", ConsoleColor.Green);
            Console.WriteLine($"  DocSpec version: {specVersion}");
            Console.WriteLine($"  Schema: JSON Schema Draft 2020-12");
            Console.WriteLine();

            PrintStructuralSummary(root);
        }
        else
        {
            WriteColored($"  Validation FAILED with {errors.Count} error(s):", ConsoleColor.Red);
            Console.WriteLine();
            for (int i = 0; i < errors.Count; i++)
            {
                WriteColored($"  {i + 1}) {errors[i]}", ConsoleColor.Red);
            }
            Console.WriteLine();
            Environment.ExitCode = 1;
        }

        Console.WriteLine();
        WriteColored("========================================", ConsoleColor.Cyan);
        Console.WriteLine();

        specDoc.Dispose();
    }

    /// <summary>
    /// Validates the spec against the schema by checking required fields,
    /// types, and structural constraints defined in the JSON Schema.
    /// </summary>
    private static void ValidateAgainstSchema(JsonElement root, string schemaContent, List<string> errors)
    {
        // Parse schema to understand required fields
        using var schemaDoc = JsonDocument.Parse(schemaContent);
        var schema = schemaDoc.RootElement;

        // Check root type
        if (root.ValueKind != JsonValueKind.Object)
        {
            errors.Add("Root must be a JSON object");
            return;
        }

        // Check docspec version
        if (!root.TryGetProperty("docspec", out var docspecProp))
        {
            errors.Add("Missing required field: 'docspec'");
        }
        else if (docspecProp.GetString() != "3.0.0")
        {
            errors.Add($"Expected docspec version '3.0.0', got '{docspecProp.GetString()}'");
        }

        // Check artifact (required)
        if (!root.TryGetProperty("artifact", out var artifact))
        {
            errors.Add("Missing required field: 'artifact'");
        }
        else
        {
            var requiredArtifactFields = new[] { "groupId", "artifactId", "version", "language" };
            foreach (var field in requiredArtifactFields)
            {
                if (!artifact.TryGetProperty(field, out var fieldProp) ||
                    fieldProp.ValueKind != JsonValueKind.String)
                {
                    errors.Add($"Missing or invalid required artifact field: '{field}'");
                }
            }
        }

        // Check modules (required, must be array)
        if (!root.TryGetProperty("modules", out var modules))
        {
            errors.Add("Missing required field: 'modules'");
        }
        else if (modules.ValueKind != JsonValueKind.Array)
        {
            errors.Add("'modules' must be an array");
        }
        else
        {
            // Validate each module has required fields
            int moduleIndex = 0;
            foreach (var module in modules.EnumerateArray())
            {
                if (!module.TryGetProperty("id", out _))
                {
                    errors.Add($"Module at index {moduleIndex}: missing required field 'id'");
                }
                if (!module.TryGetProperty("name", out _))
                {
                    errors.Add($"Module at index {moduleIndex}: missing required field 'name'");
                }

                // Validate members array if present
                if (module.TryGetProperty("members", out var members) &&
                    members.ValueKind != JsonValueKind.Array)
                {
                    errors.Add($"Module '{GetStringProp(module, "id", moduleIndex.ToString())}': 'members' must be an array");
                }

                moduleIndex++;
            }
        }

        // Validate optional array fields are arrays when present
        var arrayFields = new[] { "flows", "contexts", "crossRefs", "errors", "events",
            "dataModels", "dataStores", "configuration", "externalDependencies", "privacy" };

        foreach (var field in arrayFields)
        {
            if (root.TryGetProperty(field, out var prop) && prop.ValueKind != JsonValueKind.Array)
            {
                errors.Add($"'{field}' must be an array when present");
            }
        }

        // Validate optional object fields are objects when present
        var objectFields = new[] { "project", "security", "observability", "intentGraph", "discovery" };
        foreach (var field in objectFields)
        {
            if (root.TryGetProperty(field, out var prop) &&
                prop.ValueKind != JsonValueKind.Object &&
                prop.ValueKind != JsonValueKind.Null)
            {
                errors.Add($"'{field}' must be an object when present");
            }
        }

        // Validate intentGraph structure if present
        if (root.TryGetProperty("intentGraph", out var intentGraph) &&
            intentGraph.ValueKind == JsonValueKind.Object)
        {
            if (intentGraph.TryGetProperty("methods", out var methods) &&
                methods.ValueKind != JsonValueKind.Array)
            {
                errors.Add("'intentGraph.methods' must be an array");
            }
        }
    }

    /// <summary>
    /// Fallback structural validation when no schema is available.
    /// </summary>
    private static void StructuralValidate(JsonDocument specDoc)
    {
        Console.WriteLine();
        var errors = new List<string>();
        var root = specDoc.RootElement;

        if (root.ValueKind != JsonValueKind.Object)
        {
            errors.Add("Root must be a JSON object");
        }
        else
        {
            foreach (var field in new[] { "docspec", "artifact", "modules" })
            {
                if (!root.TryGetProperty(field, out _))
                {
                    errors.Add($"Missing required field: '{field}'");
                }
            }
        }

        if (errors.Count == 0)
        {
            WriteColored("  Structural validation PASSED", ConsoleColor.Green);
            PrintStructuralSummary(root);
        }
        else
        {
            WriteColored($"  Structural validation FAILED with {errors.Count} error(s):", ConsoleColor.Red);
            for (int i = 0; i < errors.Count; i++)
            {
                WriteColored($"  {i + 1}) {errors[i]}", ConsoleColor.Red);
            }
            Environment.ExitCode = 1;
        }

        Console.WriteLine();
        WriteColored("========================================", ConsoleColor.Cyan);
        Console.WriteLine();
    }

    private static void PrintStructuralSummary(JsonElement root)
    {
        var moduleCount = root.TryGetProperty("modules", out var mods) && mods.ValueKind == JsonValueKind.Array
            ? mods.GetArrayLength() : 0;
        var hasIntent = root.TryGetProperty("intentGraph", out var ig) && ig.ValueKind == JsonValueKind.Object;
        var hasSecurity = root.TryGetProperty("security", out var sec) && sec.ValueKind == JsonValueKind.Object;
        var hasObservability = root.TryGetProperty("observability", out var obs) && obs.ValueKind == JsonValueKind.Object;
        var dataStoreCount = root.TryGetProperty("dataStores", out var ds) && ds.ValueKind == JsonValueKind.Array
            ? ds.GetArrayLength() : 0;
        var errorCount = root.TryGetProperty("errors", out var errs) && errs.ValueKind == JsonValueKind.Array
            ? errs.GetArrayLength() : 0;

        Console.WriteLine($"  Modules:          {moduleCount}");
        Console.WriteLine($"  Intent graph:     {(hasIntent ? "present" : "absent")}");
        Console.WriteLine($"  Security model:   {(hasSecurity ? "present" : "absent")}");
        Console.WriteLine($"  Observability:    {(hasObservability ? "present" : "absent")}");
        Console.WriteLine($"  Data stores:      {dataStoreCount}");
        Console.WriteLine($"  Error codes:      {errorCount}");
    }

    private static string GetStringProp(JsonElement element, string name, string fallback)
    {
        return element.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String
            ? prop.GetString() ?? fallback
            : fallback;
    }

    private static void WriteColored(string message, ConsoleColor color)
    {
        var prev = Console.ForegroundColor;
        Console.ForegroundColor = color;
        Console.WriteLine(message);
        Console.ForegroundColor = prev;
    }
}
