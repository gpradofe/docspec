// @docspec:module {
//   id: "docspec-go-dsti-naming",
//   name: "DSTI Naming Analyzer",
//   description: "Parses function and method names into verb-object-intent triples using camelCase decomposition, mirroring the Java NamingAnalyzer for DSTI channel 1 (nameSemantics).",
//   since: "3.0.0"
// }
package dsti

import (
	"strings"
	"unicode"
)

// NameSemantics holds the parsed semantic components of a function name.
// @docspec:intentional "Captures the verb-object-intent triple from a function name"
type NameSemantics struct {
	Verb   string `json:"verb"`
	Object string `json:"object"`
	Intent string `json:"intent"`
}

// Known verb prefixes ordered longest-first where needed to avoid prefix collisions.
var verbPrefixes = []string{
	"get", "set", "is", "has", "find", "create", "delete", "remove",
	"update", "save", "add", "validate", "check", "compute", "calculate",
	"process", "handle", "convert", "transform", "parse", "format",
	"build", "generate", "initialize", "init", "load", "fetch",
	"send", "receive", "publish", "subscribe", "notify", "dispatch",
	"sync", "migrate", "schedule", "retry", "batch",
	"aggregate", "merge", "split", "emit", "enrich", "filter",
	"list", "count", "new",
}

// intentMap maps verb prefixes to intent categories, matching the Java
// NamingAnalyzer's categorizeIntent switch statement.
var intentMap = map[string]string{
	"get":        "query",
	"find":       "query",
	"fetch":      "query",
	"load":       "query",
	"is":         "query",
	"has":        "query",
	"list":       "query",
	"count":      "query",
	"set":        "mutation",
	"update":     "mutation",
	"save":       "mutation",
	"add":        "mutation",
	"create":     "creation",
	"build":      "creation",
	"generate":   "creation",
	"initialize": "creation",
	"init":       "creation",
	"new":        "creation",
	"delete":     "deletion",
	"remove":     "deletion",
	"validate":   "validation",
	"check":      "validation",
	"compute":    "computation",
	"calculate":  "computation",
	"process":    "computation",
	"convert":    "transformation",
	"parse":      "transformation",
	"format":     "transformation",
	"transform":  "transform",
	"handle":     "handler",
	"dispatch":   "handler",
	"send":       "emission",
	"receive":    "consumption",
	"sync":       "synchronize",
	"migrate":    "migrate",
	"schedule":   "schedule",
	"retry":      "retry",
	"batch":      "batch-process",
	"aggregate":  "aggregate",
	"merge":      "merge",
	"split":      "split",
	"notify":     "notify",
	"emit":       "emit",
	"publish":    "publish",
	"subscribe":  "subscribe",
	"enrich":     "enrich",
	"filter":     "filter",
}

// AnalyzeName parses a function or method name and extracts its semantic
// components: verb, object, and intent category. This mirrors the Java
// NamingAnalyzer.analyze() method.
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
// @docspec:intentional "Decomposes a function name into verb-object-intent using camelCase boundaries and a known verb prefix table"
//
// Examples:
//
//	"GetUserByID" -> {Verb: "get", Object: "user by id", Intent: "query"}
//	"CreateOrder" -> {Verb: "create", Object: "order", Intent: "creation"}
//	"ValidateInput" -> {Verb: "validate", Object: "input", Intent: "validation"}
func AnalyzeName(name string) NameSemantics {
	lower := strings.ToLower(name)

	for _, verb := range verbPrefixes {
		if !strings.HasPrefix(lower, verb) || len(name) <= len(verb) {
			continue
		}

		// Verify the next character after the verb is uppercase (camelCase boundary)
		nextChar := rune(name[len(verb)])
		if !unicode.IsUpper(nextChar) {
			continue
		}

		object := name[len(verb):]
		intent := intentMap[verb]
		if intent == "" {
			intent = "unknown"
		}

		return NameSemantics{
			Verb:   verb,
			Object: splitCamelCaseToLower(object),
			Intent: intent,
		}
	}

	// Fallback: the entire name is the verb
	return NameSemantics{
		Verb:   strings.ToLower(name),
		Object: "",
		Intent: "unknown",
	}
}

// splitCamelCaseToLower splits a camelCase string into space-separated lowercase words.
// Example: "UserProfile" -> "user profile"
//
// @docspec:deterministic
func splitCamelCaseToLower(s string) string {
	words := SplitCamelCase(s)
	for i, w := range words {
		words[i] = strings.ToLower(w)
	}
	return strings.Join(words, " ")
}

// SplitCamelCase splits a camelCase or PascalCase string into its component words.
// Handles runs of uppercase letters (acronyms) correctly:
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
//
//	"HTTPServer" -> ["HTTP", "Server"]
//	"getUserByID" -> ["get", "User", "By", "ID"]
func SplitCamelCase(s string) []string {
	if s == "" {
		return nil
	}

	var words []string
	var current strings.Builder

	runes := []rune(s)
	for i := 0; i < len(runes); i++ {
		r := runes[i]

		if i == 0 {
			current.WriteRune(r)
			continue
		}

		if unicode.IsUpper(r) {
			// Check if this is part of an acronym (next char is also upper or end of string)
			if unicode.IsUpper(runes[i-1]) {
				// Could be mid-acronym: check if next is lowercase (end of acronym)
				if i+1 < len(runes) && unicode.IsLower(runes[i+1]) {
					// End of acronym, start new word
					if current.Len() > 0 {
						words = append(words, current.String())
						current.Reset()
					}
				}
				current.WriteRune(r)
			} else {
				// Normal camelCase boundary
				if current.Len() > 0 {
					words = append(words, current.String())
					current.Reset()
				}
				current.WriteRune(r)
			}
		} else {
			current.WriteRune(r)
		}
	}

	if current.Len() > 0 {
		words = append(words, current.String())
	}

	return words
}
