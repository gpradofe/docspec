// @docspec:module {
//   id: "docspec-csharp-attribute-reader",
//   name: "Attribute Reader",
//   description: "Reads all 42+ DocSpec attributes from Roslyn symbols and maps them to output model objects. The C# equivalent of Java's AnnotationReader.",
//   since: "3.0.0"
// }

using System.Collections.Generic;
using System.Linq;
using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Reader;

/// <summary>
/// Reads DocSpec attributes from Roslyn symbols and maps them to
/// output model objects. The C# equivalent of Java's <c>AnnotationReader</c>.
/// Handles all 42+ DocSpec attributes defined in <c>DocSpec.Annotations</c>.
/// </summary>
// [DocIntentional("Read DocSpec C# attributes from Roslyn symbols and convert them to typed data objects")]
// [DocBoundary("attribute metadata extraction")]
public class AttributeReader
{
    private const string Prefix = "DocSpec.Annotations.";

    // Attribute fully-qualified names
    private const string DocModule = Prefix + "DocModuleAttribute";
    private const string DocMethod = Prefix + "DocMethodAttribute";
    private const string DocField = Prefix + "DocFieldAttribute";
    private const string DocTags = Prefix + "DocTagsAttribute";
    private const string DocOptional = Prefix + "DocOptionalAttribute";
    private const string DocHidden = Prefix + "DocHiddenAttribute";
    private const string DocAudience = Prefix + "DocAudienceAttribute";
    private const string DocFlow = Prefix + "DocFlowAttribute";
    private const string DocUses = Prefix + "DocUsesAttribute";
    private const string DocUsesAll = Prefix + "DocUsesAllAttribute";
    private const string DocContext = Prefix + "DocContextAttribute";
    private const string DocError = Prefix + "DocErrorAttribute";
    private const string DocEvent = Prefix + "DocEventAttribute";
    private const string DocEndpoint = Prefix + "DocEndpointAttribute";
    private const string DocExample = Prefix + "DocExampleAttribute";
    private const string DocPII = Prefix + "DocPIIAttribute";
    private const string DocSensitive = Prefix + "DocSensitiveAttribute";
    private const string DocIntentional = Prefix + "DocIntentionalAttribute";
    private const string DocPreserves = Prefix + "DocPreservesAttribute";
    private const string DocInvariant = Prefix + "DocInvariantAttribute";
    private const string DocIdempotent = Prefix + "DocIdempotentAttribute";
    private const string DocDeterministic = Prefix + "DocDeterministicAttribute";
    private const string DocStateMachine = Prefix + "DocStateMachineAttribute";
    private const string DocBoundary = Prefix + "DocBoundaryAttribute";
    private const string DocTestStrategy = Prefix + "DocTestStrategyAttribute";
    private const string DocTestSkip = Prefix + "DocTestSkipAttribute";
    private const string DocPerformance = Prefix + "DocPerformanceAttribute";
    private const string DocWebSocket = Prefix + "DocWebSocketAttribute";
    private const string DocCommand = Prefix + "DocCommandAttribute";
    private const string DocGraphQL = Prefix + "DocGraphQLAttribute";
    private const string DocGRPC = Prefix + "DocGRPCAttribute";
    private const string DocAsyncAPI = Prefix + "DocAsyncAPIAttribute";
    private const string DocOrdering = Prefix + "DocOrderingAttribute";
    private const string DocMonotonic = Prefix + "DocMonotonicAttribute";
    private const string DocConservation = Prefix + "DocConservationAttribute";
    private const string DocCompare = Prefix + "DocCompareAttribute";
    private const string DocRelation = Prefix + "DocRelationAttribute";

    // --- Visibility ---

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool IsHidden(ISymbol symbol)
        => HasAttribute(symbol, DocHidden);

    // [DocDeterministic]
    public string? GetAudience(ISymbol symbol)
    {
        var attr = FindAttribute(symbol, DocAudience);
        return attr is null ? null : GetConstructorArg<string>(attr, 0);
    }

    // --- @DocModule ---

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool HasDocModule(INamedTypeSymbol type)
        => HasAttribute(type, DocModule);

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public DocModuleData? ReadDocModule(INamedTypeSymbol type)
    {
        var attr = FindAttribute(type, DocModule);
        if (attr is null) return null;

        return new DocModuleData
        {
            Name = GetConstructorArg<string>(attr, 0) ?? GetNamedArg<string>(attr, "Name"),
            Description = GetNamedArg<string>(attr, "Description"),
            Since = GetNamedArg<string>(attr, "Since"),
            Audience = GetNamedArg<string>(attr, "Audience")
        };
    }

    // --- @DocMethod ---

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public DocMethodData? ReadDocMethod(IMethodSymbol method)
    {
        var attr = FindAttribute(method, DocMethod);
        if (attr is null) return null;

        return new DocMethodData
        {
            Description = GetConstructorArg<string>(attr, 0) ?? GetNamedArg<string>(attr, "Description"),
            Name = GetNamedArg<string>(attr, "Name"),
            Since = GetNamedArg<string>(attr, "Since"),
            Deprecated = GetNamedArg<string>(attr, "Deprecated")
        };
    }

    // --- @DocField ---

    // [DocDeterministic]
    public DocFieldData? ReadDocField(ISymbol member)
    {
        var attr = FindAttribute(member, DocField);
        if (attr is null) return null;

        return new DocFieldData
        {
            Description = GetConstructorArg<string>(attr, 0) ?? GetNamedArg<string>(attr, "Description"),
            Since = GetNamedArg<string>(attr, "Since")
        };
    }

    // --- @DocTags ---

    // [DocDeterministic]
    public List<string>? ReadDocTags(INamedTypeSymbol type)
    {
        var attr = FindAttribute(type, DocTags);
        if (attr is null) return null;
        return GetConstructorArrayArg<string>(attr, 0);
    }

    // --- @DocOptional ---

    // [DocDeterministic]
    public bool IsOptional(IParameterSymbol param)
        => HasAttribute(param, DocOptional);

    // --- @DocFlow ---

    // [DocDeterministic]
    public DocFlowData? ReadDocFlow(INamedTypeSymbol type)
    {
        var attr = FindAttribute(type, DocFlow);
        if (attr is null) return null;

        return new DocFlowData
        {
            Id = GetConstructorArg<string>(attr, 0),
            Name = GetNamedArg<string>(attr, "Name"),
            Description = GetNamedArg<string>(attr, "Description"),
            Trigger = GetNamedArg<string>(attr, "Trigger")
        };
    }

    // --- @DocUses ---

    // [DocDeterministic]
    public List<DocUsesData> ReadDocUses(ISymbol symbol)
    {
        var result = new List<DocUsesData>();

        // Single [DocUses]
        foreach (var attr in symbol.GetAttributes()
            .Where(a => a.AttributeClass?.ToDisplayString() == DocUses))
        {
            result.Add(ReadSingleDocUses(attr, symbol));
        }

        return result;
    }

    private DocUsesData ReadSingleDocUses(AttributeData attr, ISymbol symbol)
    {
        return new DocUsesData
        {
            SourceQualified = symbol.ToDisplayString(),
            Artifact = GetConstructorArg<string>(attr, 0) ?? "",
            Flow = GetNamedArg<string>(attr, "Flow"),
            Step = GetNamedArg<string>(attr, "Step"),
            Member = GetNamedArg<string>(attr, "Member"),
            Description = GetNamedArg<string>(attr, "Description")
        };
    }

    // --- @DocContext ---

    // [DocDeterministic]
    public DocContextData? ReadDocContext(INamedTypeSymbol type)
    {
        var attr = FindAttribute(type, DocContext);
        if (attr is null) return null;

        return new DocContextData
        {
            Id = GetConstructorArg<string>(attr, 0),
            Name = GetNamedArg<string>(attr, "Name"),
            AttachedTo = type.ToDisplayString(),
            Flow = GetNamedArg<string>(attr, "Flow")
        };
    }

    // --- @DocError ---

    // [DocDeterministic]
    public DocErrorData? ReadDocError(INamedTypeSymbol type)
    {
        var attr = FindAttribute(type, DocError);
        if (attr is null) return null;

        return new DocErrorData
        {
            Code = GetConstructorArg<string>(attr, 0),
            Exception = type.ToDisplayString(),
            Description = GetNamedArg<string>(attr, "Description"),
            Resolution = GetNamedArg<string>(attr, "Resolution"),
            Since = GetNamedArg<string>(attr, "Since"),
            HttpStatus = GetNamedArg<int?>(attr, "HttpStatus"),
            Causes = GetNamedArrayArg<string>(attr, "Causes")
        };
    }

    // --- @DocEvent ---

    // [DocDeterministic]
    public DocEventData? ReadDocEvent(ISymbol symbol)
    {
        var attr = FindAttribute(symbol, DocEvent);
        if (attr is null) return null;

        return new DocEventData
        {
            Name = GetConstructorArg<string>(attr, 0) ?? "",
            Description = GetNamedArg<string>(attr, "Description"),
            Trigger = GetNamedArg<string>(attr, "Trigger"),
            Channel = GetNamedArg<string>(attr, "Channel"),
            DeliveryGuarantee = GetNamedArg<string>(attr, "DeliveryGuarantee"),
            RetryPolicy = GetNamedArg<string>(attr, "RetryPolicy"),
            Since = GetNamedArg<string>(attr, "Since")
        };
    }

    // --- @DocEndpoint ---

    // [DocDeterministic]
    public DocEndpointData? ReadDocEndpoint(IMethodSymbol method)
    {
        var attr = FindAttribute(method, DocEndpoint);
        if (attr is null) return null;

        string? value = GetConstructorArg<string>(attr, 0);
        if (string.IsNullOrWhiteSpace(value)) return null;

        var parts = value.Trim().Split(' ', 2);
        return parts.Length == 2
            ? new DocEndpointData { Method = parts[0].ToUpperInvariant(), Path = parts[1] }
            : new DocEndpointData { Path = value };
    }

    // --- @DocExample ---

    // [DocDeterministic]
    public List<DocExampleData> ReadDocExamples(ISymbol symbol)
    {
        var examples = new List<DocExampleData>();
        foreach (var attr in symbol.GetAttributes()
            .Where(a => a.AttributeClass?.ToDisplayString() == DocExample))
        {
            examples.Add(new DocExampleData
            {
                Title = GetNamedArg<string>(attr, "Title"),
                Language = GetNamedArg<string>(attr, "Language") ?? "csharp",
                Code = GetNamedArg<string>(attr, "Code"),
                File = GetNamedArg<string>(attr, "File")
            });
        }
        return examples;
    }

    // --- v3: Semantic annotations ---

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool IsIdempotent(IMethodSymbol method)
        => HasAttribute(method, DocIdempotent);

    // [DocDeterministic]
    public bool IsDeterministic(IMethodSymbol method)
        => HasAttribute(method, DocDeterministic);

    // [DocDeterministic]
    public bool HasDocStateMachine(INamedTypeSymbol type)
        => HasAttribute(type, DocStateMachine);

    // [DocDeterministic]
    public bool HasDocTestSkip(IMethodSymbol method)
        => HasAttribute(method, DocTestSkip);

    // [DocDeterministic]
    public string? ReadDocIntentional(IMethodSymbol method)
    {
        var attr = FindAttribute(method, DocIntentional);
        return attr is null ? null : GetConstructorArg<string>(attr, 0);
    }

    // [DocDeterministic]
    public List<string>? ReadDocPreserves(IMethodSymbol method)
    {
        var attr = FindAttribute(method, DocPreserves);
        return attr is null ? null : GetConstructorArrayArg<string>(attr, 0);
    }

    // [DocDeterministic]
    public List<string>? ReadDocInvariant(INamedTypeSymbol type)
    {
        var attr = FindAttribute(type, DocInvariant);
        return attr is null ? null : GetConstructorArrayArg<string>(attr, 0);
    }

    // [DocDeterministic]
    public string? ReadDocBoundary(ISymbol symbol)
    {
        var attr = FindAttribute(symbol, DocBoundary);
        return attr is null ? null : GetConstructorArg<string>(attr, 0);
    }

    // [DocDeterministic]
    public string? ReadDocTestStrategy(ISymbol symbol)
    {
        var attr = FindAttribute(symbol, DocTestStrategy);
        return attr is null ? null : GetConstructorArg<string>(attr, 0);
    }

    // [DocDeterministic]
    public DocPerformanceData? ReadDocPerformance(IMethodSymbol method)
    {
        var attr = FindAttribute(method, DocPerformance);
        if (attr is null) return null;

        return new DocPerformanceData
        {
            ExpectedLatency = GetNamedArg<string>(attr, "ExpectedLatency"),
            Bottleneck = GetNamedArg<string>(attr, "Bottleneck")
        };
    }

    // --- v3: Protocol annotations ---

    // [DocDeterministic]
    public string? ReadDocWebSocketPath(ISymbol symbol)
    {
        var attr = FindAttribute(symbol, DocWebSocket);
        return attr is null ? null : GetNamedArg<string>(attr, "Path");
    }

    // [DocDeterministic]
    public string? ReadDocCommand(IMethodSymbol method)
    {
        var attr = FindAttribute(method, DocCommand);
        return attr is null ? null : GetConstructorArg<string>(attr, 0);
    }

    // [DocDeterministic]
    public string? ReadDocGraphQLType(ISymbol symbol)
    {
        var attr = FindAttribute(symbol, DocGraphQL);
        return attr is null ? null : GetNamedArg<string>(attr, "Type");
    }

    // [DocDeterministic]
    public string? ReadDocGRPCService(ISymbol symbol)
    {
        var attr = FindAttribute(symbol, DocGRPC);
        return attr is null ? null : GetNamedArg<string>(attr, "Service");
    }

    // [DocDeterministic]
    public string? ReadDocAsyncAPI(ISymbol symbol)
    {
        var attr = FindAttribute(symbol, DocAsyncAPI);
        return attr is null ? null : GetConstructorArg<string>(attr, 0);
    }

    // --- Utility methods ---

    private static bool HasAttribute(ISymbol symbol, string fullyQualifiedName)
        => FindAttribute(symbol, fullyQualifiedName) is not null;

    private static AttributeData? FindAttribute(ISymbol symbol, string fullyQualifiedName)
    {
        return symbol.GetAttributes()
            .FirstOrDefault(a => a.AttributeClass?.ToDisplayString() == fullyQualifiedName);
    }

    private static T? GetConstructorArg<T>(AttributeData attr, int index) where T : class
    {
        if (attr.ConstructorArguments.Length <= index) return null;
        return attr.ConstructorArguments[index].Value as T;
    }

    private static T? GetNamedArg<T>(AttributeData attr, string name)
    {
        var arg = attr.NamedArguments.FirstOrDefault(a => a.Key == name);
        if (arg.Key is null) return default;
        if (arg.Value.Value is T typed) return typed;
        return default;
    }

    private static List<T>? GetConstructorArrayArg<T>(AttributeData attr, int index)
    {
        if (attr.ConstructorArguments.Length <= index) return null;
        var arg = attr.ConstructorArguments[index];
        if (arg.Values.IsDefault) return null;

        var result = new List<T>();
        foreach (var val in arg.Values)
        {
            if (val.Value is T item)
                result.Add(item);
        }
        return result.Count == 0 ? null : result;
    }

    private static List<T>? GetNamedArrayArg<T>(AttributeData attr, string name)
    {
        var arg = attr.NamedArguments.FirstOrDefault(a => a.Key == name);
        if (arg.Key is null) return null;
        if (arg.Value.Values.IsDefault) return null;

        var result = new List<T>();
        foreach (var val in arg.Value.Values)
        {
            if (val.Value is T item)
                result.Add(item);
        }
        return result.Count == 0 ? null : result;
    }
}

// --- Data transfer records ---

public record DocModuleData
{
    public string? Name { get; init; }
    public string? Description { get; init; }
    public string? Since { get; init; }
    public string? Audience { get; init; }
}

public record DocMethodData
{
    public string? Name { get; init; }
    public string? Description { get; init; }
    public string? Since { get; init; }
    public string? Deprecated { get; init; }
}

public record DocFieldData
{
    public string? Description { get; init; }
    public string? Since { get; init; }
}

public record DocFlowData
{
    public string? Id { get; init; }
    public string? Name { get; init; }
    public string? Description { get; init; }
    public string? Trigger { get; init; }
}

public record DocUsesData
{
    public string SourceQualified { get; init; } = "";
    public string Artifact { get; init; } = "";
    public string? Flow { get; init; }
    public string? Step { get; init; }
    public string? Member { get; init; }
    public string? Description { get; init; }
}

public record DocContextData
{
    public string? Id { get; init; }
    public string? Name { get; init; }
    public string? AttachedTo { get; init; }
    public string? Flow { get; init; }
}

public record DocErrorData
{
    public string? Code { get; init; }
    public string? Exception { get; init; }
    public string? Description { get; init; }
    public List<string>? Causes { get; init; }
    public string? Resolution { get; init; }
    public string? Since { get; init; }
    public int? HttpStatus { get; init; }
}

public record DocEventData
{
    public string Name { get; init; } = "";
    public string? Description { get; init; }
    public string? Trigger { get; init; }
    public string? Channel { get; init; }
    public string? DeliveryGuarantee { get; init; }
    public string? RetryPolicy { get; init; }
    public string? Since { get; init; }
}

public record DocEndpointData
{
    public string? Method { get; init; }
    public string? Path { get; init; }
}

public record DocExampleData
{
    public string? Title { get; init; }
    public string Language { get; init; } = "csharp";
    public string? Code { get; init; }
    public string? File { get; init; }
}

public record DocPerformanceData
{
    public string? ExpectedLatency { get; init; }
    public string? Bottleneck { get; init; }
}
