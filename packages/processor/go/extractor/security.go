// @docspec:module {
//   id: "docspec-go-extractor-security",
//   name: "Security Extractor",
//   description: "Detects security patterns including JWT validation, Casbin policy enforcement, OAuth2 usage, and docspec:secured/docspec:roles comment tags.",
//   since: "3.0.0"
// }
package extractor

import (
	"go/ast"
	"strings"
)

// SecurityExtractor detects security-related patterns in Go source code:
// @docspec:boundary "classpath-safe extraction"
//   - Middleware-based auth (casbin, jwt-go, authboss)
//   - Comment-based docspec security tags (//docspec:secured, //docspec:roles)
//   - Common auth guard patterns (checking user roles, permissions)
//
// This is the Go equivalent of the Java SecurityExtractor which detects
// @PreAuthorize, @Secured, and @RolesAllowed annotations.
type SecurityExtractor struct{}

// Known Go security/auth middleware import paths.
var securityImports = []string{
	"github.com/casbin/casbin",
	"github.com/casbin/casbin/v2",
	"github.com/golang-jwt/jwt",
	"github.com/golang-jwt/jwt/v4",
	"github.com/golang-jwt/jwt/v5",
	"github.com/dgrijalva/jwt-go",
	"github.com/volatiletech/authboss",
	"github.com/markbates/goth",
	"golang.org/x/oauth2",
}

// @docspec:deterministic
func (e *SecurityExtractor) Name() string {
	return "security"
}

// IsAvailable reports true if any file imports a known security package.
//
// @docspec:intentional "Checks security library imports and docspec:secured/docspec:roles comment tags"
func (e *SecurityExtractor) IsAvailable(ctx *ProcessorContext) bool {
	for _, imp := range securityImports {
		if hasImport(ctx, imp) {
			return true
		}
	}
	// Also available if any file has docspec:secured or docspec:roles comments
	for _, file := range ctx.Files {
		if hasSecurityDocTags(file) {
			return true
		}
	}
	return false
}

// Extract scans files for security patterns and populates ctx.Security.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Discovers security rules from JWT references, Casbin enforcer calls, and docspec:secured/docspec:roles tags"
func (e *SecurityExtractor) Extract(ctx *ProcessorContext) {
	allRoles := make(map[string]bool)
	var endpoints []SecurityEndpointRule

	for _, file := range ctx.Files {
		imports := fileImports(file)

		for _, decl := range file.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || !fn.Name.IsExported() {
				continue
			}

			rules := extractSecurityRules(fn, imports)
			if len(rules) == 0 {
				continue
			}

			// Collect roles from rules
			for _, rule := range rules {
				extractRolesFromRule(rule, allRoles)
			}

			path := inferEndpointPath(fn)
			endpoints = append(endpoints, SecurityEndpointRule{
				Path:   path,
				Rules:  rules,
				Public: false,
			})
		}
	}

	if len(endpoints) == 0 && len(allRoles) == 0 {
		return
	}

	roles := make([]string, 0, len(allRoles))
	for role := range allRoles {
		roles = append(roles, role)
	}

	if ctx.Security == nil {
		ctx.Security = &SecurityModel{}
	}
	ctx.Security.Roles = mergeStringSlices(ctx.Security.Roles, roles)
	ctx.Security.Endpoints = append(ctx.Security.Endpoints, endpoints...)
}

// extractSecurityRules checks a function for security-related patterns.
//
// @docspec:intentional "Extracts security rules from docspec comment tags, JWT references, and Casbin enforcer calls"
func extractSecurityRules(fn *ast.FuncDecl, imports map[string]bool) []string {
	var rules []string

	// Check docspec comment tags
	if fn.Doc != nil {
		for _, c := range fn.Doc.List {
			text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
			if strings.HasPrefix(text, "docspec:secured") {
				parts := strings.SplitN(text, " ", 2)
				if len(parts) == 2 {
					rules = append(rules, "Secured: "+strings.TrimSpace(parts[1]))
				} else {
					rules = append(rules, "Secured: authenticated")
				}
			}
			if strings.HasPrefix(text, "docspec:roles") {
				parts := strings.SplitN(text, " ", 2)
				if len(parts) == 2 {
					for _, role := range strings.Split(parts[1], ",") {
						role = strings.TrimSpace(role)
						if role != "" {
							rules = append(rules, "RolesAllowed: "+role)
						}
					}
				}
			}
		}
	}

	// Check if function body references JWT or auth middleware
	if fn.Body != nil && len(imports) > 0 {
		hasJWT := false
		hasCasbin := false
		for imp := range imports {
			if strings.Contains(imp, "jwt") {
				hasJWT = true
			}
			if strings.Contains(imp, "casbin") {
				hasCasbin = true
			}
		}

		if hasJWT {
			if bodyReferences(fn.Body, "jwt") {
				rules = appendUnique(rules, "JWT: token-validated")
			}
		}
		if hasCasbin {
			if bodyReferences(fn.Body, "casbin") || bodyReferences(fn.Body, "enforcer") {
				rules = appendUnique(rules, "Casbin: policy-enforced")
			}
		}
	}

	return rules
}

// bodyReferences checks if a function body contains an identifier matching the given substring.
//
// @docspec:deterministic
func bodyReferences(body *ast.BlockStmt, substr string) bool {
	found := false
	ast.Inspect(body, func(n ast.Node) bool {
		if found {
			return false
		}
		switch node := n.(type) {
		case *ast.Ident:
			if strings.Contains(strings.ToLower(node.Name), substr) {
				found = true
			}
		case *ast.SelectorExpr:
			if strings.Contains(strings.ToLower(node.Sel.Name), substr) {
				found = true
			}
		}
		return !found
	})
	return found
}

// extractRolesFromRule parses a rule string for role names.
//
// @docspec:intentional "Parses RolesAllowed and Secured rule prefixes to populate the role set"
func extractRolesFromRule(rule string, roles map[string]bool) {
	if strings.HasPrefix(rule, "RolesAllowed: ") {
		role := strings.TrimPrefix(rule, "RolesAllowed: ")
		role = strings.TrimPrefix(role, "ROLE_")
		roles[role] = true
	}
	if strings.HasPrefix(rule, "Secured: ") {
		value := strings.TrimPrefix(rule, "Secured: ")
		if value != "authenticated" {
			roles[value] = true
		}
	}
}

// inferEndpointPath tries to determine the HTTP path from function name or doc tags.
//
// @docspec:deterministic
func inferEndpointPath(fn *ast.FuncDecl) string {
	if fn.Doc != nil {
		for _, c := range fn.Doc.List {
			text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
			if strings.HasPrefix(text, "docspec:path") {
				parts := strings.SplitN(text, " ", 2)
				if len(parts) == 2 {
					return strings.TrimSpace(parts[1])
				}
			}
		}
	}

	// Fall back to function name as path hint
	name := fn.Name.Name
	if fn.Recv != nil && len(fn.Recv.List) > 0 {
		return "/" + strings.ToLower(name)
	}
	return "/" + strings.ToLower(name)
}

// hasSecurityDocTags checks if any declaration in the file has security doc tags.
//
// @docspec:deterministic
func hasSecurityDocTags(file *ast.File) bool {
	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok || fn.Doc == nil {
			continue
		}
		for _, c := range fn.Doc.List {
			text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
			if strings.HasPrefix(text, "docspec:secured") || strings.HasPrefix(text, "docspec:roles") {
				return true
			}
		}
	}
	return false
}

// mergeStringSlices merges b into a, avoiding duplicates.
//
// @docspec:preserves "no duplicate entries in the merged result"
func mergeStringSlices(a, b []string) []string {
	seen := make(map[string]bool, len(a))
	for _, s := range a {
		seen[s] = true
	}
	result := append([]string{}, a...)
	for _, s := range b {
		if !seen[s] {
			result = append(result, s)
			seen[s] = true
		}
	}
	return result
}

// appendUnique appends value to slice only if not already present.
//
// @docspec:preserves "no duplicate entries in the slice"
func appendUnique(slice []string, value string) []string {
	for _, s := range slice {
		if s == value {
			return slice
		}
	}
	return append(slice, value)
}
