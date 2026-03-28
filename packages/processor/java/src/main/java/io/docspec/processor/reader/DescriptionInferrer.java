package io.docspec.processor.reader;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@DocBoundary("documentation metadata reader")
public class DescriptionInferrer {

    private static final Pattern CAMEL_CASE = Pattern.compile("(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])");

    @DocMethod(since = "3.0.0")
    public String inferMethodDescription(String methodName, List<String> paramNames, List<String> paramTypes) {
        String[] words = splitCamelCase(methodName);
        if (words.length == 0) return null;

        String verb = words[0].toLowerCase();
        String rest = joinWords(words, 1);

        return switch (verb) {
            case "get", "fetch", "load", "retrieve", "read" ->
                    formatWithArticle("Gets", rest, paramNames, paramTypes);
            case "find" ->
                    formatFind(rest, paramNames, paramTypes);
            case "set" ->
                    "Sets the " + rest.toLowerCase() + ".";
            case "is", "has", "can", "should", "will" ->
                    "Returns whether " + addContext(rest.toLowerCase(), paramNames, paramTypes) + ".";
            case "create", "build", "make", "construct" ->
                    formatWithArticle("Creates", rest, paramNames, paramTypes);
            case "delete", "remove", "destroy" ->
                    formatDelete(rest, paramNames, paramTypes);
            case "update", "modify" ->
                    formatWithArticle("Updates", rest, paramNames, paramTypes);
            case "save", "persist", "store" ->
                    formatWithArticle("Saves", rest, paramNames, paramTypes);
            case "send", "emit", "publish", "dispatch" ->
                    formatWithArticle("Sends", rest, paramNames, paramTypes);
            case "validate", "verify", "check" ->
                    formatWithArticle("Validates", rest, paramNames, paramTypes);
            case "convert", "transform", "map" ->
                    formatWithArticle("Converts", rest, paramNames, paramTypes);
            case "parse" ->
                    formatWithArticle("Parses", rest, paramNames, paramTypes);
            case "generate" ->
                    formatWithArticle("Generates", rest, paramNames, paramTypes);
            case "process" ->
                    formatWithArticle("Processes", rest, paramNames, paramTypes);
            case "init", "initialize", "setup" ->
                    formatWithArticle("Initializes", rest, paramNames, paramTypes);
            case "close", "shutdown", "dispose", "cleanup" ->
                    "Closes " + (rest.isEmpty() ? "this resource" : "the " + rest.toLowerCase()) + ".";
            case "list" ->
                    "Lists " + (rest.isEmpty() ? "all items" : "all " + rest.toLowerCase()) + ".";
            case "count" ->
                    "Counts " + (rest.isEmpty() ? "the items" : "the " + rest.toLowerCase()) + ".";
            case "add" ->
                    formatWithArticle("Adds", rest, paramNames, paramTypes);
            case "register" ->
                    formatWithArticle("Registers", rest, paramNames, paramTypes);
            case "enable", "activate" ->
                    "Enables " + (rest.isEmpty() ? "this feature" : rest.toLowerCase()) + ".";
            case "disable", "deactivate" ->
                    "Disables " + (rest.isEmpty() ? "this feature" : rest.toLowerCase()) + ".";
            default -> {
                // Generic: capitalize verb + rest
                String sentence = capitalize(verb) + (rest.isEmpty() ? "" : " " + rest.toLowerCase());
                yield sentence + ".";
            }
        };
    }

    @DocMethod(since = "3.0.0")
    public String inferClassDescription(String className) {
        // Pattern: *Repository
        if (className.endsWith("Repository")) {
            String entity = className.substring(0, className.length() - "Repository".length());
            return "Repository for " + splitAndLower(entity) + " entities.";
        }
        // Pattern: *Service
        if (className.endsWith("Service")) {
            String domain = className.substring(0, className.length() - "Service".length());
            return "Service for " + splitAndLower(domain) + " operations.";
        }
        // Pattern: *Controller
        if (className.endsWith("Controller")) {
            String resource = className.substring(0, className.length() - "Controller".length());
            return "Controller for " + splitAndLower(resource) + " endpoints.";
        }
        // Pattern: *Factory
        if (className.endsWith("Factory")) {
            String product = className.substring(0, className.length() - "Factory".length());
            return "Factory for creating " + splitAndLower(product) + " instances.";
        }
        // Pattern: *Builder
        if (className.endsWith("Builder")) {
            String target = className.substring(0, className.length() - "Builder".length());
            return "Builder for " + splitAndLower(target) + " objects.";
        }
        // Pattern: *Handler
        if (className.endsWith("Handler")) {
            String event = className.substring(0, className.length() - "Handler".length());
            return "Handler for " + splitAndLower(event) + " events.";
        }
        // Pattern: *Listener
        if (className.endsWith("Listener")) {
            String event = className.substring(0, className.length() - "Listener".length());
            return "Listener for " + splitAndLower(event) + " events.";
        }
        // Pattern: *Mapper
        if (className.endsWith("Mapper")) {
            String entity = className.substring(0, className.length() - "Mapper".length());
            return "Mapper for " + splitAndLower(entity) + " objects.";
        }
        // Pattern: *Config / *Configuration
        if (className.endsWith("Configuration") || className.endsWith("Config")) {
            return "Configuration for the application.";
        }
        // Pattern: *Exception
        if (className.endsWith("Exception")) {
            String cause = className.substring(0, className.length() - "Exception".length());
            return "Exception thrown when " + splitAndLower(cause) + " occurs.";
        }
        // Pattern: *Entity
        if (className.endsWith("Entity")) {
            String name = className.substring(0, className.length() - "Entity".length());
            return "Persistent entity representing " + aOrAn(splitAndLower(name)) + ".";
        }
        // Pattern: *Dto / *DTO
        if (className.endsWith("Dto") || className.endsWith("DTO")) {
            String name = className.replaceAll("(Dto|DTO)$", "");
            return "Data transfer object for " + splitAndLower(name) + ".";
        }
        // Default: split camelCase
        return splitAndLower(className) + ".";
    }

    @DocMethod(since = "3.0.0")
    public String inferFieldDescription(String fieldName) {
        String humanized = splitAndLower(fieldName);
        return "The " + humanized + ".";
    }

    private String formatWithArticle(String verb, String rest, List<String> paramNames, List<String> paramTypes) {
        if (rest.isEmpty()) {
            return verb + " the resource.";
        }
        String object = aOrAn(rest.toLowerCase());
        String context = paramContext(paramNames, paramTypes);
        if (!context.isEmpty()) {
            return verb + " " + object + " " + context + ".";
        }
        return verb + " " + object + ".";
    }

    private String formatFind(String rest, List<String> paramNames, List<String> paramTypes) {
        if (rest.toLowerCase().startsWith("by ") || rest.toLowerCase().startsWith("by")) {
            // findByUserId -> "Finds records by user ID."
            String byField = rest.replaceFirst("(?i)^by\\s*", "");
            return "Finds records by " + splitAndLower(byField) + ".";
        }
        if (rest.toLowerCase().startsWith("all")) {
            String what = rest.replaceFirst("(?i)^all\\s*", "");
            return "Finds all " + (what.isEmpty() ? "records" : splitAndLower(what)) + ".";
        }
        return formatWithArticle("Finds", rest, paramNames, paramTypes);
    }

    private String formatDelete(String rest, List<String> paramNames, List<String> paramTypes) {
        if (rest.isEmpty() && !paramNames.isEmpty()) {
            return "Deletes the entity with the given " + splitAndLower(paramNames.get(0)) + ".";
        }
        return "Deletes the " + (rest.isEmpty() ? "entity" : rest.toLowerCase()) + ".";
    }

    private String addContext(String rest, List<String> paramNames, List<String> paramTypes) {
        if (rest.isEmpty() && !paramNames.isEmpty()) {
            return "the " + splitAndLower(paramNames.get(0)) + " condition is met";
        }
        if (rest.isEmpty()) {
            return "the condition is met";
        }
        return rest;
    }

    private String paramContext(List<String> paramNames, List<String> paramTypes) {
        if (paramNames == null || paramNames.isEmpty()) return "";
        if (paramNames.size() == 1) {
            String paramDesc = splitAndLower(paramNames.get(0));
            return "from the given " + paramDesc;
        }
        return "";
    }

    private String[] splitCamelCase(String name) {
        return CAMEL_CASE.split(name);
    }

    private String joinWords(String[] words, int startIndex) {
        if (startIndex >= words.length) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = startIndex; i < words.length; i++) {
            if (i > startIndex) sb.append(" ");
            sb.append(words[i]);
        }
        return sb.toString();
    }

    private String splitAndLower(String camelCase) {
        String[] words = splitCamelCase(camelCase);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            if (i > 0) sb.append(" ");
            // Keep acronyms like ID, URL, API uppercase
            if (words[i].length() <= 3 && words[i].equals(words[i].toUpperCase())) {
                sb.append(words[i]);
            } else {
                sb.append(words[i].toLowerCase());
            }
        }
        return sb.toString();
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }

    private String aOrAn(String noun) {
        if (noun.isEmpty()) return noun;
        char first = Character.toLowerCase(noun.charAt(0));
        if (first == 'a' || first == 'e' || first == 'i' || first == 'o' || first == 'u') {
            return "an " + noun;
        }
        return "a " + noun;
    }
}
