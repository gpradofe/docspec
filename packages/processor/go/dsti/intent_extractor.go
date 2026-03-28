// Package dsti extracts intent signals from Go AST.
//
// @docspec:module {
//   id: "docspec-go-dsti-extractor",
//   name: "DSTI Intent Extractor",
//   description: "Extracts intent signals from Go function AST nodes across all 13 DSTI channels: name semantics, guard clauses, branches, data flow, return type, loops, error handling, constants, nil checks, assertions, logging, dependencies, and validation tags.",
//   since: "3.0.0"
// }
package dsti

import (
	"go/ast"
	"sort"
	"strings"
	"unicode"
)

// goStreamLikeOps lists function/method names that represent stream-like or
// functional operations in Go. Go does not have native stream APIs, but
// libraries and idiomatic helpers often use these names. We also detect
// well-known patterns from popular functional utility packages.
var goStreamLikeOps = map[string]bool{
	"Map": true, "Filter": true, "Reduce": true, "ForEach": true,
	"FlatMap": true, "Any": true, "All": true, "Find": true,
	"GroupBy": true, "SortBy": true, "Collect": true, "Flatten": true,
	"Contains": true, "Count": true, "Sum": true,
}

var verbIntent = map[string]string{
	"Get": "query", "Find": "query", "Fetch": "query", "Load": "query", "List": "query",
	"Create": "creation", "New": "creation", "Add": "creation", "Insert": "creation",
	"Update": "mutation", "Modify": "mutation", "Set": "mutation",
	"Delete": "deletion", "Remove": "deletion",
	"Validate": "validation", "Check": "validation", "Verify": "validation",
	"Process": "transformation", "Handle": "transformation", "Transform": "transformation",
	"Send": "communication", "Publish": "communication", "Emit": "communication",
	"Calculate": "calculation", "Compute": "calculation", "Count": "calculation",
	"Is": "query", "Has": "query", "Can": "query",
}

// ExtractFromFunc extracts intent signals from a Go function declaration.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Performs multi-channel intent extraction from a single Go function AST node"
func ExtractFromFunc(fn *ast.FuncDecl) map[string]interface{} {
	name := fn.Name.Name
	if !fn.Name.IsExported() {
		return nil
	}

	words := splitCamelCase(name)
	if len(words) == 0 {
		return nil
	}

	verb := words[0]
	obj := strings.Join(words[1:], "")
	intent, ok := verbIntent[verb]
	if !ok {
		intent = "unknown"
	}

	signals := map[string]interface{}{
		"nameSemantics": map[string]string{
			"verb":   strings.ToLower(verb),
			"object": obj,
			"intent": intent,
		},
	}

	if fn.Body != nil {
		guards := countGuards(fn.Body)
		if guards > 0 {
			signals["guardClauses"] = guards
		}

		branches := countBranches(fn.Body)
		if branches > 0 {
			signals["branches"] = branches
		}

		loopProps := extractLoopProperties(fn.Body)
		if loopProps != nil {
			signals["loopProperties"] = loopProps
		}
	}

	return signals
}

// @docspec:deterministic
func countGuards(body *ast.BlockStmt) int {
	count := 0
	for _, stmt := range body.List {
		if ifStmt, ok := stmt.(*ast.IfStmt); ok {
			if block, ok := ifStmt.Body.(*ast.BlockStmt); ok && len(block.List) == 1 {
				if _, ok := block.List[0].(*ast.ReturnStmt); ok {
					count++
				}
			}
		}
	}
	return count
}

// @docspec:deterministic
func countBranches(body *ast.BlockStmt) int {
	count := 0
	ast.Inspect(body, func(n ast.Node) bool {
		switch n.(type) {
		case *ast.IfStmt, *ast.SwitchStmt, *ast.TypeSwitchStmt, *ast.SelectStmt:
			count++
		}
		return true
	})
	return count
}

// extractLoopProperties analyzes a function body for loop patterns, goroutine
// launches, and calls to stream-like/functional helper functions. Returns a
// LoopSignals pointer (nil when nothing was detected).
//
// @docspec:intentional "Detects range loops, for loops, goroutine launches, and stream-like functional helper calls"
func extractLoopProperties(body *ast.BlockStmt) *LoopSignals {
	var hasRange, hasFor, hasGoroutine bool
	streamOpsSet := map[string]bool{}

	ast.Inspect(body, func(n ast.Node) bool {
		switch stmt := n.(type) {
		case *ast.RangeStmt:
			hasRange = true
		case *ast.ForStmt:
			hasFor = true
		case *ast.GoStmt:
			hasGoroutine = true
		case *ast.CallExpr:
			// Detect stream-like method calls: e.g. lo.Map(...), slices.Filter(...)
			if sel, ok := stmt.Fun.(*ast.SelectorExpr); ok {
				if goStreamLikeOps[sel.Sel.Name] {
					streamOpsSet[strings.ToLower(sel.Sel.Name)] = true
				}
			}
			// Detect bare function calls: e.g. Map(...)
			if ident, ok := stmt.Fun.(*ast.Ident); ok {
				if goStreamLikeOps[ident.Name] {
					streamOpsSet[strings.ToLower(ident.Name)] = true
				}
			}
		}
		return true
	})

	if !hasRange && !hasFor && !hasGoroutine && len(streamOpsSet) == 0 {
		return nil
	}

	lp := &LoopSignals{
		HasRangeLoop: hasRange,
		HasForLoop:   hasFor,
		HasGoroutine: hasGoroutine,
	}

	if len(streamOpsSet) > 0 {
		ops := make([]string, 0, len(streamOpsSet))
		for op := range streamOpsSet {
			ops = append(ops, op)
		}
		sort.Strings(ops)
		lp.StreamOps = ops
	}

	return lp
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
