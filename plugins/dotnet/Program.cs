// DocSpec CLI for .NET
//
// @docspec:module {
//   id: "docspec-dotnet-cli",
//   name: "DocSpec .NET CLI",
//   description: "Global dotnet tool that provides generate, validate, and coverage
//     commands for C# projects using the DocSpec v3 specification. Wraps the
//     DocSpec.Analyzer Roslyn-based processor and adds schema validation and
//     coverage reporting.",
//   since: "3.0.0"
// }

using System.CommandLine;
using DocSpec.Cli.Commands;

namespace DocSpec.Cli;

/// <summary>
/// Entry point for the <c>docspec</c> dotnet global tool.
/// Wires up three subcommands: generate, validate, and coverage.
/// </summary>
public static class Program
{
    public static async Task<int> Main(string[] args)
    {
        var rootCommand = new RootCommand(
            "DocSpec CLI for .NET -- generate, validate, and check coverage of documentation specifications"
        );

        rootCommand.AddCommand(GenerateCommand.Create());
        rootCommand.AddCommand(ValidateCommand.Create());
        rootCommand.AddCommand(CoverageCommand.Create());

        return await rootCommand.InvokeAsync(args);
    }
}
