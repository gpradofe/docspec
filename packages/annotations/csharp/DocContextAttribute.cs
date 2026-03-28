// @docspec:module {
//   id: "docspec-csharp-annotations-context",
//   name: "Context Annotations",
//   description: "Defines [DocContext], [ContextInput], and [ContextUses] attributes for documenting runtime context narratives and cross-project links.",
//   since: "3.0.0"
// }

namespace DocSpec.Annotations;

/// <summary>Define a context narrative.</summary>
// [DocIntentional("Attach a runtime context narrative with inputs and cross-project dependencies to a class")]
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public class DocContextAttribute : Attribute
{
    public string Id { get; }
    public string? Name { get; set; }
    public string? AttachedTo { get; set; }
    public string? Flow { get; set; }

    public DocContextAttribute(string id) => Id = id;
}

/// <summary>Describe a single runtime input within a DocContext.</summary>
public class ContextInputAttribute : Attribute
{
    public string Name { get; }
    public string? Source { get; set; }
    public string? Description { get; set; }
    public string[]? Items { get; set; }

    public ContextInputAttribute(string name) => Name = name;
}

/// <summary>Declare a cross-project usage link within a DocContext.</summary>
public class ContextUsesAttribute : Attribute
{
    public string Artifact { get; }
    public string What { get; }
    public string? Why { get; set; }

    public ContextUsesAttribute(string artifact, string what)
    {
        Artifact = artifact;
        What = what;
    }
}
