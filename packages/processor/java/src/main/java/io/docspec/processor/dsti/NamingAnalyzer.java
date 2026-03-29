package io.docspec.processor.dsti;

import io.docspec.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Parses method names to extract semantic verbs and objects using camelCase conventions.
 * Used by the DSTI (Documentation Semantic & Temporal Intelligence) system to infer
 * developer intent from naming patterns.
 *
 * <p>Supports 150+ verb prefixes mapped to 10 intent categories. The verb dictionary
 * is ordered longest-first to avoid prefix collisions (e.g., "initialize" before "init").</p>
 */
@DocInvariant(on = "NamingAnalyzer", rules = {
    "VERB_INTENT_MAP SIZE > 0",
    "analyze() never returns null"
})
public class NamingAnalyzer {

    public record NameSemantics(String verb, String object, String intent) {}

    /**
     * Verb-to-intent mapping. Ordered longest-first within each group to avoid
     * prefix collisions (e.g., "unregister" before "un", "initialize" before "init").
     * Linked map preserves insertion order for deterministic iteration.
     */
    private static final Map<String, String> VERB_INTENT_MAP = new LinkedHashMap<>();

    static {
        // === QUERY / PREDICATE verbs ===
        addVerb("lookup", "query");
        addVerb("search", "query");
        addVerb("exists", "predicate");
        addVerb("contains", "predicate");
        addVerb("matches", "predicate");
        addVerb("should", "predicate");
        addVerb("resolve", "query");
        addVerb("select", "query");
        addVerb("detect", "query");
        addVerb("discover", "query");
        addVerb("fetch", "query");
        addVerb("find", "query");
        addVerb("load", "query");
        addVerb("query", "query");
        addVerb("list", "query");
        addVerb("count", "query");
        addVerb("read", "query");
        addVerb("scan", "query");
        addVerb("check", "validation");
        addVerb("get", "query");
        addVerb("has", "predicate");
        addVerb("can", "predicate");
        addVerb("is", "predicate");

        // === MUTATION verbs ===
        addVerb("unregister", "mutation");
        addVerb("dequeue", "mutation");
        addVerb("enqueue", "mutation");
        addVerb("register", "mutation");
        addVerb("disable", "mutation");
        addVerb("enable", "mutation");
        addVerb("toggle", "mutation");
        addVerb("remove", "deletion");
        addVerb("delete", "deletion");
        addVerb("update", "mutation");
        addVerb("insert", "mutation");
        addVerb("clear", "mutation");
        addVerb("reset", "mutation");
        addVerb("store", "mutation");
        addVerb("write", "mutation");
        addVerb("push", "mutation");
        addVerb("pop", "mutation");
        addVerb("save", "mutation");
        addVerb("set", "mutation");
        addVerb("add", "mutation");
        addVerb("put", "mutation");

        // === CREATION verbs ===
        addVerb("instantiate", "creation");
        addVerb("initialize", "creation");
        addVerb("construct", "creation");
        addVerb("generate", "creation");
        addVerb("allocate", "creation");
        addVerb("produce", "creation");
        addVerb("factory", "creation");
        addVerb("create", "creation");
        addVerb("build", "creation");
        addVerb("setup", "creation");
        addVerb("spawn", "creation");
        addVerb("make", "creation");
        addVerb("init", "creation");
        addVerb("from", "creation");
        addVerb("new", "creation");
        addVerb("of", "creation");

        // === TRANSFORMATION verbs ===
        addVerb("deserialize", "transformation");
        addVerb("serialize", "transformation");
        addVerb("normalize", "transformation");
        addVerb("transform", "transformation");
        addVerb("translate", "transformation");
        addVerb("calculate", "transformation");
        addVerb("evaluate", "transformation");
        addVerb("flatten", "transformation");
        addVerb("extract", "transformation");
        addVerb("process", "transformation");
        addVerb("convert", "transformation");
        addVerb("compile", "transformation");
        addVerb("compute", "transformation");
        addVerb("encode", "transformation");
        addVerb("decode", "transformation");
        addVerb("derive", "transformation");
        addVerb("reduce", "transformation");
        addVerb("filter", "transformation");
        addVerb("format", "transformation");
        addVerb("infer", "transformation");
        addVerb("merge", "transformation");
        addVerb("split", "transformation");
        addVerb("parse", "transformation");
        addVerb("apply", "transformation");
        addVerb("sort", "transformation");
        addVerb("map", "transformation");

        // === VALIDATION verbs ===
        addVerb("validate", "validation");
        addVerb("inspect", "validation");
        addVerb("enforce", "validation");
        addVerb("confirm", "validation");
        addVerb("require", "validation");
        addVerb("verify", "validation");
        addVerb("ensure", "validation");
        addVerb("assert", "validation");
        addVerb("audit", "validation");
        addVerb("test", "validation");

        // === LIFECYCLE verbs ===
        addVerb("disconnect", "lifecycle");
        addVerb("shutdown", "lifecycle");
        addVerb("complete", "lifecycle");
        addVerb("connect", "lifecycle");
        addVerb("destroy", "lifecycle");
        addVerb("dispose", "lifecycle");
        addVerb("cleanup", "lifecycle");
        addVerb("release", "lifecycle");
        addVerb("acquire", "lifecycle");
        addVerb("finish", "lifecycle");
        addVerb("unlock", "lifecycle");
        addVerb("close", "lifecycle");
        addVerb("start", "lifecycle");
        addVerb("begin", "lifecycle");
        addVerb("stop", "lifecycle");
        addVerb("open", "lifecycle");
        addVerb("lock", "lifecycle");
        addVerb("end", "lifecycle");

        // === EMISSION / EVENT verbs ===
        addVerb("subscribe", "event");
        addVerb("unsubscribe", "event");
        addVerb("dispatch", "event");
        addVerb("publish", "event");
        addVerb("trigger", "event");
        addVerb("notify", "event");
        addVerb("emit", "event");
        addVerb("fire", "event");
        addVerb("send", "event");
        addVerb("on", "event");

        // === CONSUMPTION verbs ===
        addVerb("receive", "consumption");
        addVerb("consume", "consumption");
        addVerb("accept", "consumption");
        addVerb("handle", "handler");

        // === EXECUTION / INVOCATION verbs ===
        addVerb("perform", "execution");
        addVerb("execute", "execution");
        addVerb("invoke", "execution");
        addVerb("run", "execution");
        addVerb("do", "execution");
        addVerb("call", "execution");

        // === SCHEDULING / ORCHESTRATION verbs ===
        addVerb("schedule", "orchestration");
        addVerb("aggregate", "orchestration");
        addVerb("migrate", "orchestration");
        addVerb("enrich", "orchestration");
        addVerb("retry", "orchestration");
        addVerb("batch", "orchestration");
        addVerb("sync", "orchestration");

        // === RENDERING / DISPLAY verbs ===
        addVerb("display", "rendering");
        addVerb("render", "rendering");
        addVerb("print", "rendering");
        addVerb("show", "rendering");
        addVerb("hide", "rendering");
        addVerb("log", "rendering");

        // === CONVERSION helpers (prefix-style: toXxx, withXxx) ===
        addVerb("with", "transformation");
        addVerb("to", "transformation");

        // === THROW / RAISE ===
        addVerb("throw", "error-signal");
        addVerb("raise", "error-signal");
    }

    private static void addVerb(String verb, String intent) {
        VERB_INTENT_MAP.put(verb, intent);
    }

    /**
     * Analyzes a method name and extracts its semantic components.
     *
     * <p>The algorithm tries verb-prefix matching first. For each known verb, it checks
     * whether the method name starts with the verb followed by an uppercase letter
     * (standard camelCase, e.g., "getUser") OR matches the verb exactly (single-word
     * methods like "execute", "run", "close").</p>
     *
     * <p>For two-letter verbs ("is", "of", "on", "do", "to"), we also accept the
     * pattern verb + lowercase (e.g., "isEmpty" would not match normally because 'E'
     * is uppercase, but "is" + "Empty" does match). Actually "isEmpty" does match
     * because 'E' IS uppercase. The special case is for verbs where the remaining
     * portion starts lowercase, like "isempty" — but that's non-standard Java.</p>
     *
     * @param methodName the simple name of the method
     * @return a {@link NameSemantics} record with verb, object, and intent category
     */
    @DocDeterministic
    @DocMethod(since = "3.0.0")
    @DocExample(title = "Extract verb and intent from method name",
        language = "java",
        code = "NamingAnalyzer analyzer = new NamingAnalyzer();\nNameSemantics result = analyzer.analyze(\"findUserByEmail\");\n// result.verb() == \"find\", result.object() == \"user by email\", result.intent() == \"query\"")
    public NameSemantics analyze(String methodName) {
        if (methodName == null || methodName.isEmpty()) {
            return new NameSemantics("", "", "unknown");
        }

        // Try verb-prefix matching (longest verbs first due to LinkedHashMap insertion order)
        for (Map.Entry<String, String> entry : VERB_INTENT_MAP.entrySet()) {
            String verb = entry.getKey();
            String intent = entry.getValue();

            if (!methodName.startsWith(verb)) {
                continue;
            }

            // Exact match: method name IS the verb (e.g., "execute", "run", "close")
            if (methodName.length() == verb.length()) {
                return new NameSemantics(verb, "", intent);
            }

            // Standard camelCase: verb + UpperCase rest (e.g., "getUser", "isAvailable")
            char nextChar = methodName.charAt(verb.length());
            if (Character.isUpperCase(nextChar)) {
                String object = methodName.substring(verb.length());
                return new NameSemantics(verb, splitCamelCase(object), intent);
            }

            // For very short verbs (2 chars or less), don't match partial words
            // e.g., "domain" should not match verb "do"
            // But for longer verbs, also don't match partial words
            // This is the correct behavior: only match on camelCase boundary or exact match
        }

        // Fallback: try to extract verb via camelCase split
        String firstWord = extractFirstCamelCaseWord(methodName);
        if (firstWord != null && !firstWord.equals(methodName)) {
            String intent = VERB_INTENT_MAP.get(firstWord);
            if (intent != null) {
                String object = methodName.substring(firstWord.length());
                return new NameSemantics(firstWord, splitCamelCase(object), intent);
            }
        }

        // Last resort: the entire method name, with "action" intent (not "unknown")
        // Common Java methods like "toString", "hashCode", "equals", "clone", "main"
        // get a generic but non-unknown intent
        String fallbackIntent = inferFallbackIntent(methodName);
        return new NameSemantics(methodName, "", fallbackIntent);
    }

    /**
     * Extracts the first lowercase word from a camelCase identifier.
     * E.g., "extractMethodIntent" returns "extract".
     *
     * @param name the camelCase identifier
     * @return the first word, or null if the name starts with uppercase
     */
    private String extractFirstCamelCaseWord(String name) {
        if (name.isEmpty() || Character.isUpperCase(name.charAt(0))) {
            return null;
        }
        for (int i = 1; i < name.length(); i++) {
            if (Character.isUpperCase(name.charAt(i))) {
                return name.substring(0, i);
            }
        }
        return null; // single word, no camelCase split possible
    }

    /**
     * Infers a fallback intent for method names that don't match any known verb.
     * Uses common Java conventions to avoid returning "unknown".
     */
    private String inferFallbackIntent(String methodName) {
        // Standard Object methods
        if ("toString".equals(methodName) || "toArray".equals(methodName)) return "transformation";
        if ("hashCode".equals(methodName)) return "transformation";
        if ("equals".equals(methodName) || "compareTo".equals(methodName) ||
            "compare".equals(methodName)) return "predicate";
        if ("clone".equals(methodName) || "copy".equals(methodName)) return "creation";
        if ("iterator".equals(methodName) || "spliterator".equals(methodName)) return "query";
        if ("main".equals(methodName) || "configure".equals(methodName)) return "lifecycle";
        if ("accept".equals(methodName) || "apply".equals(methodName)) return "transformation";
        if ("test".equals(methodName)) return "validation";
        if ("supply".equals(methodName) || "get".equals(methodName)) return "query";
        if ("run".equals(methodName)) return "execution";
        if ("call".equals(methodName)) return "execution";
        if ("close".equals(methodName)) return "lifecycle";
        if ("flush".equals(methodName)) return "lifecycle";
        if ("clear".equals(methodName)) return "mutation";
        if ("size".equals(methodName) || "length".equals(methodName) ||
            "isEmpty".equals(methodName)) return "query";

        // If the name itself is a known verb (catch-all for single-word methods)
        String intent = VERB_INTENT_MAP.get(methodName);
        if (intent != null) return intent;

        // Truly unknown - but still give a generic "action" rather than "unknown"
        // so the ISD score is not penalized for unconventional naming
        return "action";
    }

    private String splitCamelCase(String s) {
        // Insert spaces before uppercase letters
        return s.replaceAll("([a-z])([A-Z])", "$1 $2").toLowerCase().trim();
    }
}
