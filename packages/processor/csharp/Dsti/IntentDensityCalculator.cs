using System;
using System.Collections.Generic;

namespace DocSpec.Analyzer.Dsti;

// [DocModule(Id = "docspec-csharp-isd-calculator", Name = "DSTI Intent Density Calculator")]
// [DocDescription("Calculates the ISD score (0.0-1.0) using 13-channel weighted formula.")]
// [DocSince("3.0.0")]
// [DocDeterministic]

/// <summary>
/// Calculates the Intent Signal Density (ISD) score for a method based on
/// the collected intent signals across all 13 channels. The score ranges
/// from 0.0 (no intent signals) to 1.0 (maximum intent density).
/// The C# equivalent of Java's <c>IntentDensityCalculator</c>.
///
/// <para>ISD formula (weights sum to 1.0):</para>
/// <code>
/// ISD = w1*nameSemantics + w2*guardClauses + w3*branches + w4*dataFlow
///     + w5*returnType + w6*loops + w7*errorHandling + w8*constants
///     + w9*nullChecks + w10*assertions + w11*logging + w12*dependencies
///     + w13*validationAnnotations
/// </code>
/// </summary>
// [DocInvariant(Rules = new[] { "score >= 0.0", "score <= 1.0", "channel weights sum to 1.0" })]
// [DocIntentional("Calculate a weighted intent density score from 13 DSTI channels")]
public class IntentDensityCalculator
{
    // Channel weights (sum = 1.0)
    private const double W_NameSemantics = 0.15;
    private const double W_GuardClauses = 0.10;
    private const double W_Branches = 0.10;
    private const double W_DataFlow = 0.05;
    private const double W_ReturnType = 0.05;
    private const double W_Loops = 0.08;
    private const double W_ErrorHandling = 0.10;
    private const double W_Constants = 0.05;
    private const double W_NullChecks = 0.07;
    private const double W_Assertions = 0.07;
    private const double W_Logging = 0.05;
    private const double W_Dependencies = 0.08;
    private const double W_ValidationAnnotations = 0.05;

    /// <summary>
    /// Calculates the ISD score for the given intent signals.
    /// </summary>
    /// <param name="signals">The collected intent signals for a method.</param>
    /// <returns>A score between 0.0 and 1.0.</returns>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    // [DocPreserves("channel weight proportions")]
    public double Calculate(IntentSignals signals)
    {
        double score = 0.0;

        // Channel 1: Name semantics (0 or W_NameSemantics)
        if (signals.NameSemantics is not null &&
            signals.NameSemantics.Intent is not null &&
            signals.NameSemantics.Intent != "unknown")
        {
            score += W_NameSemantics;
        }

        // Channel 2: Guard clauses (scaled up to W_GuardClauses)
        if (signals.GuardClauses > 0)
        {
            score += Math.Min(W_GuardClauses, signals.GuardClauses * 0.035);
        }

        // Channel 3: Branches (scaled up to W_Branches)
        if (signals.Branches > 0)
        {
            score += Math.Min(W_Branches, signals.Branches * 0.025);
        }

        // Channel 4: Data flow (0, half, or full W_DataFlow)
        if (signals.DataFlow is not null)
        {
            bool hasReads = signals.DataFlow.Reads?.Count > 0;
            bool hasWrites = signals.DataFlow.Writes?.Count > 0;
            if (hasReads && hasWrites)
                score += W_DataFlow;
            else if (hasReads || hasWrites)
                score += W_DataFlow * 0.5;
        }

        // Channel 5: Return type inference from verb
        if (signals.NameSemantics?.Intent is "query" or "creation" or "transformation")
        {
            score += W_ReturnType;
        }

        // Channel 6: Loop properties (up to W_Loops)
        if (signals.LoopProperties is not null)
        {
            double loopScore = 0.0;
            if (signals.LoopProperties.HasLinq) loopScore += W_Loops * 0.6;
            if (signals.LoopProperties.HasForeach) loopScore += W_Loops * 0.4;
            score += Math.Min(W_Loops, loopScore);
        }

        // Channel 7: Error handling (scaled up to W_ErrorHandling)
        if (signals.ErrorHandling is not null && signals.ErrorHandling.CatchBlocks > 0)
        {
            score += Math.Min(W_ErrorHandling, signals.ErrorHandling.CatchBlocks * 0.035);
        }

        // Channel 8: Constants (scaled up to W_Constants)
        if (signals.Constants?.Count > 0)
        {
            score += Math.Min(W_Constants, signals.Constants.Count * 0.015);
        }

        // Channel 9: Null checks (scaled up to W_NullChecks)
        if (signals.NullChecks > 0)
        {
            score += Math.Min(W_NullChecks, signals.NullChecks * 0.02);
        }

        // Channel 10: Assertions (scaled up to W_Assertions)
        if (signals.Assertions > 0)
        {
            score += Math.Min(W_Assertions, signals.Assertions * 0.025);
        }

        // Channel 11: Logging (scaled up to W_Logging)
        if (signals.LogStatements > 0)
        {
            score += Math.Min(W_Logging, signals.LogStatements * 0.02);
        }

        // Channel 12: Dependencies (scaled up to W_Dependencies)
        if (signals.Dependencies?.Count > 0)
        {
            score += Math.Min(W_Dependencies, signals.Dependencies.Count * 0.025);
        }

        // Channel 13: Validation annotations (scaled up to W_ValidationAnnotations)
        if (signals.ValidationAnnotations > 0)
        {
            score += Math.Min(W_ValidationAnnotations, signals.ValidationAnnotations * 0.02);
        }

        return Math.Min(1.0, score);
    }
}

/// <summary>
/// Container for all 13 intent signal channels collected from a method.
/// </summary>
public class IntentSignals
{
    public NamingAnalyzer.NameSemantics? NameSemantics { get; set; }
    public int GuardClauses { get; set; }
    public int Branches { get; set; }
    public DataFlowSignals? DataFlow { get; set; }
    public LoopSignals? LoopProperties { get; set; }
    public ErrorHandlingSignals? ErrorHandling { get; set; }
    public List<string>? Constants { get; set; }
    public int NullChecks { get; set; }
    public int Assertions { get; set; }
    public int LogStatements { get; set; }
    public List<string>? Dependencies { get; set; }
    public int ValidationAnnotations { get; set; }
}

public class DataFlowSignals
{
    public List<string>? Reads { get; set; }
    public List<string>? Writes { get; set; }
}

public class LoopSignals
{
    /// <summary>Whether the method uses LINQ (equivalent to Java Streams).</summary>
    public bool HasLinq { get; set; }
    /// <summary>Whether the method uses foreach loops.</summary>
    public bool HasForeach { get; set; }
    /// <summary>Names of stream/LINQ operations found (e.g., Select, Where, GroupBy).</summary>
    public List<string>? StreamOps { get; set; }
}

public class ErrorHandlingSignals
{
    public int CatchBlocks { get; set; }
    public bool HasFinally { get; set; }
    public List<string>? CaughtTypes { get; set; }
}
