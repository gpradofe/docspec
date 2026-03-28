// @docspec:module {
//   id: "docspec-go-reader-tags",
//   name: "Tag Reader",
//   description: "Parses docspec comment tags from Go doc comments, supporting single-value, multi-value, key-value, and struct field tag patterns.",
//   since: "3.0.0"
// }
package reader

import (
	"go/ast"
	"strings"
)

// Tag represents a parsed docspec comment tag with its key and value.
// @docspec:intentional "Captures a single docspec comment directive as a key-value pair"
type Tag struct {
	Key   string
	Value string
}

// ReadDocSpecTags reads all docspec comment tags from a doc comment group.
// Tags follow the format: //docspec:key value
// Returns a slice of Tag structs preserving declaration order.
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
// @docspec:preserves fields="declaration order"
func ReadDocSpecTags(doc *ast.CommentGroup) []Tag {
	if doc == nil {
		return nil
	}
	var tags []Tag
	for _, c := range doc.List {
		text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
		if !strings.HasPrefix(text, "docspec:") {
			continue
		}
		// Strip the "docspec:" prefix
		rest := text[len("docspec:"):]
		parts := strings.SplitN(rest, " ", 2)
		key := parts[0]
		value := ""
		if len(parts) == 2 {
			value = strings.TrimSpace(parts[1])
		}
		tags = append(tags, Tag{Key: key, Value: value})
	}
	return tags
}

// ReadTag reads a single docspec tag value by key. Returns empty string if not found.
//
// @docspec:deterministic
func ReadTag(doc *ast.CommentGroup, key string) string {
	tags := ReadDocSpecTags(doc)
	for _, tag := range tags {
		if tag.Key == key {
			return tag.Value
		}
	}
	return ""
}

// ReadAllTags reads all values for a given docspec tag key.
// Useful for tags that may appear multiple times (e.g., docspec:cause).
//
// @docspec:deterministic
func ReadAllTags(doc *ast.CommentGroup, key string) []string {
	tags := ReadDocSpecTags(doc)
	var values []string
	for _, tag := range tags {
		if tag.Key == key && tag.Value != "" {
			values = append(values, tag.Value)
		}
	}
	return values
}

// HasTag checks if a specific docspec tag is present.
//
// @docspec:deterministic
func HasTag(doc *ast.CommentGroup, key string) bool {
	tags := ReadDocSpecTags(doc)
	for _, tag := range tags {
		if tag.Key == key {
			return true
		}
	}
	return false
}

// ReadTagMap reads all docspec tags and returns them as a map.
// If a key appears multiple times, only the last value is kept.
//
// @docspec:deterministic
func ReadTagMap(doc *ast.CommentGroup) map[string]string {
	tags := ReadDocSpecTags(doc)
	result := make(map[string]string, len(tags))
	for _, tag := range tags {
		result[tag.Key] = tag.Value
	}
	return result
}

// ParseKeyValueTag parses a tag value that contains key=value pairs.
// Example: "type=email retention=90d encrypted" returns a map with those keys.
// Bare words (without =) are stored with value "true".
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func ParseKeyValueTag(value string) map[string]string {
	result := make(map[string]string)
	parts := strings.Fields(value)
	for _, part := range parts {
		if idx := strings.Index(part, "="); idx >= 0 {
			result[part[:idx]] = part[idx+1:]
		} else {
			result[part] = "true"
		}
	}
	return result
}

// ReadStructFieldTags reads docspec tags from all fields in a struct type.
// Returns a map from field name to that field's tags.
//
// @docspec:deterministic
func ReadStructFieldTags(st *ast.StructType) map[string][]Tag {
	if st == nil || st.Fields == nil {
		return nil
	}
	result := make(map[string][]Tag)
	for _, field := range st.Fields.List {
		if len(field.Names) == 0 || field.Doc == nil {
			continue
		}
		tags := ReadDocSpecTags(field.Doc)
		if len(tags) > 0 {
			result[field.Names[0].Name] = tags
		}
	}
	return result
}
