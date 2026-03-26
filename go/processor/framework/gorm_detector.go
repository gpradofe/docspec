package framework

import (
	"os"
	"path/filepath"
	"strings"
)

// DetectGorm checks if GORM ORM is used.
//
// @docspec:boundary "framework detection without compile deps"
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func DetectGorm(sourceDir string) bool {
	goMod := filepath.Join(sourceDir, "go.mod")
	data, err := os.ReadFile(goMod)
	if err != nil {
		return false
	}
	return strings.Contains(string(data), "gorm.io/gorm")
}
