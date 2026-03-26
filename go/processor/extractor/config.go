// @docspec:module {
//   id: "docspec-go-extractor-config",
//   name: "Configuration Extractor",
//   description: "Detects configuration patterns in Go source code including Viper, envconfig, os.Getenv, and struct tags with mapstructure/yaml/env bindings.",
//   since: "3.0.0"
// }
package extractor

import (
	"go/ast"
	"strings"
	"unicode"
)

// ConfigExtractor detects configuration patterns in Go source code:
// @docspec:boundary "classpath-safe extraction"
//   - Viper configuration usage (viper.GetString, viper.GetInt, etc.)
//   - Environment variable access (os.Getenv, os.LookupEnv)
//   - Struct tags with envconfig, mapstructure, or yaml tags
//   - Comment-based docspec config tags (//docspec:config)
//
// This is the Go equivalent of the Java ConfigurationExtractor which detects
// @Value("${...}") and @ConfigurationProperties annotations.
type ConfigExtractor struct{}

// Known Go configuration library import paths.
var configImports = []string{
	"github.com/spf13/viper",
	"github.com/kelseyhightower/envconfig",
	"github.com/caarlos0/env/v6",
	"github.com/caarlos0/env/v7",
	"github.com/caarlos0/env/v8",
	"github.com/caarlos0/env/v9",
	"github.com/joho/godotenv",
	"github.com/knadh/koanf",
}

// @docspec:deterministic
func (e *ConfigExtractor) Name() string {
	return "configuration"
}

// IsAvailable reports true if any file imports a config library or uses os.Getenv.
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func (e *ConfigExtractor) IsAvailable(ctx *ProcessorContext) bool {
	for _, imp := range configImports {
		if hasImport(ctx, imp) {
			return true
		}
	}
	return hasImport(ctx, "os")
}

// Extract scans all files for configuration access patterns.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Discovers configuration properties from Viper calls, os.Getenv, struct tags, and docspec:config comments"
func (e *ConfigExtractor) Extract(ctx *ProcessorContext) {
	seen := make(map[string]bool)

	for _, file := range ctx.Files {
		imports := fileImports(file)
		pkg := file.Name.Name

		// Check for env/config struct tags
		for _, decl := range file.Decls {
			gd, ok := decl.(*ast.GenDecl)
			if !ok {
				continue
			}
			for _, spec := range gd.Specs {
				ts, ok := spec.(*ast.TypeSpec)
				if !ok {
					continue
				}
				st, ok := ts.Type.(*ast.StructType)
				if !ok || st.Fields == nil {
					continue
				}
				prefix := extractConfigPrefix(gd, ts)
				owner := pkg + "." + ts.Name.Name

				for _, field := range st.Fields.List {
					if field.Tag == nil || len(field.Names) == 0 {
						continue
					}
					tag := field.Tag.Value
					key, source := extractConfigKey(tag, prefix, field.Names[0].Name)
					if key == "" {
						continue
					}
					if seen[key] {
						continue
					}
					seen[key] = true

					prop := ConfigProperty{
						Key:    key,
						Type:   fieldTypeString(field.Type),
						Source: source,
						UsedBy: []string{owner},
					}
					// Check for default in tag
					if def := extractDefaultFromTag(tag); def != "" {
						prop.DefaultValue = def
					}
					ctx.Configuration = append(ctx.Configuration, prop)
				}
			}
		}

		// Check function bodies for viper/env calls
		hasViper := imports["github.com/spf13/viper"]
		hasOS := imports["os"]

		for _, decl := range file.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Body == nil {
				continue
			}

			owner := pkg
			if fn.Recv != nil && len(fn.Recv.List) > 0 {
				owner = pkg + "." + recvTypeName(fn.Recv.List[0].Type)
			}

			// Check for docspec:config comment tags
			if fn.Doc != nil {
				for _, c := range fn.Doc.List {
					text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
					if strings.HasPrefix(text, "docspec:config") {
						parts := strings.SplitN(text, " ", 2)
						if len(parts) == 2 {
							key := strings.TrimSpace(parts[1])
							if !seen[key] {
								seen[key] = true
								ctx.Configuration = append(ctx.Configuration, ConfigProperty{
									Key:    key,
									Source: "docspec-comment",
									UsedBy: []string{owner},
								})
							}
						}
					}
				}
			}

			ast.Inspect(fn.Body, func(n ast.Node) bool {
				call, ok := n.(*ast.CallExpr)
				if !ok {
					return true
				}

				sel, ok := call.Fun.(*ast.SelectorExpr)
				if !ok {
					return true
				}

				ident, ok := sel.X.(*ast.Ident)
				if !ok {
					return true
				}

				// Detect viper.GetXxx("key")
				if hasViper && ident.Name == "viper" && strings.HasPrefix(sel.Sel.Name, "Get") {
					if len(call.Args) > 0 {
						if lit, ok := call.Args[0].(*ast.BasicLit); ok {
							key := strings.Trim(lit.Value, `"`)
							if !seen[key] {
								seen[key] = true
								ctx.Configuration = append(ctx.Configuration, ConfigProperty{
									Key:    key,
									Type:   viperGetType(sel.Sel.Name),
									Source: "viper",
									UsedBy: []string{owner},
								})
							}
						}
					}
				}

				// Detect os.Getenv("KEY") or os.LookupEnv("KEY")
				if hasOS && ident.Name == "os" &&
					(sel.Sel.Name == "Getenv" || sel.Sel.Name == "LookupEnv") {
					if len(call.Args) > 0 {
						if lit, ok := call.Args[0].(*ast.BasicLit); ok {
							key := strings.Trim(lit.Value, `"`)
							if !seen[key] {
								seen[key] = true
								ctx.Configuration = append(ctx.Configuration, ConfigProperty{
									Key:    key,
									Type:   "string",
									Source: "env",
									UsedBy: []string{owner},
								})
							}
						}
					}
				}

				return true
			})
		}
	}
}

// extractConfigPrefix looks for a docspec:config-prefix comment tag.
//
// @docspec:deterministic
func extractConfigPrefix(gd *ast.GenDecl, ts *ast.TypeSpec) string {
	if gd.Doc != nil {
		for _, c := range gd.Doc.List {
			text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
			if strings.HasPrefix(text, "docspec:config-prefix") {
				parts := strings.SplitN(text, " ", 2)
				if len(parts) == 2 {
					return strings.TrimSpace(parts[1])
				}
			}
		}
	}
	return ""
}

// extractConfigKey extracts a config key from a struct field tag.
// Supported tags: envconfig, mapstructure, yaml, env.
//
// @docspec:deterministic
func extractConfigKey(tag, prefix, fieldName string) (string, string) {
	tag = strings.Trim(tag, "`")

	// Try envconfig tag
	if val := extractTagValue(tag, "envconfig"); val != "" {
		return prefixed(prefix, val), "envconfig"
	}
	// Try mapstructure tag
	if val := extractTagValue(tag, "mapstructure"); val != "" {
		return prefixed(prefix, val), "mapstructure"
	}
	// Try yaml tag
	if val := extractTagValue(tag, "yaml"); val != "" {
		return prefixed(prefix, val), "yaml"
	}
	// Try env tag (caarlos0/env)
	if val := extractTagValue(tag, "env"); val != "" {
		return val, "env"
	}

	return "", ""
}

// extractTagValue extracts the value for a specific struct tag key.
//
// @docspec:deterministic
func extractTagValue(tag, key string) string {
	search := key + `:"`
	idx := strings.Index(tag, search)
	if idx < 0 {
		return ""
	}
	start := idx + len(search)
	end := strings.Index(tag[start:], `"`)
	if end < 0 {
		return ""
	}
	val := tag[start : start+end]
	// Strip options after comma
	if comma := strings.Index(val, ","); comma >= 0 {
		val = val[:comma]
	}
	if val == "-" {
		return ""
	}
	return val
}

// extractDefaultFromTag looks for a default:"..." value in the struct tag.
//
// @docspec:deterministic
func extractDefaultFromTag(tag string) string {
	return extractTagValue(strings.Trim(tag, "`"), "default")
}

// prefixed adds a prefix to a key if the prefix is non-empty.
//
// @docspec:deterministic
func prefixed(prefix, key string) string {
	if prefix == "" {
		return key
	}
	return prefix + "." + key
}

// viperGetType maps Viper getter method names to type strings.
//
// @docspec:deterministic
func viperGetType(method string) string {
	switch method {
	case "GetString", "Get":
		return "string"
	case "GetInt":
		return "int"
	case "GetBool":
		return "bool"
	case "GetFloat64":
		return "float64"
	case "GetDuration":
		return "duration"
	case "GetStringSlice":
		return "[]string"
	case "GetStringMap":
		return "map[string]interface{}"
	default:
		return "any"
	}
}

// fieldTypeString returns a string representation of a field's type expression.
//
// @docspec:deterministic
func fieldTypeString(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.StarExpr:
		return "*" + fieldTypeString(t.X)
	case *ast.SelectorExpr:
		return fieldTypeString(t.X) + "." + t.Sel.Name
	case *ast.ArrayType:
		return "[]" + fieldTypeString(t.Elt)
	case *ast.MapType:
		return "map[" + fieldTypeString(t.Key) + "]" + fieldTypeString(t.Value)
	default:
		return "any"
	}
}

// recvTypeName extracts the receiver type name, stripping pointer indirection.
//
// @docspec:deterministic
func recvTypeName(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.StarExpr:
		return recvTypeName(t.X)
	default:
		return "unknown"
	}
}

// camelToKebab converts a camelCase string to kebab-case.
//
// @docspec:deterministic
func camelToKebab(s string) string {
	var result strings.Builder
	for i, r := range s {
		if i > 0 && unicode.IsUpper(r) {
			result.WriteByte('-')
		}
		result.WriteRune(unicode.ToLower(r))
	}
	return result.String()
}
