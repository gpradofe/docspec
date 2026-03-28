package framework

import (
	"os"
	"path/filepath"
	"strings"
)

// DetectFiber checks if the Fiber web framework is used by inspecting go.mod
// for the gofiber/fiber dependency.
//
// @docspec:boundary "framework detection without compile deps"
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func DetectFiber(sourceDir string) bool {
	goMod := filepath.Join(sourceDir, "go.mod")
	data, err := os.ReadFile(goMod)
	if err != nil {
		return false
	}
	return strings.Contains(string(data), "github.com/gofiber/fiber")
}
