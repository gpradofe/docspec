package io.docspec.processor.dsti;

import io.docspec.annotation.DocDeterministic;
import io.docspec.annotation.DocMethod;

/**
 * Parses method names to extract semantic verbs and objects using camelCase conventions.
 * Used by the DSTI (Documentation Semantic & Temporal Intelligence) system to infer
 * developer intent from naming patterns.
 */
public class NamingAnalyzer {

    public record NameSemantics(String verb, String object, String intent) {}

    /** Known verb prefixes, ordered longest-first where needed to avoid prefix collisions. */
    private static final String[] VERBS = {
            "get", "set", "is", "has", "find", "create", "delete", "remove",
            "update", "save", "add", "validate", "check", "compute", "calculate",
            "process", "handle", "convert", "transform", "parse", "format",
            "build", "generate", "initialize", "init", "load", "fetch",
            "send", "receive", "publish", "subscribe", "notify", "dispatch",
            "sync", "migrate", "schedule", "retry", "batch",
            "aggregate", "merge", "split", "emit", "enrich", "filter"
    };

    /**
     * Analyzes a method name and extracts its semantic components.
     *
     * @param methodName the simple name of the method
     * @return a {@link NameSemantics} record with verb, object, and intent category
     */
    @DocDeterministic
    @DocMethod(since = "3.0.0")
    public NameSemantics analyze(String methodName) {
        // Extract verb prefix
        for (String verb : VERBS) {
            if (methodName.startsWith(verb) && methodName.length() > verb.length()) {
                char nextChar = methodName.charAt(verb.length());
                if (Character.isUpperCase(nextChar)) {
                    String object = methodName.substring(verb.length());
                    String intent = categorizeIntent(verb);
                    return new NameSemantics(verb, splitCamelCase(object), intent);
                }
            }
        }
        // Fallback: the entire name is the verb
        return new NameSemantics(methodName, "", "unknown");
    }

    private String categorizeIntent(String verb) {
        return switch (verb) {
            case "get", "find", "fetch", "load", "is", "has" -> "query";
            case "set", "update", "save", "add" -> "mutation";
            case "create", "build", "generate", "initialize", "init" -> "creation";
            case "delete", "remove" -> "deletion";
            case "validate", "check" -> "validation";
            case "compute", "calculate", "process" -> "computation";
            case "convert", "parse", "format" -> "transformation";
            case "handle", "dispatch" -> "handler";
            case "send" -> "emission";
            case "receive" -> "consumption";
            case "sync" -> "synchronize";
            case "migrate" -> "migrate";
            case "schedule" -> "schedule";
            case "retry" -> "retry";
            case "batch" -> "batch-process";
            case "aggregate" -> "aggregate";
            case "merge" -> "merge";
            case "split" -> "split";
            case "notify" -> "notify";
            case "emit" -> "emit";
            case "publish" -> "publish";
            case "subscribe" -> "subscribe";
            case "transform" -> "transform";
            case "enrich" -> "enrich";
            case "filter" -> "filter";
            default -> "unknown";
        };
    }

    private String splitCamelCase(String s) {
        // Insert spaces before uppercase letters
        return s.replaceAll("([a-z])([A-Z])", "$1 $2").toLowerCase().trim();
    }
}
