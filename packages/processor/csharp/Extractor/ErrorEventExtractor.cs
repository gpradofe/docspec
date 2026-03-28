// @docspec:module {
//   id: "docspec-csharp-error-event-extractor",
//   name: "Error & Event Extractor",
//   description: "Detects [DocError] and [DocEvent] attributes on types and methods, and auto-discovers exception subclasses to populate errors and events sections.",
//   since: "3.0.0"
// }

using System.Collections.Generic;
using System.Linq;
using Microsoft.CodeAnalysis;

namespace DocSpec.Analyzer.Extractor;

/// <summary>
/// Detects <c>[DocError]</c> and <c>[DocEvent]</c> attributes on types and methods,
/// and populates the errors and events sections of the DocSpec output.
/// Also auto-discovers exception classes (types extending <c>System.Exception</c>).
/// </summary>
// [DocBoundary("classpath-safe extraction")]
// [DocIntentional("Extract error codes, events, and auto-discover exception hierarchies from type metadata")]
public class ErrorEventExtractor : IDocSpecExtractor
{
    private const string DocErrorAttribute = "DocSpec.Annotations.DocErrorAttribute";
    private const string DocEventAttribute = "DocSpec.Annotations.DocEventAttribute";
    private const string SystemException = "System.Exception";

    public string ExtractorName => "error-event";

    // [DocDeterministic]
    public bool IsAvailable(Compilation compilation)
    {
        // DocError/DocEvent attributes may or may not be referenced; we also auto-detect
        // exception subclasses, so this extractor is always available.
        return true;
    }

    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Extract DocError/DocEvent attributes and auto-discover exception subclasses")]
    public void Extract(INamedTypeSymbol type, Compilation compilation, DocSpecOutput output)
    {
        string ownerQualified = type.ToDisplayString();

        // --- Errors ---

        // Check [DocError] on the type itself
        ExtractDocErrors(type, ownerQualified, output);

        // Check [DocError] on methods
        foreach (var method in type.GetMembers().OfType<IMethodSymbol>())
        {
            ExtractDocErrors(method, ownerQualified + "." + method.Name, output);
        }

        // Auto-discover exception classes (subclasses of System.Exception)
        if (IsExceptionType(type) && !HasDocErrorAttribute(type))
        {
            var errorInfo = new ErrorInfo
            {
                Code = type.Name.Replace("Exception", "").ToUpperInvariant() + "_ERROR",
                Exception = ownerQualified,
                Description = InferExceptionDescription(type.Name)
            };
            output.Errors.Add(errorInfo);
        }

        // --- Events ---

        // Check [DocEvent] on the type
        ExtractDocEvents(type, ownerQualified, output);

        // Check [DocEvent] on methods
        foreach (var method in type.GetMembers().OfType<IMethodSymbol>())
        {
            ExtractDocEvents(method, ownerQualified + "." + method.Name, output);
        }
    }

    // --- Private helpers ---

    // [DocIntentional("Extract DocError attribute arguments including code, description, resolution, and causes")]
    private void ExtractDocErrors(ISymbol symbol, string sourceQualified, DocSpecOutput output)
    {
        foreach (var attr in symbol.GetAttributes())
        {
            if (attr.AttributeClass?.ToDisplayString() != DocErrorAttribute) continue;

            var error = new ErrorInfo
            {
                Exception = sourceQualified
            };

            // Constructor arg: code
            if (attr.ConstructorArguments.Length > 0 &&
                attr.ConstructorArguments[0].Value is string code)
            {
                error.Code = code;
            }

            // Named arguments
            foreach (var namedArg in attr.NamedArguments)
            {
                switch (namedArg.Key)
                {
                    case "Description":
                        error.Description = namedArg.Value.Value as string;
                        break;
                    case "Resolution":
                        error.Resolution = namedArg.Value.Value as string;
                        break;
                    case "Since":
                        error.Since = namedArg.Value.Value as string;
                        break;
                    case "HttpStatus":
                        if (namedArg.Value.Value is int status && status != -1)
                            error.HttpStatus = status;
                        break;
                    case "Causes":
                        if (namedArg.Value.Values.Length > 0)
                        {
                            error.Causes = namedArg.Value.Values
                                .Select(v => v.Value?.ToString() ?? "")
                                .Where(s => s.Length > 0)
                                .ToList();
                        }
                        break;
                }
            }

            output.Errors.Add(error);
        }
    }

    // [DocIntentional("Extract DocEvent attribute arguments including name, trigger, channel, and payload fields")]
    private void ExtractDocEvents(ISymbol symbol, string sourceQualified, DocSpecOutput output)
    {
        foreach (var attr in symbol.GetAttributes())
        {
            if (attr.AttributeClass?.ToDisplayString() != DocEventAttribute) continue;

            var evt = new EventInfo();

            // Constructor arg: name
            if (attr.ConstructorArguments.Length > 0 &&
                attr.ConstructorArguments[0].Value is string name)
            {
                evt.Name = name;
            }

            // Named arguments
            foreach (var namedArg in attr.NamedArguments)
            {
                switch (namedArg.Key)
                {
                    case "Description":
                        evt.Description = namedArg.Value.Value as string;
                        break;
                    case "Trigger":
                        evt.Trigger = namedArg.Value.Value as string;
                        break;
                    case "Channel":
                        evt.Channel = namedArg.Value.Value as string;
                        break;
                    case "DeliveryGuarantee":
                        evt.DeliveryGuarantee = namedArg.Value.Value as string;
                        break;
                    case "RetryPolicy":
                        evt.RetryPolicy = namedArg.Value.Value as string;
                        break;
                    case "Since":
                        evt.Since = namedArg.Value.Value as string;
                        break;
                }
            }

            // Extract payload fields from the type if it is a type symbol
            if (symbol is INamedTypeSymbol eventType)
            {
                var payloadFields = new List<EventPayloadFieldInfo>();
                foreach (var member in eventType.GetMembers().OfType<IPropertySymbol>())
                {
                    if (member.DeclaredAccessibility != Accessibility.Public) continue;
                    if (member.IsStatic) continue;

                    payloadFields.Add(new EventPayloadFieldInfo
                    {
                        Name = member.Name,
                        Type = SimplifyType(member.Type.ToDisplayString())
                    });
                }

                if (payloadFields.Count > 0)
                {
                    evt.Payload = new EventPayloadInfo
                    {
                        Type = eventType.Name,
                        Fields = payloadFields
                    };
                }
            }

            output.Events.Add(evt);
        }
    }

    // [DocDeterministic]
    private static bool IsExceptionType(INamedTypeSymbol type)
    {
        var baseType = type.BaseType;
        while (baseType is not null)
        {
            if (baseType.ToDisplayString() == SystemException) return true;
            baseType = baseType.BaseType;
        }
        return false;
    }

    // [DocDeterministic]
    private static bool HasDocErrorAttribute(INamedTypeSymbol type)
    {
        return type.GetAttributes()
            .Any(a => a.AttributeClass?.ToDisplayString() == DocErrorAttribute);
    }

    // [DocDeterministic]
    private static string InferExceptionDescription(string exceptionName)
    {
        string cause = exceptionName.Replace("Exception", "");
        // Split PascalCase
        string readable = System.Text.RegularExpressions.Regex
            .Replace(cause, "([a-z])([A-Z])", "$1 $2").ToLowerInvariant();
        return "Exception thrown when " + readable + " occurs.";
    }

    // [DocDeterministic]
    private static string SimplifyType(string fullType)
    {
        return fullType
            .Replace("System.", "")
            .Replace("Collections.Generic.", "");
    }
}

public class ErrorInfo
{
    public string? Code { get; set; }
    public string? Exception { get; set; }
    public string? Description { get; set; }
    public List<string>? Causes { get; set; }
    public string? Resolution { get; set; }
    public string? Since { get; set; }
    public int? HttpStatus { get; set; }
}

public class EventInfo
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Trigger { get; set; }
    public string? Channel { get; set; }
    public string? DeliveryGuarantee { get; set; }
    public string? RetryPolicy { get; set; }
    public string? Since { get; set; }
    public EventPayloadInfo? Payload { get; set; }
}

public class EventPayloadInfo
{
    public string Type { get; set; } = "";
    public List<EventPayloadFieldInfo> Fields { get; set; } = new();
}

public class EventPayloadFieldInfo
{
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
}
