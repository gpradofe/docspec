// @docspec:module {
//   id: "docspec-csharp-annotations-dsti",
//   name: "DSTI Annotations",
//   description: "Defines semantic DSTI annotations: [DocInvariant], [DocMonotonic], [DocConservation], [DocIdempotent], [DocDeterministic], [DocBoundary], [DocStateMachine], [DocOrdering], and [DocIntentional].",
//   since: "3.0.0"
// }

namespace DocSpec.Annotations;

/// <summary>Declare invariant rules for property-based testing.</summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
public class DocInvariantAttribute : Attribute
{
    public string[] Rules { get; }
    public string? Description { get; set; }
    public DocInvariantAttribute(params string[] rules) => Rules = rules;
}

/// <summary>Declare a monotonic property.</summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class DocMonotonicAttribute : Attribute
{
    public string Field { get; }
    public string Direction { get; set; } = "increasing";
    public string? Description { get; set; }
    public DocMonotonicAttribute(string field) => Field = field;
}

/// <summary>Declare a conservation law.</summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class DocConservationAttribute : Attribute
{
    public string Quantity { get; }
    public string? Scope { get; set; }
    public string? Description { get; set; }
    public DocConservationAttribute(string quantity) => Quantity = quantity;
}

/// <summary>Mark a method as idempotent.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocIdempotentAttribute : Attribute { }

/// <summary>Mark a method as deterministic.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocDeterministicAttribute : Attribute { }

/// <summary>
/// Mark a method as commutative — the order of its arguments does not affect the result.
/// Generates property-based tests verifying that f(a, b) == f(b, a) for all valid input pairs.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocCommutativeAttribute : Attribute
{
    public string? Description { get; }
    public DocCommutativeAttribute() { }
    public DocCommutativeAttribute(string description) => Description = description;
}

/// <summary>Declare a boundary type.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocBoundaryAttribute : Attribute
{
    public string Type { get; }
    public string? Description { get; set; }
    public DocBoundaryAttribute(string type) => Type = type;
}

/// <summary>Declare a state machine.</summary>
[AttributeUsage(AttributeTargets.Class)]
public class DocStateMachineAttribute : Attribute
{
    public string[] States { get; }
    public string[]? Transitions { get; set; }
    public DocStateMachineAttribute(params string[] states) => States = states;
}

/// <summary>Declare ordering strategy.</summary>
[AttributeUsage(AttributeTargets.Class)]
public class DocOrderingAttribute : Attribute
{
    public string Strategy { get; set; } = "natural";
    public string? Field { get; set; }
    public string? Comparator { get; set; }
}

/// <summary>Express intent explicitly.</summary>
[AttributeUsage(AttributeTargets.Method)]
public class DocIntentionalAttribute : Attribute
{
    public string Intent { get; }
    public DocIntentionalAttribute(string intent) => Intent = intent;
}
