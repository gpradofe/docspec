// @docspec:module {
//   id: "docspec-csharp-coverage-calculator",
//   name: "Coverage Calculator",
//   description: "Calculates documentation coverage percentages across classes, methods, and parameters in the DocSpec output.",
//   since: "3.0.0"
// }

using System;
using System.Collections.Generic;
using System.Linq;

namespace DocSpec.Analyzer.Metrics;

/// <summary>
/// Calculates documentation coverage percentages across the entire
/// DocSpec output. Tracks documented vs undocumented classes, methods,
/// and parameters. The C# equivalent of Java's <c>CoverageCalculator</c>.
/// </summary>
// [DocIntentional("Track documented vs undocumented elements and compute coverage percentage")]
// [DocInvariant(Rules = new[] { "coveragePercent >= 0.0", "coveragePercent <= 100.0", "documentedClasses <= totalClasses" })]
public class CoverageCalculator
{
    private int _totalClasses;
    private int _documentedClasses;
    private int _autoDiscoveredClasses;
    private int _annotatedClasses;
    private int _inferredDescriptions;
    private int _totalMethods;
    private int _documentedMethods;
    private int _totalParams;
    private int _documentedParams;

    /// <summary>
    /// Analyzes the DocSpec output and counts documented elements.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Count documented vs undocumented types across all modules")]
    public void Analyze(DocSpecOutput output)
    {
        foreach (var module in output.Modules)
        {
            foreach (var member in module.Members)
            {
                _totalClasses++;

                bool hasDescription = !string.IsNullOrWhiteSpace(member.Description);
                if (hasDescription)
                {
                    _documentedClasses++;
                }

                // Track discovery source (when available)
                // In the current C# model, we infer from Kind:
                // Framework types (controller, entity) are "framework",
                // others are "auto"
                if (member.Kind is "controller" or "entity" or "db-context")
                {
                    _autoDiscoveredClasses++;
                }
            }
        }
    }

    /// <summary>
    /// Records that a description was inferred (not written by a human).
    /// </summary>
    // [DocIntentional("Track descriptions that were auto-inferred rather than authored")]
    public void IncrementInferredDescriptions()
    {
        _inferredDescriptions++;
    }

    /// <summary>
    /// Records a method as total and optionally documented.
    /// </summary>
    // [DocIntentional("Increment method documentation counters")]
    public void RecordMethod(bool hasDescription)
    {
        _totalMethods++;
        if (hasDescription) _documentedMethods++;
    }

    /// <summary>
    /// Records a parameter as total and optionally documented.
    /// </summary>
    // [DocIntentional("Increment parameter documentation counters")]
    public void RecordParam(bool hasDescription)
    {
        _totalParams++;
        if (hasDescription) _documentedParams++;
    }

    /// <summary>
    /// Increments the annotated class counter (classes with [DocModule] or other DocSpec attributes).
    /// </summary>
    // [DocIntentional("Increment counter for classes with DocSpec attributes")]
    public void IncrementAnnotatedClasses()
    {
        _annotatedClasses++;
    }

    /// <summary>
    /// Builds a <see cref="DiscoveryInfo"/> model from the accumulated metrics.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public DiscoveryInfo ToDiscoveryInfo(string mode, List<string> frameworks,
                                         List<string>? scannedNamespaces = null,
                                         List<string>? excludedNamespaces = null)
    {
        return new DiscoveryInfo
        {
            Mode = mode,
            Frameworks = frameworks,
            ScannedNamespaces = scannedNamespaces ?? new List<string>(),
            ExcludedNamespaces = excludedNamespaces ?? new List<string>(),
            TotalClasses = _totalClasses,
            DocumentedClasses = _documentedClasses,
            AutoDiscoveredClasses = _autoDiscoveredClasses,
            AnnotatedClasses = _annotatedClasses,
            InferredDescriptions = _inferredDescriptions,
            TotalMethods = _totalMethods,
            DocumentedMethods = _documentedMethods,
            TotalParams = _totalParams,
            DocumentedParams = _documentedParams,
            CoveragePercent = _totalClasses > 0
                ? Math.Round((double)_documentedClasses / _totalClasses * 1000.0) / 10.0
                : 0
        };
    }

    public int TotalClasses => _totalClasses;
    public int DocumentedClasses => _documentedClasses;

    public double CoveragePercent
        => _totalClasses > 0
            ? Math.Round((double)_documentedClasses / _totalClasses * 1000.0) / 10.0
            : 0;
}

/// <summary>
/// Model representing the discovery and coverage statistics
/// for the DocSpec output.
/// </summary>
public class DiscoveryInfo
{
    public string Mode { get; set; } = "auto";
    public List<string> Frameworks { get; set; } = new();
    public List<string> ScannedNamespaces { get; set; } = new();
    public List<string> ExcludedNamespaces { get; set; } = new();
    public int TotalClasses { get; set; }
    public int DocumentedClasses { get; set; }
    public int AutoDiscoveredClasses { get; set; }
    public int AnnotatedClasses { get; set; }
    public int InferredDescriptions { get; set; }
    public int TotalMethods { get; set; }
    public int DocumentedMethods { get; set; }
    public int TotalParams { get; set; }
    public int DocumentedParams { get; set; }
    public double CoveragePercent { get; set; }
}
