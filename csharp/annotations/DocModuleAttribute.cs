// @docspec:module {
//   id: "docspec-csharp-annotations-module",
//   name: "Module Annotation",
//   description: "Defines the [DocModule] attribute for marking classes as DocSpec modules with name, description, and audience metadata.",
//   since: "3.0.0"
// }

namespace DocSpec.Annotations;

/// <summary>Mark a class or namespace as a DocSpec module.</summary>
// [DocIntentional("Group related types into a named documentation module with optional audience targeting")]
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Interface, AllowMultiple = false)]
public class DocModuleAttribute : Attribute
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Since { get; set; }
    public string? Audience { get; set; }

    public DocModuleAttribute() { }
    public DocModuleAttribute(string name) => Name = name;
}
