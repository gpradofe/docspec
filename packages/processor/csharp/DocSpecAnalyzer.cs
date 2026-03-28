// @docspec:module {
//   id: "docspec-csharp-analyzer",
//   name: "DocSpec C# Analyzer",
//   description: "Main orchestrator that processes a C# Roslyn compilation through auto-discovery, framework detection, extractors, readers, and DSTI to produce docspec.json.",
//   since: "3.0.0"
// }

using System.Text.Json;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using DocSpec.Analyzer.Extractor;
using DocSpec.Analyzer.Reader;
using DocSpec.Analyzer.Metrics;

namespace DocSpec.Analyzer;

/// <summary>
/// Main DocSpec analyzer that processes a C# compilation and produces docspec.json.
/// Orchestrates auto-discovery, framework detection, extractors, readers, and DSTI.
/// </summary>
// [DocBoundary("compilation orchestration")]
// [DocIntentional("Orchestrate the 21-step processor pipeline for C# via Roslyn")]
public class DocSpecAnalyzer
{
    public string GroupId { get; set; } = "unknown";
    public string ArtifactId { get; set; } = "unknown";
    public string Version { get; set; } = "0.0.0";

    /// <summary>All registered extractors, run in order for each discovered type.</summary>
    private static readonly IDocSpecExtractor[] Extractors =
    {
        new SecurityExtractor(),
        new ConfigExtractor(),
        new ObservabilityExtractor(),
        new DataStoreExtractor(),
        new ExternalDependencyExtractor(),
        new PrivacyExtractor(),
        new ErrorEventExtractor()
    };

    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Run the full extraction pipeline on a Roslyn compilation and produce a DocSpecOutput")]
    public DocSpecOutput Analyze(Compilation compilation)
    {
        var output = new DocSpecOutput
        {
            Docspec = "3.0.0",
            Artifact = new ArtifactInfo
            {
                GroupId = GroupId,
                ArtifactId = ArtifactId,
                Version = Version,
                Language = "csharp",
                Frameworks = DetectFrameworks(compilation)
            }
        };

        var scanner = new Scanner.AutoDiscoveryScanner();
        var types = scanner.Scan(compilation);
        var xmlDocReader = new XmlDocReader();
        var descriptionInferrer = new DescriptionInferrer();
        var attributeReader = new AttributeReader();
        var coverageCalculator = new CoverageCalculator();

        // Determine which extractors are available for this compilation
        var activeExtractors = new List<IDocSpecExtractor>();
        foreach (var extractor in Extractors)
        {
            if (extractor.IsAvailable(compilation))
            {
                activeExtractors.Add(extractor);
            }
        }

        foreach (var typeInfo in types)
        {
            var moduleName = typeInfo.Namespace ?? "default";
            var module = output.Modules.Find(m => m.Id == moduleName);
            if (module == null)
            {
                module = new ModuleInfo { Id = moduleName, Name = moduleName };
                output.Modules.Add(module);
            }

            // Build member with enriched description
            string? description = typeInfo.XmlComment;
            if (string.IsNullOrWhiteSpace(description))
            {
                description = descriptionInferrer.InferClassDescription(typeInfo.Name);
                coverageCalculator.IncrementInferredDescriptions();
            }

            var member = new MemberInfo
            {
                Kind = typeInfo.Kind,
                Name = typeInfo.Name,
                Qualified = typeInfo.FullName,
                Description = description
            };
            module.Members.Add(member);

            // Run extractors on the Roslyn type symbol (if available)
            if (typeInfo.Symbol is not null)
            {
                foreach (var extractor in activeExtractors)
                {
                    extractor.Extract(typeInfo.Symbol, compilation, output);
                }
            }
        }

        // Compute coverage
        coverageCalculator.Analyze(output);

        return output;
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    // [DocIntentional("Detect frameworks from referenced assemblies without requiring compile-time dependencies")]
    private List<string> DetectFrameworks(Compilation compilation)
    {
        var frameworks = new List<string>();
        var refs = compilation.ReferencedAssemblyNames;
        foreach (var r in refs)
        {
            if (r.Name.StartsWith("Microsoft.AspNetCore")) { frameworks.Add("aspnet-core"); break; }
        }
        foreach (var r in refs)
        {
            if (r.Name.StartsWith("Microsoft.EntityFrameworkCore")) { frameworks.Add("ef-core"); break; }
        }
        return frameworks;
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    // [DocIntentional("Serialize the DocSpec output to pretty-printed JSON with null suppression")]
    public string ToJson(DocSpecOutput output)
    {
        return JsonSerializer.Serialize(output, new JsonSerializerOptions { WriteIndented = true, DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull });
    }
}

public class DocSpecOutput
{
    public string Docspec { get; set; } = "3.0.0";
    public ArtifactInfo Artifact { get; set; } = new();
    public List<ModuleInfo> Modules { get; set; } = new();

    // v3 domain sections populated by extractors
    public SecurityInfo? Security { get; set; }
    public ObservabilityInfo? Observability { get; set; }
    public List<DataStoreInfo> DataStores { get; set; } = new();
    public List<ConfigurationPropertyInfo> Configuration { get; set; } = new();
    public List<ExternalDependencyInfo> ExternalDependencies { get; set; } = new();
    public List<PrivacyFieldInfo> Privacy { get; set; } = new();
    public List<ErrorInfo> Errors { get; set; } = new();
    public List<EventInfo> Events { get; set; } = new();
}

public class ArtifactInfo
{
    public string GroupId { get; set; } = "";
    public string ArtifactId { get; set; } = "";
    public string Version { get; set; } = "";
    public string Language { get; set; } = "";
    public List<string>? Frameworks { get; set; }
}

public class ModuleInfo
{
    public string Id { get; set; } = "";
    public string? Name { get; set; }
    public List<MemberInfo> Members { get; set; } = new();
}

public class MemberInfo
{
    public string Kind { get; set; } = "";
    public string Name { get; set; } = "";
    public string Qualified { get; set; } = "";
    public string? Description { get; set; }
}

public class TypeDiscoveryInfo
{
    public string Name { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Kind { get; set; } = "";
    public string? Namespace { get; set; }
    public string? XmlComment { get; set; }

    /// <summary>The Roslyn symbol for this type, used by extractors.</summary>
    public INamedTypeSymbol? Symbol { get; set; }
}
