// @docspec:module {
//   id: "docspec-csharp-annotations-protocol",
//   name: "Protocol Annotations",
//   description: "Defines protocol-specific attributes: [DocAsyncAPI], [DocGRPC], [DocGraphQL], [DocWebSocket], and [DocCommand] for multi-protocol documentation.",
//   since: "3.0.0"
// }

namespace DocSpec.Annotations;

/// <summary>Mark a class that implements an AsyncAPI specification.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct)]
public class DocAsyncAPIAttribute : Attribute
{
    public string Channel { get; }
    public string? Operation { get; set; }

    public DocAsyncAPIAttribute(string channel) => Channel = channel;
}

/// <summary>Mark a gRPC service or method.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Method)]
public class DocGRPCAttribute : Attribute
{
    public string? Service { get; set; }
    public string? Method { get; set; }
}

/// <summary>Mark a GraphQL resolver or type.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Method)]
public class DocGraphQLAttribute : Attribute
{
    public string? Type { get; set; }
    public string? Field { get; set; }
}

/// <summary>Mark a WebSocket endpoint.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Method)]
public class DocWebSocketAttribute : Attribute
{
    public string? Path { get; set; }
    public string[]? Messages { get; set; }
}

/// <summary>Document a CQRS command.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocCommandAttribute : Attribute
{
    public string Value { get; }
    public string? Aggregate { get; set; }

    public DocCommandAttribute(string value) => Value = value;
}
