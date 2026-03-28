using System.Linq;
using System.Text.RegularExpressions;

namespace DocSpec.Analyzer.Dsti;

// [DocModule(Id = "docspec-csharp-naming-analyzer", Name = "DSTI Naming Analyzer")]
// [DocDescription("Parses method names to extract semantic verbs and objects using PascalCase conventions.
//   Supports 40+ verbs across 20+ intent categories. C# equivalent of Java's NamingAnalyzer.")]
// [DocSince("3.0.0")]

/// <summary>
/// Parses method names to extract semantic verbs and objects using PascalCase/camelCase conventions.
/// Used by the DSTI (Deep Structural and Textual Intent) system to infer
/// developer intent from naming patterns. The C# equivalent of Java's <c>NamingAnalyzer</c>.
/// </summary>
// [DocDeterministic]
// [DocIntentional("Parse PascalCase method names into verb-object-intent triples for DSTI Channel 1")]
public class NamingAnalyzer
{
    /// <summary>Result of a name analysis containing verb, object, and inferred intent category.</summary>
    public record NameSemantics(string Verb, string Object, string Intent);

    /// <summary>Known verb prefixes, ordered longest-first where needed to avoid prefix collisions.</summary>
    private static readonly string[] Verbs =
    {
        "Get", "Set", "Is", "Has", "Find", "Create", "Delete", "Remove",
        "Update", "Save", "Add", "Validate", "Check", "Compute", "Calculate",
        "Process", "Handle", "Convert", "Transform", "Parse", "Format",
        "Build", "Generate", "Initialize", "Init", "Load", "Fetch",
        "Send", "Receive", "Publish", "Subscribe", "Notify", "Dispatch",
        "Sync", "Migrate", "Schedule", "Retry", "Batch",
        "Aggregate", "Merge", "Split", "Emit", "Enrich", "Filter",
        // C#-specific patterns
        "Try", "Begin", "End", "On", "Invoke", "Execute", "Run",
        "Map", "Resolve", "Register", "Configure", "Setup"
    };

    /// <summary>
    /// Analyzes a method name and extracts its semantic components.
    /// </summary>
    /// <param name="methodName">The simple name of the method (PascalCase in C#).</param>
    /// <returns>A <see cref="NameSemantics"/> record with verb, object, and intent category.</returns>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    // [DocPreserves("verb-object separation from PascalCase")]
    public NameSemantics Analyze(string methodName)
    {
        // Try each known verb prefix
        foreach (var verb in Verbs)
        {
            if (!methodName.StartsWith(verb) || methodName.Length <= verb.Length) continue;

            char nextChar = methodName[verb.Length];
            if (char.IsUpper(nextChar) || (verb.Length == methodName.Length))
            {
                string obj = methodName.Substring(verb.Length);
                string intent = CategorizeIntent(verb.ToLowerInvariant());
                return new NameSemantics(verb.ToLowerInvariant(), SplitCamelCase(obj), intent);
            }
        }

        // Fallback: the entire name is the verb
        return new NameSemantics(methodName.ToLowerInvariant(), "", "unknown");
    }

    // [DocDeterministic]
    private static string CategorizeIntent(string verb)
    {
        return verb switch
        {
            "get" or "find" or "fetch" or "load" or "is" or "has" => "query",
            "set" or "update" or "save" or "add" => "mutation",
            "create" or "build" or "generate" or "initialize" or "init" => "creation",
            "delete" or "remove" => "deletion",
            "validate" or "check" => "validation",
            "compute" or "calculate" or "process" => "computation",
            "convert" or "parse" or "format" => "transformation",
            "handle" or "dispatch" or "on" => "handler",
            "send" or "emit" or "publish" => "emission",
            "receive" or "subscribe" => "consumption",
            "sync" => "synchronize",
            "migrate" => "migrate",
            "schedule" => "schedule",
            "retry" => "retry",
            "batch" => "batch-process",
            "aggregate" => "aggregate",
            "merge" => "merge",
            "split" => "split",
            "notify" => "notify",
            "transform" => "transform",
            "enrich" => "enrich",
            "filter" => "filter",
            "try" => "attempt",
            "begin" or "end" => "lifecycle",
            "invoke" or "execute" or "run" => "execution",
            "map" => "mapping",
            "resolve" => "resolution",
            "register" or "configure" or "setup" => "configuration",
            _ => "unknown"
        };
    }

    // [DocDeterministic]
    private static string SplitCamelCase(string s)
    {
        // Insert spaces before uppercase letters: "UserAccount" -> "user account"
        return Regex.Replace(s, "([a-z])([A-Z])", "$1 $2").ToLowerInvariant().Trim();
    }
}
