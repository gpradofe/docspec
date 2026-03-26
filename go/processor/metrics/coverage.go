// Package metrics provides documentation coverage calculation for Go source code.
//
// @docspec:module {
//   id: "docspec-go-metrics",
//   name: "Coverage Metrics",
//   description: "Computes documentation coverage statistics for types, functions, and parameters, producing the discovery section of the DocSpec output.",
//   since: "3.0.0"
// }
package metrics

import (
	"math"
)

// CoverageCalculator computes documentation coverage statistics for a
// processed Go codebase. It tracks how many types, functions, and parameters
// have documentation, as well as how they were discovered (auto vs annotated).
//
// This is the Go equivalent of the Java CoverageCalculator which analyzes
// the DocSpec model and produces the discovery section of the output.
//
// @docspec:boundary "pure calculation without side effects"
// @docspec:intentional "Accumulates documentation coverage counters and produces a percentage-based report"
type CoverageCalculator struct {
	TotalTypes             int
	DocumentedTypes        int
	AutoDiscoveredTypes    int
	AnnotatedTypes         int
	InferredDescriptions   int
	TotalFunctions         int
	DocumentedFunctions    int
	TotalParams            int
	DocumentedParams       int
}

// DiscoveryStats represents the coverage output that goes into the
// discovery section of the DocSpec JSON.
type DiscoveryStats struct {
	Mode                 string   `json:"mode"`
	Frameworks           []string `json:"frameworks,omitempty"`
	ScannedPackages      []string `json:"scannedPackages,omitempty"`
	ExcludedPackages     []string `json:"excludedPackages,omitempty"`
	TotalTypes           int      `json:"totalClasses"`
	DocumentedTypes      int      `json:"documentedClasses"`
	AutoDiscoveredTypes  int      `json:"autoDiscoveredClasses"`
	AnnotatedTypes       int      `json:"annotatedClasses"`
	InferredDescriptions int      `json:"inferredDescriptions"`
	TotalFunctions       int      `json:"totalMethods"`
	DocumentedFunctions  int      `json:"documentedMethods"`
	TotalParams          int      `json:"totalParams"`
	DocumentedParams     int      `json:"documentedParams"`
	CoveragePercent      float64  `json:"coveragePercent"`
}

// TypeInfo holds the information needed to analyze a type's coverage.
type TypeInfo struct {
	HasDescription bool
	DiscoveredFrom string // "auto", "annotation", "framework"
}

// FunctionInfo holds the information needed to analyze a function's coverage.
type FunctionInfo struct {
	HasDescription bool
	Params         []ParamInfo
}

// ParamInfo holds the information needed to analyze a parameter's coverage.
type ParamInfo struct {
	HasDescription bool
}

// AnalyzeType records coverage data for a single type (struct, interface, etc.).
//
// @docspec:intentional "Increments type documentation counters based on discovery source and description presence"
func (c *CoverageCalculator) AnalyzeType(info TypeInfo) {
	c.TotalTypes++

	if info.HasDescription {
		c.DocumentedTypes++
	}

	switch info.DiscoveredFrom {
	case "annotation":
		c.AnnotatedTypes++
	case "auto", "framework":
		c.AutoDiscoveredTypes++
	}
}

// AnalyzeFunction records coverage data for a single function or method.
//
// @docspec:intentional "Increments function and parameter documentation counters"
func (c *CoverageCalculator) AnalyzeFunction(info FunctionInfo) {
	c.TotalFunctions++

	if info.HasDescription {
		c.DocumentedFunctions++
	}

	for _, param := range info.Params {
		c.TotalParams++
		if param.HasDescription {
			c.DocumentedParams++
		}
	}
}

// IncrementInferred increments the inferred descriptions counter.
//
// @docspec:intentional "Tracks descriptions that were auto-inferred rather than authored"
func (c *CoverageCalculator) IncrementInferred() {
	c.InferredDescriptions++
}

// CoveragePercent returns the overall type documentation coverage as a percentage.
// Returns 0 if there are no types.
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
// @docspec:invariant { rules: ["result >= 0.0", "result <= 100.0"] }
func (c *CoverageCalculator) CoveragePercent() float64 {
	if c.TotalTypes == 0 {
		return 0
	}
	return roundToOneDecimal(float64(c.DocumentedTypes) / float64(c.TotalTypes) * 100.0)
}

// FunctionCoveragePercent returns the function documentation coverage as a percentage.
// Returns 0 if there are no functions.
//
// @docspec:deterministic
func (c *CoverageCalculator) FunctionCoveragePercent() float64 {
	if c.TotalFunctions == 0 {
		return 0
	}
	return roundToOneDecimal(float64(c.DocumentedFunctions) / float64(c.TotalFunctions) * 100.0)
}

// ParamCoveragePercent returns the parameter documentation coverage as a percentage.
// Returns 0 if there are no parameters.
//
// @docspec:deterministic
func (c *CoverageCalculator) ParamCoveragePercent() float64 {
	if c.TotalParams == 0 {
		return 0
	}
	return roundToOneDecimal(float64(c.DocumentedParams) / float64(c.TotalParams) * 100.0)
}

// ToDiscoveryStats converts the accumulated coverage data into a DiscoveryStats
// struct suitable for JSON serialization.
//
// @docspec:method { since: "3.0.0" }
// @docspec:intentional "Transforms internal counters into the JSON-serializable DiscoveryStats structure"
func (c *CoverageCalculator) ToDiscoveryStats(mode string, frameworks, scannedPkgs, excludedPkgs []string) DiscoveryStats {
	return DiscoveryStats{
		Mode:                 mode,
		Frameworks:           frameworks,
		ScannedPackages:      scannedPkgs,
		ExcludedPackages:     excludedPkgs,
		TotalTypes:           c.TotalTypes,
		DocumentedTypes:      c.DocumentedTypes,
		AutoDiscoveredTypes:  c.AutoDiscoveredTypes,
		AnnotatedTypes:       c.AnnotatedTypes,
		InferredDescriptions: c.InferredDescriptions,
		TotalFunctions:       c.TotalFunctions,
		DocumentedFunctions:  c.DocumentedFunctions,
		TotalParams:          c.TotalParams,
		DocumentedParams:     c.DocumentedParams,
		CoveragePercent:      c.CoveragePercent(),
	}
}

// roundToOneDecimal rounds a float64 to one decimal place.
//
// @docspec:deterministic
func roundToOneDecimal(v float64) float64 {
	return math.Round(v*10.0) / 10.0
}
