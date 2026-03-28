using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace DocSpec.Analyzer.Dsti;

// [DocModule(Id = "docspec-csharp-intent-extractor", Name = "DSTI Intent Extractor")]
// [DocDescription("Extracts all 13 DSTI channels from C# methods via Roslyn syntax analysis.")]
// [DocSince("3.0.0")]

/// <summary>
/// Extracts all 13 DSTI intent signal channels from a C# method's Roslyn syntax tree.
/// Channels: nameSemantics, guardClauses, branches, dataFlow, returnType (via nameSemantics),
/// loopProperties, errorHandling, constants, nullChecks, assertions, logStatements,
/// dependencies, validationAnnotations.
///
/// <para>The C# equivalent of Java's <c>IntentGraphExtractor</c> + tree-based analysis,
/// adapted for Roslyn's rich syntax API instead of reflection-based <c>com.sun.source.util.Trees</c>.</para>
/// </summary>
// [DocBoundary("Roslyn syntax tree analysis")]
// [DocIntentional("Extract all 13 DSTI channels from method syntax using Roslyn's descendant traversal")]
public class IntentExtractor
{
    private readonly NamingAnalyzer _namingAnalyzer = new();
    private readonly IntentDensityCalculator _densityCalculator = new();

    /// <summary>Known LINQ method names used for loop/stream detection (Channel 6).</summary>
    private static readonly HashSet<string> LinqMethods = new(StringComparer.Ordinal)
    {
        "Select", "Where", "Any", "All", "OrderBy", "OrderByDescending",
        "ThenBy", "ThenByDescending", "GroupBy", "SelectMany", "Distinct",
        "First", "FirstOrDefault", "Last", "LastOrDefault", "Single", "SingleOrDefault",
        "Count", "Sum", "Average", "Min", "Max", "Aggregate",
        "Skip", "Take", "SkipWhile", "TakeWhile", "Zip", "Concat",
        "Union", "Intersect", "Except", "ToList", "ToArray", "ToDictionary",
        "ToHashSet", "AsEnumerable", "OfType", "Cast"
    };

    /// <summary>Assertion-like method name patterns (Channel 10).</summary>
    private static readonly HashSet<string> AssertionPrefixes = new(StringComparer.Ordinal)
    {
        "Assert", "Debug.Assert", "Guard", "ArgumentNullException.ThrowIfNull",
        "ArgumentException.ThrowIfNullOrEmpty", "ArgumentOutOfRangeException.ThrowIfNegative"
    };

    /// <summary>Logger method names (Channel 11) covering ILogger, Serilog, NLog, log4net patterns.</summary>
    private static readonly HashSet<string> LogMethodNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "Log", "LogTrace", "LogDebug", "LogInformation", "LogWarning", "LogError", "LogCritical",
        // Serilog static Log.* or ILogger.*
        "Verbose", "Debug", "Information", "Warning", "Error", "Fatal",
        // NLog / log4net
        "Trace", "Info", "Warn"
    };

    /// <summary>Data annotation attribute names (Channel 13).</summary>
    private static readonly HashSet<string> ValidationAttributeNames = new(StringComparer.Ordinal)
    {
        "Required", "Range", "StringLength", "MaxLength", "MinLength",
        "EmailAddress", "Phone", "RegularExpression", "Compare",
        "CreditCard", "Url", "DataType",
        // Also common FluentValidation / custom guard attributes
        "NotNull", "NotEmpty", "NotBlank", "Valid",
        "Min", "Max", "Size", "Positive", "PositiveOrZero",
        "Negative", "NegativeOrZero"
    };

    /// <summary>
    /// Extracts all 13 DSTI channels from the given method declaration.
    /// </summary>
    /// <param name="method">The Roslyn <see cref="MethodDeclarationSyntax"/> to analyze.</param>
    /// <returns>An <see cref="IntentSignals"/> with all channels populated, or null if the method has no name.</returns>
    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Extract all 13 DSTI channels from a single method declaration")]
    public IntentSignals? Extract(MethodDeclarationSyntax method)
    {
        var name = method.Identifier.Text;
        if (string.IsNullOrEmpty(name)) return null;

        var signals = new IntentSignals();

        // --- Channel 1: Name Semantics (via NamingAnalyzer) ---
        signals.NameSemantics = _namingAnalyzer.Analyze(name);

        // --- Channel 2: Guard Clauses ---
        signals.GuardClauses = ExtractGuardClauses(method);

        // --- Channel 3: Branches ---
        signals.Branches = ExtractBranches(method);

        // --- Channel 4: Data Flow ---
        signals.DataFlow = ExtractDataFlow(method);

        // --- Channel 5: Return Type (captured in NameSemantics; additional metadata) ---
        // The ISD calculator infers return-type score from NameSemantics.Intent.
        // We do not add a separate field, but the naming analyzer already categorizes it.

        // --- Channel 6: Loop Properties ---
        signals.LoopProperties = ExtractLoopProperties(method);

        // --- Channel 7: Error Handling ---
        signals.ErrorHandling = ExtractErrorHandling(method);

        // --- Channel 8: Constants ---
        signals.Constants = ExtractConstants(method);

        // --- Channel 9: Null Checks ---
        signals.NullChecks = ExtractNullChecks(method);

        // --- Channel 10: Assertions ---
        signals.Assertions = ExtractAssertions(method);

        // --- Channel 11: Log Statements ---
        signals.LogStatements = ExtractLogStatements(method);

        // --- Channel 12: Dependencies ---
        signals.Dependencies = ExtractDependencies(method);

        // --- Channel 13: Validation Annotations ---
        signals.ValidationAnnotations = ExtractValidationAnnotations(method);

        return signals;
    }

    /// <summary>
    /// Extracts intent signals and calculates the ISD score in one call.
    /// </summary>
    /// <param name="method">The method to analyze.</param>
    /// <returns>A tuple of (IntentSignals, ISD score), or null if extraction fails.</returns>
    // [DocMethod(Since = "3.0.0")]
    // [DocIntentional("Extract intent signals and calculate ISD score in one call")]
    public (IntentSignals Signals, double Score)? ExtractWithScore(MethodDeclarationSyntax method)
    {
        var signals = Extract(method);
        if (signals is null) return null;

        double score = _densityCalculator.Calculate(signals);
        return (signals, score);
    }

    // ==================== Channel Extractors ====================

    /// <summary>
    /// Channel 2: Guard clauses -- if statements at the top of the method body
    /// whose then-branch is a single throw statement (early-exit guards).
    /// </summary>
    // [DocDeterministic]
    private static int ExtractGuardClauses(MethodDeclarationSyntax method)
    {
        if (method.Body is null) return 0;

        int guards = 0;
        foreach (var stmt in method.Body.Statements)
        {
            if (stmt is not IfStatementSyntax ifStmt) break; // guards must be contiguous at top

            if (IsThrowOnlyBlock(ifStmt.Statement))
            {
                guards++;
            }
            else
            {
                break; // Non-guard if means end of guard region
            }
        }

        return guards;
    }

    /// <summary>
    /// Channel 3: Branches -- total count of if, switch, ternary, and switch-expression nodes.
    /// </summary>
    // [DocDeterministic]
    private static int ExtractBranches(MethodDeclarationSyntax method)
    {
        if (method.Body is null && method.ExpressionBody is null) return 0;

        SyntaxNode bodyNode = (SyntaxNode?)method.Body ?? method.ExpressionBody!;
        int branches = bodyNode.DescendantNodes().OfType<IfStatementSyntax>().Count();
        branches += bodyNode.DescendantNodes().OfType<SwitchStatementSyntax>().Count();
        branches += bodyNode.DescendantNodes().OfType<SwitchExpressionSyntax>().Count();
        branches += bodyNode.DescendantNodes().OfType<ConditionalExpressionSyntax>().Count();
        return branches;
    }

    /// <summary>
    /// Channel 4: Data flow -- tracks reads and writes to instance members (this.X).
    /// Assignments to this.Property or this._field are writes; property/field accesses are reads.
    /// </summary>
    // [DocDeterministic]
    private static DataFlowSignals? ExtractDataFlow(MethodDeclarationSyntax method)
    {
        SyntaxNode? bodyNode = (SyntaxNode?)method.Body ?? method.ExpressionBody;
        if (bodyNode is null) return null;

        var reads = new HashSet<string>(StringComparer.Ordinal);
        var writes = new HashSet<string>(StringComparer.Ordinal);

        // Find all member access expressions in the method body
        foreach (var memberAccess in bodyNode.DescendantNodes().OfType<MemberAccessExpressionSyntax>())
        {
            // Check if the expression is "this.X"
            if (memberAccess.Expression is ThisExpressionSyntax)
            {
                var memberName = memberAccess.Name.Identifier.Text;

                // Determine if it's a write (left side of assignment)
                if (memberAccess.Parent is AssignmentExpressionSyntax assignment &&
                    assignment.Left == memberAccess)
                {
                    writes.Add(memberName);
                }
                else
                {
                    reads.Add(memberName);
                }
            }
        }

        // Also detect implicit this access: simple identifier assignments that match
        // known field patterns (_fieldName or property set)
        foreach (var assignment in bodyNode.DescendantNodes().OfType<AssignmentExpressionSyntax>())
        {
            if (assignment.Left is IdentifierNameSyntax id)
            {
                var idName = id.Identifier.Text;
                // Convention: underscore-prefixed fields are instance fields
                if (idName.StartsWith("_"))
                {
                    writes.Add(idName);
                }
            }
        }

        foreach (var id in bodyNode.DescendantNodes().OfType<IdentifierNameSyntax>())
        {
            var idName = id.Identifier.Text;
            if (idName.StartsWith("_") &&
                !(id.Parent is AssignmentExpressionSyntax a && a.Left == id))
            {
                reads.Add(idName);
            }
        }

        if (reads.Count == 0 && writes.Count == 0) return null;

        return new DataFlowSignals
        {
            Reads = reads.Count > 0 ? reads.ToList() : null,
            Writes = writes.Count > 0 ? writes.ToList() : null
        };
    }

    /// <summary>
    /// Channel 6: Loop properties -- detects foreach loops, for/while loops, and LINQ calls.
    /// </summary>
    // [DocDeterministic]
    private static LoopSignals? ExtractLoopProperties(MethodDeclarationSyntax method)
    {
        SyntaxNode? bodyNode = (SyntaxNode?)method.Body ?? method.ExpressionBody;
        if (bodyNode is null) return null;

        bool hasForeach = bodyNode.DescendantNodes().OfType<ForEachStatementSyntax>().Any();
        // Also count for and while as "foreach" equivalents for ISD purposes
        hasForeach = hasForeach ||
                     bodyNode.DescendantNodes().OfType<ForStatementSyntax>().Any() ||
                     bodyNode.DescendantNodes().OfType<WhileStatementSyntax>().Any() ||
                     bodyNode.DescendantNodes().OfType<DoStatementSyntax>().Any();

        bool hasLinq = false;
        var streamOps = new List<string>();
        foreach (var invocation in bodyNode.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
            {
                var methodName = memberAccess.Name.Identifier.Text;
                if (LinqMethods.Contains(methodName))
                {
                    hasLinq = true;
                    if (!streamOps.Contains(methodName))
                        streamOps.Add(methodName);
                }
            }
        }

        // Also check for query syntax (from x in collection select x)
        if (!hasLinq)
        {
            hasLinq = bodyNode.DescendantNodes().OfType<QueryExpressionSyntax>().Any();
            if (hasLinq && !streamOps.Contains("query-syntax"))
                streamOps.Add("query-syntax");
        }

        if (!hasForeach && !hasLinq) return null;

        return new LoopSignals
        {
            HasForeach = hasForeach,
            HasLinq = hasLinq,
            StreamOps = streamOps.Count > 0 ? streamOps : null
        };
    }

    /// <summary>
    /// Channel 7: Error handling -- counts catch blocks, detects finally, and extracts caught exception type names.
    /// </summary>
    // [DocDeterministic]
    private static ErrorHandlingSignals? ExtractErrorHandling(MethodDeclarationSyntax method)
    {
        SyntaxNode? bodyNode = (SyntaxNode?)method.Body ?? method.ExpressionBody;
        if (bodyNode is null) return null;

        var tryStatements = bodyNode.DescendantNodes().OfType<TryStatementSyntax>().ToList();
        if (tryStatements.Count == 0) return null;

        int catchBlocks = 0;
        bool hasFinally = false;
        var caughtTypes = new List<string>();

        foreach (var tryStmt in tryStatements)
        {
            catchBlocks += tryStmt.Catches.Count;

            if (tryStmt.Finally is not null)
            {
                hasFinally = true;
            }

            foreach (var catchClause in tryStmt.Catches)
            {
                if (catchClause.Declaration is not null)
                {
                    var typeName = catchClause.Declaration.Type.ToString();
                    if (!string.IsNullOrEmpty(typeName) && !caughtTypes.Contains(typeName))
                    {
                        caughtTypes.Add(typeName);
                    }
                }
            }
        }

        if (catchBlocks == 0) return null;

        return new ErrorHandlingSignals
        {
            CatchBlocks = catchBlocks,
            HasFinally = hasFinally,
            CaughtTypes = caughtTypes.Count > 0 ? caughtTypes : null
        };
    }

    /// <summary>
    /// Channel 8: Constants -- finds const/readonly field references and UPPER_CASE identifiers
    /// used in the method body, as well as string and numeric literal values.
    /// </summary>
    // [DocDeterministic]
    private static List<string>? ExtractConstants(MethodDeclarationSyntax method)
    {
        SyntaxNode? bodyNode = (SyntaxNode?)method.Body ?? method.ExpressionBody;
        if (bodyNode is null) return null;

        var constants = new HashSet<string>(StringComparer.Ordinal);

        // Find UPPER_CASE identifiers (convention for constants: MY_CONST, MAX_RETRIES)
        foreach (var id in bodyNode.DescendantNodes().OfType<IdentifierNameSyntax>())
        {
            var idName = id.Identifier.Text;
            if (idName.Length >= 3 && IsUpperSnakeCase(idName))
            {
                constants.Add(idName);
            }
        }

        // Find member access that references known constant patterns (e.g., int.MaxValue, TimeSpan.Zero)
        foreach (var memberAccess in bodyNode.DescendantNodes().OfType<MemberAccessExpressionSyntax>())
        {
            var memberName = memberAccess.Name.Identifier.Text;
            if (memberName.Length >= 3 && IsUpperSnakeCase(memberName))
            {
                constants.Add(memberAccess.ToString());
            }
            // Also detect well-known .NET constants like MaxValue, MinValue, Empty
            if (memberName is "MaxValue" or "MinValue" or "Empty" or "Zero" or "One")
            {
                constants.Add(memberAccess.ToString());
            }
        }

        // Find string literals used as constant-like values (named strings, not interpolated)
        foreach (var literal in bodyNode.DescendantNodes().OfType<LiteralExpressionSyntax>())
        {
            if (literal.IsKind(SyntaxKind.StringLiteralExpression))
            {
                var value = literal.Token.ValueText;
                if (!string.IsNullOrWhiteSpace(value) && value.Length <= 100)
                {
                    constants.Add($"\"{value}\"");
                }
            }
            else if (literal.IsKind(SyntaxKind.NumericLiteralExpression))
            {
                var numStr = literal.Token.Text;
                // Only record "interesting" numeric constants (not 0 or 1)
                if (numStr != "0" && numStr != "1")
                {
                    constants.Add(numStr);
                }
            }
        }

        return constants.Count > 0 ? constants.ToList() : null;
    }

    /// <summary>
    /// Channel 9: Null checks -- counts null-conditional (?.), null-coalescing (??),
    /// is null, is not null, == null, != null, and ArgumentNullException.ThrowIfNull patterns.
    /// </summary>
    // [DocDeterministic]
    private static int ExtractNullChecks(MethodDeclarationSyntax method)
    {
        SyntaxNode? bodyNode = (SyntaxNode?)method.Body ?? method.ExpressionBody;
        if (bodyNode is null) return 0;

        int count = 0;

        // ?. (ConditionalAccessExpression)
        count += bodyNode.DescendantNodes().OfType<ConditionalAccessExpressionSyntax>().Count();

        // ?? and ??= (CoalesceExpression, CoalesceAssignmentExpression)
        count += bodyNode.DescendantNodes()
            .Count(n => n.IsKind(SyntaxKind.CoalesceExpression) ||
                        n.IsKind(SyntaxKind.CoalesceAssignmentExpression));

        // Binary expressions: == null, != null
        foreach (var binary in bodyNode.DescendantNodes().OfType<BinaryExpressionSyntax>())
        {
            if (binary.IsKind(SyntaxKind.EqualsExpression) || binary.IsKind(SyntaxKind.NotEqualsExpression))
            {
                if (binary.Right.IsKind(SyntaxKind.NullLiteralExpression) ||
                    binary.Left.IsKind(SyntaxKind.NullLiteralExpression))
                {
                    count++;
                }
            }
        }

        // Pattern matching: "is null", "is not null"
        foreach (var isPattern in bodyNode.DescendantNodes().OfType<IsPatternExpressionSyntax>())
        {
            if (isPattern.Pattern is ConstantPatternSyntax { Expression: { } expr } &&
                expr.IsKind(SyntaxKind.NullLiteralExpression))
            {
                count++; // "is null"
            }
            else if (isPattern.Pattern is UnaryPatternSyntax { Pattern: ConstantPatternSyntax { Expression: { } negExpr } } &&
                     negExpr.IsKind(SyntaxKind.NullLiteralExpression))
            {
                count++; // "is not null"
            }
        }

        // ArgumentNullException.ThrowIfNull / ThrowIfNullOrEmpty calls
        foreach (var invocation in bodyNode.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var exprText = invocation.Expression.ToString();
            if (exprText.Contains("ThrowIfNull") || exprText.Contains("ThrowIfNullOrEmpty"))
            {
                count++;
            }
        }

        return count;
    }

    /// <summary>
    /// Channel 10: Assertions -- counts Assert.*, Debug.Assert, Guard.*, and
    /// ArgumentNullException.ThrowIfNull-style calls.
    /// </summary>
    // [DocDeterministic]
    private static int ExtractAssertions(MethodDeclarationSyntax method)
    {
        SyntaxNode? bodyNode = (SyntaxNode?)method.Body ?? method.ExpressionBody;
        if (bodyNode is null) return 0;

        int count = 0;

        foreach (var invocation in bodyNode.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var exprText = invocation.Expression.ToString();

            // Debug.Assert(...)
            if (exprText.StartsWith("Debug.Assert"))
            {
                count++;
                continue;
            }

            // Assert.* (e.g., Assert.IsTrue, Assert.AreEqual)
            if (exprText.StartsWith("Assert."))
            {
                count++;
                continue;
            }

            // Guard.* (e.g., Guard.Against.Null)
            if (exprText.StartsWith("Guard."))
            {
                count++;
                continue;
            }

            // ArgumentNullException.ThrowIfNull, ArgumentException.ThrowIfNullOrEmpty, etc.
            if (exprText.Contains("ArgumentNullException.ThrowIfNull") ||
                exprText.Contains("ArgumentException.ThrowIfNullOrEmpty") ||
                exprText.Contains("ArgumentOutOfRangeException.ThrowIf"))
            {
                count++;
                continue;
            }

            // Check/Require/Verify patterns (e.g., CheckNotNull, RequireNonNull)
            if (invocation.Expression is IdentifierNameSyntax idExpr)
            {
                var idName = idExpr.Identifier.Text;
                if (Regex.IsMatch(idName, @"^(check|require|verify)[A-Z]", RegexOptions.None))
                {
                    count++;
                }
            }
        }

        return count;
    }

    /// <summary>
    /// Channel 11: Log statements -- counts ILogger.Log*, Serilog Log.*, and
    /// NLog/log4net logger calls.
    /// </summary>
    // [DocDeterministic]
    private static int ExtractLogStatements(MethodDeclarationSyntax method)
    {
        SyntaxNode? bodyNode = (SyntaxNode?)method.Body ?? method.ExpressionBody;
        if (bodyNode is null) return 0;

        int count = 0;

        foreach (var invocation in bodyNode.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
            {
                var methodName = memberAccess.Name.Identifier.Text;

                // Match known log method names
                if (LogMethodNames.Contains(methodName))
                {
                    var receiverText = memberAccess.Expression.ToString();
                    // Ensure the receiver looks like a logger (contains "log", "logger", "Log", "_log", etc.)
                    if (IsLoggerReceiver(receiverText))
                    {
                        count++;
                    }
                }
            }
        }

        return count;
    }

    /// <summary>
    /// Channel 12: Dependencies -- extracts constructor-injected dependencies
    /// by examining the enclosing class's constructor parameter types.
    /// </summary>
    // [DocDeterministic]
    private static List<string>? ExtractDependencies(MethodDeclarationSyntax method)
    {
        // Walk up to find the enclosing class/record/struct
        var enclosingType = method.Ancestors().OfType<TypeDeclarationSyntax>().FirstOrDefault();
        if (enclosingType is null) return null;

        var dependencies = new List<string>();

        // Find constructors of the enclosing type
        var constructors = enclosingType.Members.OfType<ConstructorDeclarationSyntax>();
        foreach (var ctor in constructors)
        {
            foreach (var param in ctor.ParameterList.Parameters)
            {
                if (param.Type is null) continue;
                var typeName = param.Type.ToString();

                // Skip primitive types and common .NET types
                if (IsPrimitiveOrCommonType(typeName)) continue;

                // Strip generic wrapper (e.g., IOptions<MyConfig> -> IOptions<MyConfig>)
                if (!dependencies.Contains(typeName))
                {
                    dependencies.Add(typeName);
                }
            }
        }

        // Also check for primary constructor parameters (C# 12 records/classes)
        if (enclosingType.ParameterList is not null)
        {
            foreach (var param in enclosingType.ParameterList.Parameters)
            {
                if (param.Type is null) continue;
                var typeName = param.Type.ToString();
                if (IsPrimitiveOrCommonType(typeName)) continue;
                if (!dependencies.Contains(typeName))
                {
                    dependencies.Add(typeName);
                }
            }
        }

        return dependencies.Count > 0 ? dependencies : null;
    }

    /// <summary>
    /// Channel 13: Validation annotations -- counts data annotation attributes
    /// on the enclosing class's properties ([Required], [Range], [StringLength], etc.).
    /// </summary>
    // [DocDeterministic]
    private static int ExtractValidationAnnotations(MethodDeclarationSyntax method)
    {
        // Walk up to find the enclosing class
        var enclosingType = method.Ancestors().OfType<TypeDeclarationSyntax>().FirstOrDefault();
        if (enclosingType is null) return 0;

        int count = 0;

        // Check attributes on properties in the enclosing type
        foreach (var property in enclosingType.Members.OfType<PropertyDeclarationSyntax>())
        {
            foreach (var attrList in property.AttributeLists)
            {
                foreach (var attr in attrList.Attributes)
                {
                    var attrName = GetAttributeName(attr);
                    if (ValidationAttributeNames.Contains(attrName))
                    {
                        count++;
                    }
                }
            }
        }

        // Also check attributes on method parameters
        foreach (var param in method.ParameterList.Parameters)
        {
            foreach (var attrList in param.AttributeLists)
            {
                foreach (var attr in attrList.Attributes)
                {
                    var attrName = GetAttributeName(attr);
                    if (ValidationAttributeNames.Contains(attrName))
                    {
                        count++;
                    }
                }
            }
        }

        return count;
    }

    // ==================== Helper Methods ====================

    /// <summary>
    /// Checks whether a statement is a throw-only block (either a direct throw or
    /// a block containing a single throw statement).
    /// </summary>
    // [DocDeterministic]
    private static bool IsThrowOnlyBlock(StatementSyntax statement)
    {
        if (statement is ThrowStatementSyntax) return true;
        if (statement is BlockSyntax block && block.Statements.Count == 1 &&
            block.Statements[0] is ThrowStatementSyntax)
        {
            return true;
        }

        // Also handle return-after-throw pattern: { throw ...; } or { someGuardMethod(); return; }
        return false;
    }

    /// <summary>Checks if a string is UPPER_SNAKE_CASE (e.g., MAX_RETRIES).</summary>
    // [DocDeterministic]
    private static bool IsUpperSnakeCase(string s)
    {
        foreach (var c in s)
        {
            if (!char.IsUpper(c) && c != '_' && !char.IsDigit(c)) return false;
        }
        return true;
    }

    /// <summary>
    /// Determines if a receiver expression looks like a logger variable.
    /// Matches: _logger, _log, logger, log, Log, Logger, _Logger, this._logger, etc.
    /// </summary>
    // [DocDeterministic]
    private static bool IsLoggerReceiver(string receiverText)
    {
        // Direct logger-like identifiers
        if (Regex.IsMatch(receiverText, @"^(this\.)?(_{0,1}[Ll]og(ger)?)$")) return true;

        // Static Serilog Log class
        if (receiverText == "Log") return true;

        // ILogger typed field (if the receiver ends with logger/Logger)
        if (receiverText.EndsWith("Logger", StringComparison.OrdinalIgnoreCase) ||
            receiverText.EndsWith("Log", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }

    /// <summary>
    /// Extracts the simple attribute name (without "Attribute" suffix and namespace).
    /// e.g., "Required" from "[Required]", "System.ComponentModel.DataAnnotations.RequiredAttribute".
    /// </summary>
    // [DocDeterministic]
    private static string GetAttributeName(AttributeSyntax attr)
    {
        var name = attr.Name.ToString();

        // Remove namespace prefix (take last segment after '.')
        var dotIndex = name.LastIndexOf('.');
        if (dotIndex >= 0) name = name.Substring(dotIndex + 1);

        // Remove "Attribute" suffix if present
        if (name.EndsWith("Attribute")) name = name.Substring(0, name.Length - "Attribute".Length);

        return name;
    }

    /// <summary>
    /// Checks if a type name is a primitive or common .NET type that should NOT
    /// be counted as an injected dependency.
    /// </summary>
    // [DocDeterministic]
    private static bool IsPrimitiveOrCommonType(string typeName)
    {
        return typeName is "string" or "int" or "long" or "bool" or "double" or "float" or "decimal"
            or "byte" or "char" or "short" or "uint" or "ulong" or "ushort" or "sbyte" or "nint"
            or "nuint" or "object" or "dynamic" or "void"
            or "String" or "Int32" or "Int64" or "Boolean" or "Double" or "Single" or "Decimal"
            or "Byte" or "Char" or "Int16" or "UInt32" or "UInt64" or "UInt16" or "SByte"
            or "Object" or "Guid" or "DateTime" or "DateTimeOffset" or "TimeSpan" or "DateOnly"
            or "TimeOnly" or "CancellationToken";
    }
}
