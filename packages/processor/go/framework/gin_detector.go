// Package framework detects Go web frameworks.
//
// @docspec:module {
//   id: "docspec-go-framework",
//   name: "Framework Detectors",
//   description: "Detects Go web frameworks and ORMs by inspecting go.mod for known dependency paths, enabling framework-specific extraction without compile-time dependencies.",
//   since: "3.0.0"
// }
package framework

import (
	"os"
	"path/filepath"
	"strings"
)

// DetectGin checks if Gin framework is used.
//
// @docspec:boundary "framework detection without compile deps"
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func DetectGin(sourceDir string) bool {
	goMod := filepath.Join(sourceDir, "go.mod")
	data, err := os.ReadFile(goMod)
	if err != nil {
		return false
	}
	return strings.Contains(string(data), "github.com/gin-gonic/gin")
}
