// Package reader provides Go doc comment and description reading.
//
// @docspec:module {
//   id: "docspec-go-reader",
//   name: "Comment & Tag Reader",
//   description: "Reads Go doc comments, docspec comment tags, struct field tags, and type expressions, providing the text extraction layer for all pipeline stages.",
//   since: "3.0.0"
// }
package reader

import (
	"go/ast"
	"strings"
)

// ReadDocComment extracts the text from a Go doc comment group.
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func ReadDocComment(doc *ast.CommentGroup) string {
	if doc == nil {
		return ""
	}
	var lines []string
	for _, c := range doc.List {
		text := c.Text
		text = strings.TrimPrefix(text, "//")
		text = strings.TrimPrefix(text, " ")
		lines = append(lines, text)
	}
	return strings.Join(lines, " ")
}
