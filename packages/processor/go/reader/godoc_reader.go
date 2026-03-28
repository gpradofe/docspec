// @docspec:module {
//   id: "docspec-go-reader-godoc",
//   name: "GoDoc Reader",
//   description: "Reads structured godoc metadata and converts Go type expressions to string representations for the DocSpec model.",
//   since: "3.0.0"
// }
package reader

import (
	"go/ast"
	"strings"
)

// TypeString converts a Go type expression to a string.
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func TypeString(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.StarExpr:
		return "*" + TypeString(t.X)
	case *ast.SelectorExpr:
		return TypeString(t.X) + "." + t.Sel.Name
	case *ast.ArrayType:
		return "[]" + TypeString(t.Elt)
	case *ast.MapType:
		return "map[" + TypeString(t.Key) + "]" + TypeString(t.Value)
	case *ast.InterfaceType:
		return "interface{}"
	default:
		return "any"
	}
}

// ReadGodoc reads structured godoc metadata from doc comments.
// Looks for special comment directives: //docspec:key value
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func ReadGodoc(doc *ast.CommentGroup) map[string]string {
	result := make(map[string]string)
	if doc == nil {
		return result
	}
	for _, c := range doc.List {
		text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
		if strings.HasPrefix(text, "docspec:") {
			parts := strings.SplitN(text[8:], " ", 2)
			if len(parts) == 2 {
				result[parts[0]] = parts[1]
			}
		}
	}
	return result
}
