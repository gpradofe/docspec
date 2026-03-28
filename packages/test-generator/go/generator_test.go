// @docspec:module {
//   id: "docspec-go-dsti-generator-test",
//   name: "DSTI Test Generator Tests",
//   description: "Unit tests for the DSTI test generator, validating that guard clause tests and property-based tests are correctly generated from intent signals.",
//   since: "3.0.0"
// }
package generator

import "testing"

// @docspec:teststrategy value="unit" scenarios="guard test generation produces correct type and non-empty path"
func TestGenerateGuardTest(t *testing.T) {
	file := generateGuardTest("pkg.Service#Validate", 2, "tests")
	if file.TestType != "guard" {
		t.Errorf("Expected guard type, got %s", file.TestType)
	}
	if file.Path == "" {
		t.Error("Expected non-empty path")
	}
}
