// @docspec:module {
//   id: "docspec-csharp-annotations-dsti-extended",
//   name: "DSTI Extended Annotations",
//   description: "Defines extended semantic annotations: [DocPreserves], [DocCompare], and [DocRelation] for field preservation, comparison semantics, and entity relationships.",
//   since: "3.0.0"
// }

namespace DocSpec.Annotations;

/// <summary>Declare fields that must be preserved through method execution.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocPreservesAttribute : Attribute
{
    public string[] Fields { get; }

    public DocPreservesAttribute(params string[] fields) => Fields = fields;
}

/// <summary>Document comparison semantics for a method.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocCompareAttribute : Attribute
{
    public string Value { get; }

    public DocCompareAttribute(string value) => Value = value;
}

/// <summary>Document a relationship between entities.</summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Property | AttributeTargets.Method)]
public class DocRelationAttribute : Attribute
{
    public string Value { get; }
    public string? Target { get; set; }

    public DocRelationAttribute(string value) => Value = value;
}
