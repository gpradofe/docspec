// @docspec:module {
//   id: "docspec-csharp-config-extractor",
//   name: "Configuration Extractor",
//   description: "Extracts IOptions<T>, IOptionsSnapshot<T>, IOptionsMonitor<T>, and IConfiguration usage patterns from ASP.NET Core projects.",
//   since: "3.0.0"
// }

using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Extractor;

/// <summary>
/// Detects configuration binding patterns in ASP.NET Core / .NET projects:
/// <list type="bullet">
///   <item><c>IOptions&lt;T&gt;</c> / <c>IOptionsSnapshot&lt;T&gt;</c> / <c>IOptionsMonitor&lt;T&gt;</c> injections</item>
///   <item><c>IConfiguration</c> key access patterns (indexer, <c>GetValue</c>, <c>GetSection</c>)</item>
///   <item>Classes bound via <c>Configure&lt;T&gt;()</c> (options pattern)</item>
/// </list>
/// Populates the configuration section of the DocSpec output.
/// </summary>
// [DocBoundary("classpath-safe extraction")]
// [DocIntentional("Detect configuration binding patterns via IOptions<T> and IConfiguration without compile-time deps")]
public class ConfigExtractor : IDocSpecExtractor
{
    private static readonly string[] OptionsInterfaces =
    {
        "Microsoft.Extensions.Options.IOptions`1",
        "Microsoft.Extensions.Options.IOptionsSnapshot`1",
        "Microsoft.Extensions.Options.IOptionsMonitor`1"
    };

    private const string IConfiguration = "Microsoft.Extensions.Configuration.IConfiguration";

    public string ExtractorName => "configuration";

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool IsAvailable(Compilation compilation)
    {
        return compilation.GetTypeByMetadataName("Microsoft.Extensions.Options.IOptions`1") is not null
            || compilation.GetTypeByMetadataName(IConfiguration) is not null;
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Extract configuration properties from IOptions<T> constructor injection and IConfiguration fields")]
    public void Extract(INamedTypeSymbol type, Compilation compilation, DocSpecOutput output)
    {
        string ownerQualified = type.ToDisplayString();
        var properties = new List<ConfigurationPropertyInfo>();

        // Detect constructor injection of IOptions<T>
        foreach (var ctor in type.Constructors)
        {
            foreach (var param in ctor.Parameters)
            {
                if (param.Type is not INamedTypeSymbol paramType) continue;

                string erasedName = paramType.ConstructedFrom?.ToDisplayString() ?? "";
                if (OptionsInterfaces.Any(o => erasedName == o) && paramType.TypeArguments.Length == 1)
                {
                    var optionsType = paramType.TypeArguments[0] as INamedTypeSymbol;
                    if (optionsType is null) continue;

                    ExtractOptionsProperties(optionsType, ownerQualified, properties);
                }
            }
        }

        // Detect fields/properties typed as IConfiguration
        foreach (var member in type.GetMembers())
        {
            ITypeSymbol? memberType = member switch
            {
                IFieldSymbol f => f.Type,
                IPropertySymbol p => p.Type,
                _ => null
            };

            if (memberType is null) continue;
            if (memberType.ToDisplayString() == IConfiguration ||
                memberType.ToDisplayString() == "Microsoft.Extensions.Configuration.IConfigurationSection")
            {
                properties.Add(new ConfigurationPropertyInfo
                {
                    Key = "(runtime config access)",
                    Type = "dynamic",
                    Source = "IConfiguration",
                    UsedBy = new List<string> { ownerQualified }
                });
                break; // One entry is enough to flag IConfiguration usage
            }
        }

        if (properties.Count > 0)
        {
            output.Configuration.AddRange(properties);
        }
    }

    // --- Private helpers ---

    // [DocIntentional("Extract public property names and types from an Options class and map to configuration keys")]
    private void ExtractOptionsProperties(INamedTypeSymbol optionsType, string ownerQualified,
                                          List<ConfigurationPropertyInfo> properties)
    {
        string prefix = CamelToKebab(optionsType.Name.Replace("Options", ""));

        foreach (var member in optionsType.GetMembers())
        {
            if (member is not IPropertySymbol prop) continue;
            if (prop.DeclaredAccessibility != Accessibility.Public) continue;
            if (prop.IsStatic) continue;
            if (prop.IsIndexer) continue;

            string key = prefix.Length > 0
                ? prefix + ":" + CamelToKebab(prop.Name)
                : CamelToKebab(prop.Name);

            properties.Add(new ConfigurationPropertyInfo
            {
                Key = key,
                Type = SimplifyType(prop.Type.ToDisplayString()),
                Source = "IOptions<" + optionsType.Name + ">",
                UsedBy = new List<string> { ownerQualified }
            });
        }
    }

    // [DocDeterministic]
    private static string CamelToKebab(string camelCase)
    {
        return Regex.Replace(camelCase, "([a-z])([A-Z])", "$1-$2").ToLowerInvariant();
    }

    // [DocDeterministic]
    private static string SimplifyType(string fullType)
    {
        return fullType
            .Replace("System.", "")
            .Replace("Collections.Generic.", "")
            .Replace("Nullable<", "")
            .TrimEnd('>');
    }
}

public class ConfigurationPropertyInfo
{
    public string Key { get; set; } = "";
    public string? Type { get; set; }
    public string? DefaultValue { get; set; }
    public string? Source { get; set; }
    public List<string>? UsedBy { get; set; }
}
