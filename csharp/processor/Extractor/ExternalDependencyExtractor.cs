// @docspec:module {
//   id: "docspec-csharp-external-dep-extractor",
//   name: "External Dependency Extractor",
//   description: "Detects HttpClient, IHttpClientFactory, and GrpcChannel usage to map external service dependencies.",
//   since: "3.0.0"
// }

using System.Collections.Generic;
using System.Linq;
using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Extractor;

/// <summary>
/// Detects external HTTP service dependencies in .NET projects:
/// <list type="bullet">
///   <item><c>HttpClient</c> / <c>IHttpClientFactory</c> field or constructor injection</item>
///   <item>Typed HTTP clients (classes with <c>HttpClient</c> constructor parameter)</item>
///   <item>gRPC client usage (<c>GrpcChannel</c>, <c>CallInvoker</c>)</item>
/// </list>
/// Populates the external dependencies section of the DocSpec output.
/// </summary>
// [DocBoundary("classpath-safe extraction")]
// [DocIntentional("Detect external HTTP and gRPC service dependencies from field types and constructor injection")]
public class ExternalDependencyExtractor : IDocSpecExtractor
{
    private const string HttpClientType = "System.Net.Http.HttpClient";
    private const string IHttpClientFactory = "System.Net.Http.IHttpClientFactory";
    private const string GrpcChannelType = "Grpc.Net.Client.GrpcChannel";

    public string ExtractorName => "external-dependency";

    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public bool IsAvailable(Compilation compilation)
    {
        // HttpClient is always available in .NET; check for it anyway
        return compilation.GetTypeByMetadataName(HttpClientType) is not null;
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Detect HttpClient, IHttpClientFactory, and GrpcChannel field/constructor injection")]
    public void Extract(INamedTypeSymbol type, Compilation compilation, DocSpecOutput output)
    {
        bool hasHttpClient = false;
        bool hasHttpClientFactory = false;
        bool hasGrpcChannel = false;

        // Check fields and properties
        foreach (var member in type.GetMembers())
        {
            ITypeSymbol? memberType = member switch
            {
                IFieldSymbol f => f.Type,
                IPropertySymbol p => p.Type,
                _ => null
            };

            if (memberType is null) continue;
            string memberTypeName = memberType.ToDisplayString();

            if (memberTypeName == HttpClientType) hasHttpClient = true;
            if (memberTypeName == IHttpClientFactory) hasHttpClientFactory = true;
            if (memberTypeName == GrpcChannelType) hasGrpcChannel = true;
        }

        // Check constructor parameters (DI pattern)
        foreach (var ctor in type.Constructors)
        {
            foreach (var param in ctor.Parameters)
            {
                string paramTypeName = param.Type.ToDisplayString();
                if (paramTypeName == HttpClientType) hasHttpClient = true;
                if (paramTypeName == IHttpClientFactory) hasHttpClientFactory = true;
                if (paramTypeName == GrpcChannelType) hasGrpcChannel = true;
            }
        }

        if (hasHttpClient || hasHttpClientFactory)
        {
            // Check if this is a typed HTTP client (constructor takes HttpClient)
            bool isTypedClient = type.Constructors
                .Any(c => c.Parameters.Any(p => p.Type.ToDisplayString() == HttpClientType));

            var dep = new ExternalDependencyInfo
            {
                Name = isTypedClient
                    ? type.Name
                    : "http-via-" + type.Name,
                BaseUrl = isTypedClient
                    ? "(typed HttpClient)"
                    : "(detected from HttpClient field)"
            };

            // Extract public methods as potential endpoints for typed clients
            if (isTypedClient)
            {
                var endpoints = new List<ExternalDependencyEndpointInfo>();
                foreach (var method in type.GetMembers().OfType<IMethodSymbol>())
                {
                    if (method.MethodKind != MethodKind.Ordinary) continue;
                    if (method.DeclaredAccessibility != Accessibility.Public) continue;

                    endpoints.Add(new ExternalDependencyEndpointInfo
                    {
                        Method = InferHttpMethodFromName(method.Name),
                        Path = "/" + CamelToSlash(method.Name),
                        UsedBy = new List<string> { type.ToDisplayString() + "." + method.Name }
                    });
                }
                dep.Endpoints = endpoints;
            }

            output.ExternalDependencies.Add(dep);
        }

        if (hasGrpcChannel)
        {
            output.ExternalDependencies.Add(new ExternalDependencyInfo
            {
                Name = "grpc-via-" + type.Name,
                BaseUrl = "(detected from GrpcChannel)"
            });
        }
    }

    // --- Private helpers ---

    // [DocDeterministic]
    private static string InferHttpMethodFromName(string methodName)
    {
        string lower = methodName.ToLowerInvariant();
        if (lower.StartsWith("get") || lower.StartsWith("fetch") || lower.StartsWith("list"))
            return "GET";
        if (lower.StartsWith("create") || lower.StartsWith("post") || lower.StartsWith("add"))
            return "POST";
        if (lower.StartsWith("update") || lower.StartsWith("put") || lower.StartsWith("modify"))
            return "PUT";
        if (lower.StartsWith("delete") || lower.StartsWith("remove"))
            return "DELETE";
        if (lower.StartsWith("patch"))
            return "PATCH";
        return "GET";
    }

    // [DocDeterministic]
    private static string CamelToSlash(string name)
    {
        return System.Text.RegularExpressions.Regex
            .Replace(name, "([a-z])([A-Z])", "$1-$2")
            .ToLowerInvariant();
    }
}

public class ExternalDependencyInfo
{
    public string Name { get; set; } = "";
    public string? BaseUrl { get; set; }
    public List<ExternalDependencyEndpointInfo> Endpoints { get; set; } = new();
}

public class ExternalDependencyEndpointInfo
{
    public string? Method { get; set; }
    public string Path { get; set; } = "/";
    public List<string>? UsedBy { get; set; }
}
