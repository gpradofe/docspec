// @docspec:module {
//   id: "docspec-go-extractor-external-dep",
//   name: "External Dependency Extractor",
//   description: "Detects external service and API calls via net/http, resty, go-retryablehttp, and gRPC client usage, extracting URLs, methods, and call sites.",
//   since: "3.0.0"
// }
package extractor

import (
	"go/ast"
	"strings"
)

// ExternalDepExtractor detects external service/API calls in Go source code:
// @docspec:boundary "classpath-safe extraction"
//   - net/http client usage (http.Get, http.Post, http.NewRequest)
//   - Popular HTTP client libraries (resty, req, go-retryablehttp)
//   - gRPC client connections (grpc.Dial, grpc.NewClient)
//   - Comment-based docspec tags (//docspec:external)
//
// This is the Go equivalent of the Java ExternalDependencyExtractor which detects
// RestTemplate, WebClient, RestClient, and @FeignClient usage.
type ExternalDepExtractor struct{}

// Known Go HTTP/gRPC client import paths.
var externalDepImports = []string{
	"net/http",
	"github.com/go-resty/resty/v2",
	"github.com/imroc/req/v3",
	"github.com/hashicorp/go-retryablehttp",
	"google.golang.org/grpc",
}

// @docspec:deterministic
func (e *ExternalDepExtractor) Name() string {
	return "external-dependency"
}

// IsAvailable reports true if any file imports a known HTTP or gRPC client package.
//
// @docspec:deterministic
func (e *ExternalDepExtractor) IsAvailable(ctx *ProcessorContext) bool {
	for _, imp := range externalDepImports {
		if hasImport(ctx, imp) {
			return true
		}
	}
	return false
}

// Extract scans files for external dependency patterns and populates ctx.ExternalDeps.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Detects HTTP client calls, resty chain calls, gRPC connections, and client struct fields for external dependency mapping"
func (e *ExternalDepExtractor) Extract(ctx *ProcessorContext) {
	seen := make(map[string]bool)

	for _, file := range ctx.Files {
		imports := fileImports(file)
		pkg := file.Name.Name

		hasHTTP := imports["net/http"]
		hasResty := imports["github.com/go-resty/resty/v2"]
		hasGRPC := imports["google.golang.org/grpc"]

		for _, decl := range file.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok {
				continue
			}

			owner := pkg + "." + fn.Name.Name
			if fn.Recv != nil && len(fn.Recv.List) > 0 {
				owner = pkg + "." + recvTypeName(fn.Recv.List[0].Type) + "." + fn.Name.Name
			}

			// Check for docspec:external comment tags
			if fn.Doc != nil {
				for _, c := range fn.Doc.List {
					text := strings.TrimSpace(strings.TrimPrefix(c.Text, "//"))
					if strings.HasPrefix(text, "docspec:external") {
						parts := strings.Fields(text)
						if len(parts) >= 2 {
							name := parts[1]
							baseURL := ""
							if len(parts) >= 3 {
								baseURL = parts[2]
							}
							if !seen[name] {
								seen[name] = true
								dep := ExternalDependency{
									Name:    name,
									BaseURL: baseURL,
								}
								ctx.ExternalDeps = append(ctx.ExternalDeps, dep)
							}
						}
					}
				}
			}

			if fn.Body == nil {
				continue
			}

			// Detect HTTP client calls
			if hasHTTP {
				extractHTTPClientCalls(fn.Body, owner, ctx, seen)
			}

			// Detect resty client usage
			if hasResty {
				extractRestyClientCalls(fn.Body, owner, ctx, seen)
			}

			// Detect gRPC connections
			if hasGRPC {
				extractGRPCCalls(fn.Body, owner, ctx, seen)
			}
		}

		// Also check struct fields for client types
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
				structName := pkg + "." + ts.Name.Name

				for _, field := range st.Fields.List {
					if len(field.Names) == 0 {
						continue
					}
					fieldType := fieldTypeString(field.Type)
					isClient := false
					if strings.Contains(fieldType, "http.Client") {
						isClient = true
					}
					if strings.Contains(fieldType, "resty.Client") {
						isClient = true
					}
					if strings.Contains(fieldType, "grpc.ClientConn") {
						isClient = true
					}

					if isClient {
						depName := "external-via-" + ts.Name.Name
						if !seen[depName] {
							seen[depName] = true
							ctx.ExternalDeps = append(ctx.ExternalDeps, ExternalDependency{
								Name:    depName,
								BaseURL: "(detected from HTTP client field in " + structName + ")",
							})
						}
					}
				}
			}
		}
	}
}

// extractHTTPClientCalls looks for http.Get, http.Post, http.NewRequest calls.
//
// @docspec:intentional "Detects standard net/http client calls and extracts HTTP method and URL"
func extractHTTPClientCalls(body *ast.BlockStmt, owner string, ctx *ProcessorContext, seen map[string]bool) {
	ast.Inspect(body, func(n ast.Node) bool {
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

		if ident.Name != "http" {
			return true
		}

		method := ""
		switch sel.Sel.Name {
		case "Get":
			method = "GET"
		case "Post":
			method = "POST"
		case "Head":
			method = "HEAD"
		case "NewRequest":
			// http.NewRequest(method, url, body)
			if len(call.Args) >= 2 {
				if lit, ok := call.Args[0].(*ast.BasicLit); ok {
					method = strings.Trim(lit.Value, `"`)
				}
			}
		default:
			return true
		}

		if method == "" {
			return true
		}

		// Try to extract URL from arguments
		urlArg := 0
		if sel.Sel.Name == "NewRequest" {
			urlArg = 1
		}

		url := "(dynamic URL)"
		if urlArg < len(call.Args) {
			if lit, ok := call.Args[urlArg].(*ast.BasicLit); ok {
				url = strings.Trim(lit.Value, `"`)
			}
		}

		depName := "http-call-from-" + owner
		if !seen[depName] {
			seen[depName] = true
			dep := ExternalDependency{
				Name: depName,
				Endpoints: []ExternalDependencyEndpoint{
					{
						Method: method,
						Path:   url,
						UsedBy: []string{owner},
					},
				},
			}
			ctx.ExternalDeps = append(ctx.ExternalDeps, dep)
		}

		return true
	})
}

// extractRestyClientCalls looks for resty R().Get/Post/Put/Delete calls.
//
// @docspec:intentional "Detects go-resty fluent chain calls and extracts HTTP method and URL"
func extractRestyClientCalls(body *ast.BlockStmt, owner string, ctx *ProcessorContext, seen map[string]bool) {
	ast.Inspect(body, func(n ast.Node) bool {
		call, ok := n.(*ast.CallExpr)
		if !ok {
			return true
		}

		sel, ok := call.Fun.(*ast.SelectorExpr)
		if !ok {
			return true
		}

		method := ""
		switch sel.Sel.Name {
		case "Get", "Post", "Put", "Delete", "Patch":
			method = strings.ToUpper(sel.Sel.Name)
		default:
			return true
		}

		// Check if this is a resty chain call by looking at the receiver chain
		if isRestyChainCall(sel.X) {
			url := "(dynamic URL)"
			if len(call.Args) > 0 {
				if lit, ok := call.Args[0].(*ast.BasicLit); ok {
					url = strings.Trim(lit.Value, `"`)
				}
			}

			depName := "resty-call-from-" + owner
			if !seen[depName] {
				seen[depName] = true
				dep := ExternalDependency{
					Name: depName,
					Endpoints: []ExternalDependencyEndpoint{
						{
							Method: method,
							Path:   url,
							UsedBy: []string{owner},
						},
					},
				}
				ctx.ExternalDeps = append(ctx.ExternalDeps, dep)
			}
		}

		return true
	})
}

// isRestyChainCall checks if an expression is part of a resty method chain.
//
// @docspec:deterministic
func isRestyChainCall(expr ast.Expr) bool {
	// Look for pattern like client.R().SetXxx()... or resty.New().R()...
	switch e := expr.(type) {
	case *ast.CallExpr:
		if sel, ok := e.Fun.(*ast.SelectorExpr); ok {
			if sel.Sel.Name == "R" || sel.Sel.Name == "SetBody" ||
				sel.Sel.Name == "SetHeader" || sel.Sel.Name == "SetResult" {
				return true
			}
		}
		return isRestyChainCall(e.Fun)
	case *ast.SelectorExpr:
		return isRestyChainCall(e.X)
	}
	return false
}

// extractGRPCCalls looks for grpc.Dial or grpc.NewClient calls.
//
// @docspec:intentional "Detects grpc.Dial/DialContext/NewClient calls and extracts target address"
func extractGRPCCalls(body *ast.BlockStmt, owner string, ctx *ProcessorContext, seen map[string]bool) {
	ast.Inspect(body, func(n ast.Node) bool {
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

		if ident.Name != "grpc" {
			return true
		}

		if sel.Sel.Name != "Dial" && sel.Sel.Name != "DialContext" && sel.Sel.Name != "NewClient" {
			return true
		}

		target := "(dynamic target)"
		if len(call.Args) > 0 {
			if lit, ok := call.Args[0].(*ast.BasicLit); ok {
				target = strings.Trim(lit.Value, `"`)
			}
		}

		depName := "grpc-" + target
		if !seen[depName] {
			seen[depName] = true
			ctx.ExternalDeps = append(ctx.ExternalDeps, ExternalDependency{
				Name:    depName,
				BaseURL: target,
			})
		}

		return true
	})
}
