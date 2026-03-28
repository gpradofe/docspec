package framework

import (
	"os"
	"path/filepath"
	"strings"
)

// DetectEcho checks if the Echo web framework is used by inspecting go.mod
// for the labstack/echo dependency.
//
// @docspec:boundary "framework detection without compile deps"
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func DetectEcho(sourceDir string) bool {
	goMod := filepath.Join(sourceDir, "go.mod")
	data, err := os.ReadFile(goMod)
	if err != nil {
		return false
	}
	return strings.Contains(string(data), "github.com/labstack/echo")
}
