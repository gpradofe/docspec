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
	"path/filepath"
	"regexp"
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

		// Collect invariant rules
		var invariantRules []string
		if rules, ok := signals["invariantRules"].([]interface{}); ok {
			for _, r := range rules {
				if ruleStr, ok := r.(string); ok {
					invariantRules = append(invariantRules, ruleStr)
				}
			}
		}

		// Property tests
		if ns, ok := signals["nameSemantics"].(map[string]interface{}); ok {
			if intent, ok := ns["intent"].(string); ok {
				file := generatePropertyTest(qualified, intent, g.OutputDir, invariantRules)
				if file != nil {
					files = append(files, *file)
				}
			}
		} else if len(invariantRules) > 0 {
			file := generatePropertyTest(qualified, "", g.OutputDir, invariantRules)
			if file != nil {
				files = append(files, *file)
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

// @docspec:intentional "Generates property-based test stubs using rapid from DSTI nameSemantics.intent and @DocInvariant rules"
func generatePropertyTest(qualified, intent, outputDir string, invariantRules []string) *GeneratedTestFile {
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
	}

	// Generate invariant rule tests from @DocInvariant Property DSL expressions
	for _, rule := range invariantRules {
		assertion := mapDslToGoAssertion(rule)
		safeName := sanitizeGoName(rule)
		test += fmt.Sprintf(`
func Test%s%s_Invariant_%s(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		input := rapid.String().Draw(t, "input")
		result := sut.%s(input)
		%s
		_ = result
	})
}`, typeName, methodName, safeName, methodName, assertion)
	}

	if test == "" {
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

// sanitizeGoName converts a DSL expression to a valid Go identifier fragment.
func sanitizeGoName(s string) string {
	re := regexp.MustCompile(`[^a-zA-Z0-9]+`)
	result := re.ReplaceAllString(s, "_")
	result = strings.Trim(result, "_")
	return result
}

// toGoAccessor converts a dotted field path to a Go accessor, mapping "output" to "result".
func toGoAccessor(field string) string {
	parts := strings.Split(field, ".")
	for i, part := range parts {
		if i == 0 && part == "output" {
			parts[i] = "result"
		} else if i > 0 && len(part) > 0 {
			parts[i] = strings.ToUpper(part[:1]) + part[1:]
		}
	}
	return strings.Join(parts, ".")
}

// mapDslToGoAssertion maps a Property DSL expression to a Go assertion string.
//
// Supports NOT_NULL, NOT_EMPTY, NOT_BLANK, SIZE, IN, BETWEEN, RANGE,
// MATCHES, comparison operators, and monotonicity patterns.
//
// @docspec:deterministic
func mapDslToGoAssertion(expression string) string {
	expr := strings.TrimSpace(expression)

	// RANGE shorthand: field RANGE min..max
	rangeRe := regexp.MustCompile(`(?i)^(.+)\s+RANGE\s+(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$`)
	if m := rangeRe.FindStringSubmatch(expr); m != nil {
		accessor := toGoAccessor(strings.TrimSpace(m[1]))
		return fmt.Sprintf("if %s < %s || %s > %s { t.Errorf(\"expected %s in range [%s, %s]\") }", accessor, m[2], accessor, m[3], accessor, m[2], m[3])
	}

	// Monotonicity: field UP/DOWN -> field UP/DOWN
	monoRe := regexp.MustCompile(`^(.+)\s+(UP|DOWN)\s*[→\->]+\s*(.+)\s+(UP|DOWN)$`)
	if m := monoRe.FindStringSubmatch(expr); m != nil {
		outputAccessor := toGoAccessor(strings.TrimSpace(m[3]))
		cmp := ">="
		if m[4] != "UP" {
			cmp = "<="
		}
		return fmt.Sprintf("baseline := %s\n\t\t// Increase %s and verify %s moves %s\n\t\tif !(%s %s baseline) { t.Errorf(\"monotonicity violated\") }", outputAccessor, strings.TrimSpace(m[1]), strings.TrimSpace(m[3]), m[4], outputAccessor, cmp)
	}

	// NOT_NULL
	notNullRe := regexp.MustCompile(`(?i)^(\S+)\s+NOT_NULL$`)
	if m := notNullRe.FindStringSubmatch(expr); m != nil {
		accessor := toGoAccessor(m[1])
		return fmt.Sprintf("if %s == nil { t.Fatal(\"expected non-nil\") }", accessor)
	}

	// NOT_EMPTY
	notEmptyRe := regexp.MustCompile(`(?i)^(\S+)\s+NOT_EMPTY$`)
	if m := notEmptyRe.FindStringSubmatch(expr); m != nil {
		accessor := toGoAccessor(m[1])
		return fmt.Sprintf("if len(%s) == 0 { t.Fatal(\"expected non-empty\") }", accessor)
	}

	// NOT_BLANK
	notBlankRe := regexp.MustCompile(`(?i)^(\S+)\s+NOT_BLANK$`)
	if m := notBlankRe.FindStringSubmatch(expr); m != nil {
		accessor := toGoAccessor(m[1])
		return fmt.Sprintf("if strings.TrimSpace(%s) == \"\" { t.Fatal(\"expected non-blank\") }", accessor)
	}

	// SIZE comparison
	sizeRe := regexp.MustCompile(`(?i)^(\S+)\s+SIZE\s*(>=?|<=?|==|!=)\s*(-?\d+(?:\.\d+)?)$`)
	if m := sizeRe.FindStringSubmatch(expr); m != nil {
		accessor := toGoAccessor(m[1])
		if m[2] == ">" && m[3] == "0" {
			return fmt.Sprintf("if len(%s) == 0 { t.Fatal(\"expected non-empty\") }", accessor)
		}
		return fmt.Sprintf("if !(len(%s) %s %s) { t.Fatalf(\"expected len %s %s\") }", accessor, m[2], m[3], m[2], m[3])
	}

	// IN [values]
	inRe := regexp.MustCompile(`(?i)^(\S+)\s+IN\s*\[(.+)]$`)
	if m := inRe.FindStringSubmatch(expr); m != nil {
		accessor := toGoAccessor(m[1])
		vals := strings.Split(m[2], ",")
		var conditions []string
		for _, v := range vals {
			trimmed := strings.Trim(strings.TrimSpace(v), "\"'")
			conditions = append(conditions, fmt.Sprintf("%s == \"%s\"", accessor, trimmed))
		}
		return fmt.Sprintf("if !(%s) { t.Fatal(\"expected value in set\") }", strings.Join(conditions, " || "))
	}

	// BETWEEN min AND max
	betweenRe := regexp.MustCompile(`(?i)^(\S+)\s+BETWEEN\s+(-?\d+(?:\.\d+)?)\s+AND\s+(-?\d+(?:\.\d+)?)$`)
	if m := betweenRe.FindStringSubmatch(expr); m != nil {
		accessor := toGoAccessor(m[1])
		return fmt.Sprintf("if %s < %s || %s > %s { t.Errorf(\"expected %s in range [%s, %s]\") }", accessor, m[2], accessor, m[3], accessor, m[2], m[3])
	}

	// MATCHES pattern
	matchesRe := regexp.MustCompile(`(?i)^(\S+)\s+MATCHES\s+(.+)$`)
	if m := matchesRe.FindStringSubmatch(expr); m != nil {
		accessor := toGoAccessor(m[1])
		pattern := strings.Trim(strings.TrimSpace(m[2]), "\"'")
		return fmt.Sprintf("if matched, _ := regexp.MatchString(`%s`, %s); !matched { t.Fatal(\"pattern mismatch\") }", pattern, accessor)
	}

	// Comparison: >=, <=, !=, ==, >, <
	compRe := regexp.MustCompile(`^(\S+)\s*(>=|<=|!=|==|>|<)\s*(.+)$`)
	if m := compRe.FindStringSubmatch(expr); m != nil {
		accessor := toGoAccessor(m[1])
		return fmt.Sprintf("if !(%s %s %s) { t.Fatalf(\"expected %s %s %s\") }", accessor, m[2], strings.TrimSpace(m[3]), accessor, m[2], strings.TrimSpace(m[3]))
	}

	return fmt.Sprintf("// Property: %s", expression)
}
