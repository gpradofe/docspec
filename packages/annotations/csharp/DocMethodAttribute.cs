// @docspec:module {
//   id: "docspec-csharp-annotations-method",
//   name: "Method & Field Annotations",
//   description: "Defines [DocMethod] and [DocField] attributes for documenting individual methods and properties with metadata, versioning, and deprecation info.",
//   since: "3.0.0"
// }

namespace DocSpec.Annotations;

/// <summary>Document a method with DocSpec metadata.</summary>
// [DocIntentional("Attach structured documentation metadata to a method including versioning and deprecation")]
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class DocMethodAttribute : Attribute
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Since { get; set; }
    public string? Deprecated { get; set; }
    public string[]? Tags { get; set; }

    public DocMethodAttribute() { }
    public DocMethodAttribute(string description) => Description = description;
}

/// <summary>Document a field or property.</summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false)]
public class DocFieldAttribute : Attribute
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Since { get; set; }
    public string? Type { get; set; }

    public DocFieldAttribute() { }
    public DocFieldAttribute(string description) => Description = description;
}
