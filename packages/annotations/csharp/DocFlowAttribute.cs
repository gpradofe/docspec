// @docspec:module {
//   id: "docspec-csharp-annotations-flow",
//   name: "Flow Annotations",
//   description: "Defines [DocFlow] and [Step] attributes for documenting business flows and their individual steps.",
//   since: "3.0.0"
// }

namespace DocSpec.Annotations;

/// <summary>Define a business flow.</summary>
// [DocIntentional("Define a multi-step business flow with trigger and step sequence for architecture documentation")]
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public class DocFlowAttribute : Attribute
{
    public string Id { get; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Trigger { get; set; }

    public DocFlowAttribute(string id) => Id = id;
}

/// <summary>Define a flow step.</summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
public class StepAttribute : Attribute
{
    public string Id { get; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Type { get; set; }
    public bool Ai { get; set; }

    public StepAttribute(string id) => Id = id;
}
