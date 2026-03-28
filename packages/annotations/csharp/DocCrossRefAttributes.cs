// @docspec:module {
//   id: "docspec-csharp-annotations-crossref",
//   name: "Cross-Reference Annotations",
//   description: "Defines [DocUses], [DocUsesAll], and [DocSpecExample] attributes for cross-project references and verified executable examples.",
//   since: "3.0.0"
// }

namespace DocSpec.Annotations;

/// <summary>Declare a cross-project or cross-module reference.</summary>
// [DocIntentional("Link a type or method to an external artifact, flow, or member for cross-project documentation")]
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class | AttributeTargets.Struct, AllowMultiple = true)]
public class DocUsesAttribute : Attribute
{
    public string Artifact { get; }
    public string? Flow { get; set; }
    public string? Step { get; set; }
    public string? Member { get; set; }
    public string? Description { get; set; }

    public DocUsesAttribute(string artifact) => Artifact = artifact;
}

/// <summary>Mark a test method as a verified, executable example attached to a documented element.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocSpecExampleAttribute : Attribute
{
    public string AttachTo { get; }
    public string? Title { get; set; }

    public DocSpecExampleAttribute(string attachTo) => AttachTo = attachTo;
}

/// <summary>Container for multiple DocUses attributes (enables AllowMultiple repeatable pattern).</summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class | AttributeTargets.Struct)]
public class DocUsesAllAttribute : Attribute
{
    public DocUsesAttribute[] Value { get; }

    public DocUsesAllAttribute(params DocUsesAttribute[] value) => Value = value;
}
