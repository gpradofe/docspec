// Package scanner discovers Go source files.
//
// @docspec:module {
//   id: "docspec-go-scanner",
//   name: "Source Scanner",
//   description: "Discovers and parses all Go source files in a directory tree, skipping vendor, testdata, hidden directories, and test files.",
//   since: "3.0.0"
// }
package scanner

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

// ScanDir parses all Go source files in a directory tree.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Walks the directory tree, filters Go source files, and parses them into AST with comments preserved"
func ScanDir(dir string, fset *token.FileSet) ([]*ast.File, error) {
	var files []*ast.File

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			name := info.Name()
			if name == "vendor" || name == "testdata" || strings.HasPrefix(name, ".") {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}

		f, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
		if err != nil {
			return nil // Skip unparseable files
		}
		files = append(files, f)
		return nil
	})

	return files, err
}
