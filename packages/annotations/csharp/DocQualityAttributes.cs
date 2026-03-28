// @docspec:module {
//   id: "docspec-csharp-annotations-quality",
//   name: "Quality & Visibility Annotations",
//   description: "Defines quality, visibility, and testing attributes: [DocHidden], [DocAudience], [DocError], [DocEvent], [DocEndpoint], [DocPII], [DocSensitive], [DocPerformance], [DocTestStrategy], [DocTestSkip], [DocTags], [DocOptional], and [DocExample].",
//   since: "3.0.0"
// }

namespace DocSpec.Annotations;

/// <summary>Hide from documentation.</summary>
[AttributeUsage(AttributeTargets.All)]
public class DocHiddenAttribute : Attribute { }

/// <summary>Set target audience.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Interface)]
public class DocAudienceAttribute : Attribute
{
    public string Audience { get; }
    public DocAudienceAttribute(string audience) => Audience = audience;
}

/// <summary>Document an error condition.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Method, AllowMultiple = true)]
public class DocErrorAttribute : Attribute
{
    public string Code { get; }
    public int HttpStatus { get; set; } = -1;
    public string? Description { get; set; }
    public string[]? Causes { get; set; }
    public string? Resolution { get; set; }
    public string? Since { get; set; }
    public DocErrorAttribute(string code) => Code = code;
}

/// <summary>Document an event.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Method, AllowMultiple = true)]
public class DocEventAttribute : Attribute
{
    public string Name { get; }
    public string? Description { get; set; }
    public string? Trigger { get; set; }
    public string? Channel { get; set; }
    public string? DeliveryGuarantee { get; set; }
    public string? RetryPolicy { get; set; }
    public string? Since { get; set; }
    public DocEventAttribute(string name) => Name = name;
}

/// <summary>Document an endpoint mapping.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocEndpointAttribute : Attribute
{
    public string? Value { get; }
    public string? Method { get; set; }
    public string? Path { get; set; }
    public string? Description { get; set; }

    public DocEndpointAttribute() { }
    public DocEndpointAttribute(string value) => Value = value;
}

/// <summary>Mark a field as PII.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
public class DocPIIAttribute : Attribute
{
    public string Type { get; }
    public string? Retention { get; set; }
    public string? GdprBasis { get; set; }
    public bool Encrypted { get; set; }
    public bool NeverLog { get; set; }
    public bool NeverReturn { get; set; }
    public DocPIIAttribute(string type) => Type = type;
}

/// <summary>Mark a field as sensitive.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
public class DocSensitiveAttribute : Attribute
{
    public string? Reason { get; set; }
}

/// <summary>Document performance characteristics.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocPerformanceAttribute : Attribute
{
    public string? ExpectedLatency { get; set; }
    public string? Bottleneck { get; set; }
}

/// <summary>Document test strategy.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocTestStrategyAttribute : Attribute
{
    public string Type { get; }
    public string? Description { get; set; }
    public DocTestStrategyAttribute(string type) => Type = type;
}

/// <summary>Skip automated test generation for a method.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocTestSkipAttribute : Attribute
{
    public string? Reason { get; set; }
}

/// <summary>Associate searchable tags with a documented type.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Interface)]
public class DocTagsAttribute : Attribute
{
    public string[] Value { get; }

    public DocTagsAttribute(params string[] value) => Value = value;
}

/// <summary>Mark a parameter as optional.</summary>
[AttributeUsage(AttributeTargets.Parameter)]
public class DocOptionalAttribute : Attribute { }

/// <summary>Attach a code example to a documented method or type.</summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class | AttributeTargets.Struct, AllowMultiple = true)]
public class DocExampleAttribute : Attribute
{
    public string? Title { get; set; }
    public string Language { get; set; } = "csharp";
    public string? Code { get; set; }
    public string? File { get; set; }
}

/// <summary>Container for multiple DocExample attributes (enables AllowMultiple repeatable pattern).</summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class | AttributeTargets.Struct)]
public class DocExamplesAttribute : Attribute
{
    public DocExampleAttribute[] Value { get; }

    public DocExamplesAttribute(params DocExampleAttribute[] value) => Value = value;
}
