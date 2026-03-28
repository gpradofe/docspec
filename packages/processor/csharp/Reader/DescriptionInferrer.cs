// @docspec:module {
//   id: "docspec-csharp-description-inferrer",
//   name: "Description Inferrer",
//   description: "Infers human-readable descriptions from C# naming conventions when no XML doc comment or [DocMethod] attribute is present.",
//   since: "3.0.0"
// }

using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace DocSpec.Analyzer.Reader;

/// <summary>
/// Infers human-readable descriptions from C# naming conventions when
/// no XML doc comment or <c>[DocMethod]</c> attribute is present.
/// The C# equivalent of Java's <c>DescriptionInferrer</c>.
/// </summary>
// [DocDeterministic]
// [DocIntentional("Generate meaningful descriptions from PascalCase naming conventions as a fallback for undocumented code")]
public class DescriptionInferrer
{
    private static readonly Regex CamelCasePattern =
        new(@"(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])", RegexOptions.Compiled);

    /// <summary>
    /// Infers a description for a method from its name and parameter names.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public string? InferMethodDescription(string methodName, List<string>? paramNames = null,
                                          List<string>? paramTypes = null)
    {
        var words = SplitCamelCase(methodName);
        if (words.Length == 0) return null;

        string verb = words[0].ToLowerInvariant();
        string rest = JoinWords(words, 1);
        paramNames ??= new List<string>();
        paramTypes ??= new List<string>();

        return verb switch
        {
            "get" or "fetch" or "load" or "retrieve" or "read"
                => FormatWithArticle("Gets", rest, paramNames, paramTypes),
            "find"
                => FormatFind(rest, paramNames, paramTypes),
            "set"
                => "Sets the " + rest.ToLowerInvariant() + ".",
            "is" or "has" or "can" or "should" or "will"
                => "Returns whether " + AddContext(rest.ToLowerInvariant(), paramNames) + ".",
            "create" or "build" or "make" or "construct"
                => FormatWithArticle("Creates", rest, paramNames, paramTypes),
            "delete" or "remove" or "destroy"
                => FormatDelete(rest, paramNames),
            "update" or "modify"
                => FormatWithArticle("Updates", rest, paramNames, paramTypes),
            "save" or "persist" or "store"
                => FormatWithArticle("Saves", rest, paramNames, paramTypes),
            "send" or "emit" or "publish" or "dispatch"
                => FormatWithArticle("Sends", rest, paramNames, paramTypes),
            "validate" or "verify" or "check"
                => FormatWithArticle("Validates", rest, paramNames, paramTypes),
            "convert" or "transform" or "map"
                => FormatWithArticle("Converts", rest, paramNames, paramTypes),
            "parse"
                => FormatWithArticle("Parses", rest, paramNames, paramTypes),
            "generate"
                => FormatWithArticle("Generates", rest, paramNames, paramTypes),
            "process" or "handle"
                => FormatWithArticle("Processes", rest, paramNames, paramTypes),
            "init" or "initialize" or "setup"
                => FormatWithArticle("Initializes", rest, paramNames, paramTypes),
            "close" or "shutdown" or "dispose" or "cleanup"
                => "Closes " + (rest.Length == 0 ? "this resource" : "the " + rest.ToLowerInvariant()) + ".",
            "list"
                => "Lists " + (rest.Length == 0 ? "all items" : "all " + rest.ToLowerInvariant()) + ".",
            "count"
                => "Counts " + (rest.Length == 0 ? "the items" : "the " + rest.ToLowerInvariant()) + ".",
            "add" or "register"
                => FormatWithArticle("Adds", rest, paramNames, paramTypes),
            "enable" or "activate"
                => "Enables " + (rest.Length == 0 ? "this feature" : rest.ToLowerInvariant()) + ".",
            "disable" or "deactivate"
                => "Disables " + (rest.Length == 0 ? "this feature" : rest.ToLowerInvariant()) + ".",
            "try"
                => "Attempts to " + (rest.Length == 0 ? "perform the operation" : SplitAndLower(rest)) + ".",
            "on"
                => "Handles the " + (rest.Length == 0 ? "event" : SplitAndLower(rest)) + " event.",
            _ => Capitalize(verb) + (rest.Length == 0 ? "" : " " + rest.ToLowerInvariant()) + "."
        };
    }

    /// <summary>
    /// Infers a description for a class from its name using common suffix conventions.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public string InferClassDescription(string className)
    {
        if (className.EndsWith("Repository"))
            return "Repository for " + SplitAndLower(StripSuffix(className, "Repository")) + " entities.";
        if (className.EndsWith("Service"))
            return "Service for " + SplitAndLower(StripSuffix(className, "Service")) + " operations.";
        if (className.EndsWith("Controller"))
            return "Controller for " + SplitAndLower(StripSuffix(className, "Controller")) + " endpoints.";
        if (className.EndsWith("Factory"))
            return "Factory for creating " + SplitAndLower(StripSuffix(className, "Factory")) + " instances.";
        if (className.EndsWith("Builder"))
            return "Builder for " + SplitAndLower(StripSuffix(className, "Builder")) + " objects.";
        if (className.EndsWith("Handler"))
            return "Handler for " + SplitAndLower(StripSuffix(className, "Handler")) + " events.";
        if (className.EndsWith("Listener"))
            return "Listener for " + SplitAndLower(StripSuffix(className, "Listener")) + " events.";
        if (className.EndsWith("Mapper") || className.EndsWith("Profile"))
            return "Mapper for " + SplitAndLower(StripSuffix(className, className.EndsWith("Mapper") ? "Mapper" : "Profile")) + " objects.";
        if (className.EndsWith("Configuration") || className.EndsWith("Config") || className.EndsWith("Options"))
            return "Configuration for the application.";
        if (className.EndsWith("Exception"))
            return "Exception thrown when " + SplitAndLower(StripSuffix(className, "Exception")) + " occurs.";
        if (className.EndsWith("Entity"))
            return "Persistent entity representing " + AOrAn(SplitAndLower(StripSuffix(className, "Entity"))) + ".";
        if (className.EndsWith("Dto") || className.EndsWith("DTO"))
        {
            string stripped = Regex.Replace(className, "(Dto|DTO)$", "");
            return "Data transfer object for " + SplitAndLower(stripped) + ".";
        }
        if (className.EndsWith("Middleware"))
            return "Middleware for " + SplitAndLower(StripSuffix(className, "Middleware")) + " processing.";
        if (className.EndsWith("Filter"))
            return "Filter for " + SplitAndLower(StripSuffix(className, "Filter")) + " operations.";
        if (className.EndsWith("Extension") || className.EndsWith("Extensions"))
        {
            string stripped = Regex.Replace(className, "Extensions?$", "");
            return "Extension methods for " + SplitAndLower(stripped) + ".";
        }
        if (className.EndsWith("Hub"))
            return "SignalR hub for " + SplitAndLower(StripSuffix(className, "Hub")) + " communication.";

        return Capitalize(SplitAndLower(className)) + ".";
    }

    /// <summary>
    /// Infers a description for a field or property from its name.
    /// </summary>
    // [DocMethod(Since = "3.0.0")]
    // [DocDeterministic]
    public string InferFieldDescription(string fieldName)
    {
        return "The " + SplitAndLower(fieldName) + ".";
    }

    // --- Private helpers ---

    private string FormatWithArticle(string verb, string rest, List<string> paramNames, List<string> paramTypes)
    {
        if (rest.Length == 0) return verb + " the resource.";
        string obj = AOrAn(rest.ToLowerInvariant());
        string context = ParamContext(paramNames, paramTypes);
        return context.Length > 0
            ? verb + " " + obj + " " + context + "."
            : verb + " " + obj + ".";
    }

    private string FormatFind(string rest, List<string> paramNames, List<string> paramTypes)
    {
        string lower = rest.ToLowerInvariant();
        if (lower.StartsWith("by"))
        {
            string byField = Regex.Replace(rest, "^(?i)by\\s*", "");
            return "Finds records by " + SplitAndLower(byField) + ".";
        }
        if (lower.StartsWith("all"))
        {
            string what = Regex.Replace(rest, "^(?i)all\\s*", "");
            return "Finds all " + (what.Length == 0 ? "records" : SplitAndLower(what)) + ".";
        }
        return FormatWithArticle("Finds", rest, paramNames, paramTypes);
    }

    private string FormatDelete(string rest, List<string> paramNames)
    {
        if (rest.Length == 0 && paramNames.Count > 0)
            return "Deletes the entity with the given " + SplitAndLower(paramNames[0]) + ".";
        return "Deletes the " + (rest.Length == 0 ? "entity" : rest.ToLowerInvariant()) + ".";
    }

    private string AddContext(string rest, List<string> paramNames)
    {
        if (rest.Length == 0 && paramNames.Count > 0)
            return "the " + SplitAndLower(paramNames[0]) + " condition is met";
        return rest.Length == 0 ? "the condition is met" : rest;
    }

    private string ParamContext(List<string> paramNames, List<string> paramTypes)
    {
        if (paramNames.Count != 1) return "";
        return "from the given " + SplitAndLower(paramNames[0]);
    }

    private static string[] SplitCamelCase(string name)
        => CamelCasePattern.Split(name);

    private static string JoinWords(string[] words, int startIndex)
    {
        if (startIndex >= words.Length) return "";
        return string.Join(" ", words.Skip(startIndex));
    }

    private static string SplitAndLower(string camelCase)
    {
        var words = SplitCamelCase(camelCase);
        var parts = new List<string>();
        foreach (var word in words)
        {
            // Keep short acronyms uppercase (ID, URL, API)
            if (word.Length <= 3 && word == word.ToUpperInvariant())
                parts.Add(word);
            else
                parts.Add(word.ToLowerInvariant());
        }
        return string.Join(" ", parts);
    }

    private static string Capitalize(string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        return char.ToUpperInvariant(s[0]) + s.Substring(1);
    }

    private static string AOrAn(string noun)
    {
        if (noun.Length == 0) return noun;
        char first = char.ToLowerInvariant(noun[0]);
        return (first == 'a' || first == 'e' || first == 'i' || first == 'o' || first == 'u')
            ? "an " + noun
            : "a " + noun;
    }

    private static string StripSuffix(string name, string suffix)
        => name.Substring(0, name.Length - suffix.Length);
}
