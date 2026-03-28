// @docspec:module {
//   id: "docspec-go-reader-inferrer",
//   name: "Description Inferrer",
//   description: "Generates human-readable descriptions from Go identifier names using verb prefix decomposition and camelCase splitting, enabling Tier 0 zero-config documentation.",
//   since: "3.0.0"
// }
package reader

import (
	"strings"
	"unicode"
)

var verbMap = map[string]string{
	"Get": "Retrieves", "Find": "Finds", "Fetch": "Fetches", "Load": "Loads",
	"Create": "Creates", "New": "Creates a new", "Add": "Adds", "Insert": "Inserts",
	"Update": "Updates", "Modify": "Modifies", "Set": "Sets",
	"Delete": "Deletes", "Remove": "Removes",
	"Validate": "Validates", "Check": "Checks", "Verify": "Verifies",
	"Process": "Processes", "Handle": "Handles", "Execute": "Executes",
	"Send": "Sends", "Publish": "Publishes", "Emit": "Emits",
	"Convert": "Converts", "Transform": "Transforms", "Parse": "Parses",
	"Calculate": "Calculates", "Compute": "Computes", "Count": "Counts",
	"Is": "Checks whether", "Has": "Checks if has", "Can": "Determines if can",
}

// InferDescription generates a description from a Go identifier name.
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
// @docspec:intentional "Infers a natural-language description from a camelCase function/type name using a verb-to-sentence mapping"
func InferDescription(name string) string {
	words := splitCamelCase(name)
	if len(words) == 0 {
		return ""
	}

	verb := words[0]
	rest := strings.Join(words[1:], " ")

	if prefix, ok := verbMap[verb]; ok {
		if rest != "" {
			return prefix + " " + strings.ToLower(rest) + "."
		}
		return prefix + " the resource."
	}

	humanized := strings.Join(words, " ")
	return strings.ToUpper(humanized[:1]) + humanized[1:] + "."
}

// @docspec:deterministic
func splitCamelCase(s string) []string {
	var words []string
	var current strings.Builder
	for i, r := range s {
		if i > 0 && unicode.IsUpper(r) {
			if current.Len() > 0 {
				words = append(words, current.String())
				current.Reset()
			}
		}
		current.WriteRune(r)
	}
	if current.Len() > 0 {
		words = append(words, current.String())
	}
	return words
}
