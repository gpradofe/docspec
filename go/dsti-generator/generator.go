// Package generator generates Go test files from DSTI intent signals.
//
// @docspec:module {
//   id: "docspec-go-dsti-generator",
//   name: "DSTI Test Generator",
//   description: "Generates Go test stubs from DSTI intent graph JSON, producing guard clause tests and property-based tests (via rapid) derived from extracted intent signals.",
//   since: "3.0.0"
// }
package generator

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// GeneratedTestFile represents a generated test file.
// @docspec:intentional "Captures the output of test generation: file path, content, and test category"
type GeneratedTestFile struct {
	Path     string
	Content  string
	TestType string
}

// GoTestGenerator generates Go test files.
//
// @docspec:boundary "DSTI-to-test-code generation"
// @docspec:intentional "Transforms DSTI intent signals into executable Go test stubs"
type GoTestGenerator struct {
	OutputDir string
}

// NewGoTestGenerator creates a new generator.
//
// @docspec:deterministic
func NewGoTestGenerator(outputDir string) *GoTestGenerator {
	return &GoTestGenerator{OutputDir: outputDir}
}

// Generate produces test files from intent graph JSON.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Parses intent graph JSON and dispatches to guard test and property test generators based on signal presence"
func (g *GoTestGenerator) Generate(intentGraphJSON []byte) ([]GeneratedTestFile, error) {
	var graph struct {
		Methods []struct {
			Qualified     string                 `json:"qualified"`
			IntentSignals map[string]interface{} `json:"intentSignals"`
		} `json:"methods"`
	}

	if err := json.Unmarshal(intentGraphJSON, &graph); err != nil {
		return nil, fmt.Errorf("parse intent graph: %w", err)
	}

	var files []GeneratedTestFile

	for _, method := range graph.Methods {
		signals := method.IntentSignals
		qualified := method.Qualified

		// Guard tests
		if gc, ok := signals["guardClauses"]; ok {
			if count, ok := gc.(float64); ok && count > 0 {
				files = append(files, generateGuardTest(qualified, int(count), g.OutputDir))
			}
		}

		// Property tests
		if ns, ok := signals["nameSemantics"].(map[string]interface{}); ok {
			if intent, ok := ns["intent"].(string); ok {
				file := generatePropertyTest(qualified, intent, g.OutputDir)
				if file != nil {
					files = append(files, *file)
				}
			}
		}
	}

	return files, nil
}

// @docspec:intentional "Generates guard clause test stubs from DSTI guardClauses signal count"
func generateGuardTest(qualified string, guardCount int, outputDir string) GeneratedTestFile {
	parts := strings.SplitN(qualified, "#", 2)
	typeName := "Unknown"
	methodName := "Unknown"
	if len(parts) >= 1 {
		typeParts := strings.Split(parts[0], ".")
		typeName = typeParts[len(typeParts)-1]
	}
	if len(parts) >= 2 {
		methodName = parts[1]
	}

	fileName := fmt.Sprintf("%s_%s_guard_test.go", strings.ToLower(typeName), strings.ToLower(methodName))

	var tests strings.Builder
	for i := 0; i < guardCount; i++ {
		tests.WriteString(fmt.Sprintf(`
func Test%s%s_Guard%d(t *testing.T) {
	// Given: input violating guard condition %d
	// When/Then: expect panic or error
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic for guard condition %d")
		}
	}()
	// TODO: Call %s with invalid input
}
`, typeName, methodName, i+1, i+1, i+1, methodName))
	}

	content := fmt.Sprintf(`package generated

import "testing"

// Guard clause tests for %s#%s.
// Auto-generated from DSTI intent signals.
%s`, typeName, methodName, tests.String())

	return GeneratedTestFile{
		Path:     filepath.Join(outputDir, fileName),
		Content:  content,
		TestType: "guard",
	}
}

// @docspec:intentional "Generates property-based test stubs using rapid from DSTI nameSemantics.intent"
func generatePropertyTest(qualified, intent, outputDir string) *GeneratedTestFile {
	parts := strings.SplitN(qualified, "#", 2)
	typeName := "Unknown"
	methodName := "Unknown"
	if len(parts) >= 1 {
		typeParts := strings.Split(parts[0], ".")
		typeName = typeParts[len(typeParts)-1]
	}
	if len(parts) >= 2 {
		methodName = parts[1]
	}

	fileName := fmt.Sprintf("%s_%s_property_test.go", strings.ToLower(typeName), strings.ToLower(methodName))

	var test string
	switch intent {
	case "query":
		test = fmt.Sprintf(`
func Test%s%s_Idempotent(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		input := rapid.String().Draw(t, "input")
		// result1 := sut.%s(input)
		// result2 := sut.%s(input)
		// assert result1 == result2
		_ = input
	})
}`, typeName, methodName, methodName, methodName)
	case "creation", "mutation":
		test = fmt.Sprintf(`
func Test%s%s_ChangesState(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		input := rapid.String().Draw(t, "input")
		// before := sut.GetState()
		// sut.%s(input)
		// after := sut.GetState()
		// assert before != after
		_ = input
	})
}`, typeName, methodName, methodName)
	default:
		return nil
	}

	content := fmt.Sprintf(`package generated

import (
	"testing"
	"pgregory.net/rapid"
)

// Property-based tests for %s#%s.
// Auto-generated from DSTI intent signals using rapid.
%s
`, typeName, methodName, test)

	return &GeneratedTestFile{
		Path:     filepath.Join(outputDir, fileName),
		Content:  content,
		TestType: "property",
	}
}
