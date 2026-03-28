// @docspec:module {
//   id: "docspec-go-extractor-error-event",
//   name: "Error & Event Extractor",
//   description: "Detects sentinel errors (ErrXxx), custom error types, event structs, and docspec:error/docspec:event comment tags to populate the errors and events sections.",
//   since: "3.0.0"
// }
package extractor

import (
	"go/ast"
	"strconv"
	"strings"
)

// ErrorEventExtractor detects error codes and event definitions in Go source code:
// @docspec:boundary "classpath-safe extraction"
//   - Custom error types (implementing the error interface)
//   - Sentinel errors (var ErrXxx = errors.New(...))
//   - Error constants with codes
//   - Event structs and event publishing patterns
//   - Comment-based docspec tags (//docspec:error, //docspec:event)
//
// This is the Go equivalent of the Java error/event extraction that detects
// @DocError and @DocEvent annotations and populates the errors and events
// sections of the DocSpec model.
type ErrorEventExtractor struct{}

// @docspec:deterministic
func (e *ErrorEventExtractor) Name() string {
	return "error-event"
}

// IsAvailable always returns true since error/event detection works via
// naming conventions and doc comment tags.
//
// @docspec:deterministic
func (e *ErrorEventExtractor) IsAvailable(ctx *ProcessorContext) bool {
	return true
}

// Extract scans files for error and event patterns.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Detects errors via sentinel variables, error types, and docspec tags; detects events via naming conventions and docspec tags"
func (e *ErrorEventExtractor) Extract(ctx *ProcessorContext) {
	for _, file := range ctx.Files {
		pkg := file.Name.Name
		e.extractErrors(file, pkg, ctx)
		e.extractEvents(file, pkg, ctx)
	}
}

// extractErrors finds error declarations, error types, and docspec:error tags.
//
// @docspec:intentional "Discovers sentinel errors, error types, and docspec:error comment tags"
func (e *ErrorEventExtractor) extractErrors(file *ast.File, pkg string, ctx *ProcessorContext) {
	for _, decl := range file.Decls {
		switch d := decl.(type) {
		case *ast.GenDecl:
			for _, spec := range d.Specs {
				// Check for sentinel errors: var ErrXxx = errors.New("...")
				if vs, ok := spec.(*ast.ValueSpec); ok {
					for i, name := range vs.Names {
						if !strings.HasPrefix(name.Name, "Err") || !name.IsExported() {
							continue
						}

						entry := ErrorEntry{
							Code:      name.Name,
							Exception: pkg + "." + name.Name,
						}

						// Extract description from the errors.New or fmt.Errorf argument
						if i < len(vs.Values) {
							entry.Description = extractErrorMessage(vs.Values[i])
						}

						// Check for docspec:error comment tag
						if d.Doc != nil {
							enrichErrorFromDoc(d.Doc, &entry)
						}
						if vs.Doc != nil {
							enrichErrorFromDoc(vs.Doc, &entry)
						}

						ctx.Errors = append(ctx.Errors, entry)
					}
				}

				// Check for error types (structs that may implement error interface)
				if ts, ok := spec.(*ast.TypeSpec); ok {
					if !ts.Name.IsExported() {
						continue
					}
					name := ts.Name.Name
					if !strings.HasSuffix(name, "Error") && !strings.HasSuffix(name, "Err") {
						continue
					}

					entry := ErrorEntry{
						Code:      name,
						Exception: pkg + "." + name,
					}

					// Try to get description from doc comment
					if d.Doc != nil {
						desc := docText(d.Doc)
						if desc != "" {
							entry.Description = desc
						}
						enrichErrorFromDoc(d.Doc, &entry)
					}

					ctx.Errors = append(ctx.Errors, entry)
				}
			}

		case *ast.FuncDecl:
			// Check function-level docspec:error tags
			if d.Doc == nil {
				continue
			}
			for _, c := range d.Doc.List {
				text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
				if !strings.HasPrefix(text, "docspec:error") {
					continue
				}
				// Format: //docspec:error CODE [httpStatus=NNN] [description]
				parts := strings.Fields(text)
				if len(parts) < 2 {
					continue
				}

				entry := ErrorEntry{
					Code: parts[1],
				}

				thrownBy := pkg + "." + d.Name.Name
				if d.Recv != nil && len(d.Recv.List) > 0 {
					thrownBy = pkg + "." + recvTypeName(d.Recv.List[0].Type) + "." + d.Name.Name
				}
				entry.ThrownBy = []string{thrownBy}

				for _, part := range parts[2:] {
					if strings.HasPrefix(part, "httpStatus=") {
						val := strings.TrimPrefix(part, "httpStatus=")
						if n, err := strconv.Atoi(val); err == nil {
							entry.HTTPStatus = n
						}
					}
				}

				// Remaining parts after flag-like params form the description
				desc := extractDescriptionFromParts(parts[2:])
				if desc != "" {
					entry.Description = desc
				}

				ctx.Errors = append(ctx.Errors, entry)
			}
		}
	}
}

// extractEvents finds event structs and docspec:event tags.
//
// @docspec:intentional "Discovers event structs by naming convention and docspec:event comment tags"
func (e *ErrorEventExtractor) extractEvents(file *ast.File, pkg string, ctx *ProcessorContext) {
	for _, decl := range file.Decls {
		switch d := decl.(type) {
		case *ast.GenDecl:
			for _, spec := range d.Specs {
				ts, ok := spec.(*ast.TypeSpec)
				if !ok || !ts.Name.IsExported() {
					continue
				}

				name := ts.Name.Name

				// Check for docspec:event comment tag
				if d.Doc != nil {
					for _, c := range d.Doc.List {
						text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
						if strings.HasPrefix(text, "docspec:event") {
							event := parseEventTag(text, name)
							ctx.Events = append(ctx.Events, event)
						}
					}
				}

				// Detect event structs by naming convention
				if !strings.HasSuffix(name, "Event") && !strings.HasSuffix(name, "Message") &&
					!strings.HasSuffix(name, "Notification") {
					continue
				}
				if _, ok := ts.Type.(*ast.StructType); !ok {
					continue
				}

				// Check if already added via docspec tag
				alreadyAdded := false
				for _, ev := range ctx.Events {
					if ev.Name == name {
						alreadyAdded = true
						break
					}
				}
				if alreadyAdded {
					continue
				}

				event := EventEntry{
					Name: name,
				}

				// Get description from doc comment
				if d.Doc != nil {
					desc := docText(d.Doc)
					if desc != "" {
						event.Description = desc
					}
				}

				ctx.Events = append(ctx.Events, event)
			}

		case *ast.FuncDecl:
			// Check function-level docspec:event tags
			if d.Doc == nil {
				continue
			}
			for _, c := range d.Doc.List {
				text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
				if strings.HasPrefix(text, "docspec:event") {
					event := parseEventTag(text, "")
					ctx.Events = append(ctx.Events, event)
				}
			}
		}
	}
}

// extractErrorMessage tries to extract the error message from an expression like
// errors.New("message") or fmt.Errorf("message", ...).
//
// @docspec:deterministic
func extractErrorMessage(expr ast.Expr) string {
	call, ok := expr.(*ast.CallExpr)
	if !ok {
		return ""
	}

	// Check for errors.New or fmt.Errorf
	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok {
		return ""
	}

	ident, ok := sel.X.(*ast.Ident)
	if !ok {
		return ""
	}

	if (ident.Name == "errors" && sel.Sel.Name == "New") ||
		(ident.Name == "fmt" && sel.Sel.Name == "Errorf") {
		if len(call.Args) > 0 {
			if lit, ok := call.Args[0].(*ast.BasicLit); ok {
				return strings.Trim(lit.Value, `"`)
			}
		}
	}

	return ""
}

// enrichErrorFromDoc parses docspec error attributes from a comment group.
//
// @docspec:intentional "Enriches an ErrorEntry with httpStatus, resolution, and cause from docspec comment tags"
func enrichErrorFromDoc(doc *ast.CommentGroup, entry *ErrorEntry) {
	for _, c := range doc.List {
		text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))

		if strings.HasPrefix(text, "docspec:error") {
			parts := strings.Fields(text)
			for _, part := range parts[1:] {
				if strings.HasPrefix(part, "httpStatus=") {
					val := strings.TrimPrefix(part, "httpStatus=")
					if n, err := strconv.Atoi(val); err == nil {
						entry.HTTPStatus = n
					}
				}
				if strings.HasPrefix(part, "resolution=") {
					entry.Resolution = strings.TrimPrefix(part, "resolution=")
				}
			}
		}

		if strings.HasPrefix(text, "docspec:cause") {
			cause := strings.TrimPrefix(text, "docspec:cause ")
			cause = strings.TrimSpace(cause)
			if cause != "" {
				entry.Causes = append(entry.Causes, cause)
			}
		}
	}
}

// parseEventTag parses a //docspec:event tag.
// Format: //docspec:event NAME [channel=CHANNEL] [trigger=TRIGGER] [guarantee=GUARANTEE] [DESCRIPTION]
//
// @docspec:deterministic
func parseEventTag(text, defaultName string) EventEntry {
	parts := strings.Fields(text)
	event := EventEntry{}

	if len(parts) >= 2 {
		event.Name = parts[1]
	} else if defaultName != "" {
		event.Name = defaultName
	}

	for _, part := range parts[2:] {
		if strings.HasPrefix(part, "channel=") {
			event.Channel = strings.TrimPrefix(part, "channel=")
		} else if strings.HasPrefix(part, "trigger=") {
			event.Trigger = strings.TrimPrefix(part, "trigger=")
		} else if strings.HasPrefix(part, "guarantee=") {
			event.DeliveryGuarantee = strings.TrimPrefix(part, "guarantee=")
		}
	}

	desc := extractDescriptionFromParts(parts[2:])
	if desc != "" {
		event.Description = desc
	}

	return event
}

// docText extracts plain text from a comment group, stripping comment markers
// and docspec directive lines.
//
// @docspec:deterministic
func docText(doc *ast.CommentGroup) string {
	if doc == nil {
		return ""
	}
	var lines []string
	for _, c := range doc.List {
		text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
		if strings.HasPrefix(text, "docspec:") {
			continue
		}
		if text != "" {
			lines = append(lines, text)
		}
	}
	return strings.Join(lines, " ")
}

// extractDescriptionFromParts builds a description from parts that are not
// flag-like (key=value) parameters.
//
// @docspec:deterministic
func extractDescriptionFromParts(parts []string) string {
	var descParts []string
	for _, part := range parts {
		if strings.Contains(part, "=") {
			continue
		}
		descParts = append(descParts, part)
	}
	return strings.Join(descParts, " ")
}
