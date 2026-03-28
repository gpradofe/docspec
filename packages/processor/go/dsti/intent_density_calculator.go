// @docspec:module {
//   id: "docspec-go-dsti-calculator",
//   name: "DSTI Intent Density Calculator",
//   description: "Computes the Intent Signal Density (ISD) score from 13 weighted channels, producing a normalized 0.0-1.0 metric that quantifies how well a function's intent is captured.",
//   since: "3.0.0"
// }
package dsti

import (
	"math"
)

// IntentDensityCalculator computes the Intent Signal Density (ISD) score for a
// function based on collected intent signals across all 13 channels. The score
// ranges from 0.0 (no intent signals) to 1.0 (maximum intent density).
//
// @docspec:boundary "pure calculation without side effects"
// @docspec:invariant { rules: ["score >= 0.0", "score <= 1.0", "channel weights sum to 1.0"] }
//
// ISD formula (weights sum to 1.0):
//
//	ISD = w1*nameSemantics + w2*guardClauses + w3*branches + w4*dataFlow
//	    + w5*returnType + w6*loops + w7*errorHandling + w8*constants
//	    + w9*nilChecks + w10*assertions + w11*logging + w12*dependencies
//	    + w13*validationTags
//
// This mirrors the Java IntentDensityCalculator class.
type IntentDensityCalculator struct{}

// Channel weights (sum = 1.0).
const (
	wNameSemantics       = 0.15
	wGuardClauses        = 0.10
	wBranches            = 0.10
	wDataFlow            = 0.05
	wReturnType          = 0.05
	wLoops               = 0.08
	wErrorHandling       = 0.10
	wConstants           = 0.05
	wNilChecks           = 0.07
	wAssertions          = 0.07
	wLogging             = 0.05
	wDependencies        = 0.08
	wValidationTags      = 0.05
)

// IntentSignals holds all the signal data collected from analyzing a function.
// @docspec:intentional "Aggregates all 13 DSTI channel signals for a single function"
type IntentSignals struct {
	// Channel 1: Parsed name semantics
	NameSemantics *NameSemantics `json:"nameSemantics,omitempty"`

	// Channel 2: Number of guard clauses (if err != nil { return })
	GuardClauses int `json:"guardClauses,omitempty"`

	// Channel 3: Number of branching statements (if, switch, select)
	Branches int `json:"branches,omitempty"`

	// Channel 4: Data flow analysis
	DataFlow *DataFlowSignals `json:"dataFlow,omitempty"`

	// Channel 5: Return type complexity (inferred from verb)
	// Handled implicitly via NameSemantics

	// Channel 6: Loop properties
	LoopProperties *LoopSignals `json:"loopProperties,omitempty"`

	// Channel 7: Error handling (defer/recover, error checks)
	ErrorHandling *ErrorHandlingSignals `json:"errorHandling,omitempty"`

	// Channel 8: Constants referenced in the function
	Constants []string `json:"constants,omitempty"`

	// Channel 9: Nil checks count
	NilChecks int `json:"nilChecks,omitempty"`

	// Channel 10: Assertions count (testing assertions, panic calls)
	Assertions int `json:"assertions,omitempty"`

	// Channel 11: Log statements count
	LogStatements int `json:"logStatements,omitempty"`

	// Channel 12: External dependencies referenced
	Dependencies []string `json:"dependencies,omitempty"`

	// Channel 13: Validation tags/patterns count
	ValidationTags int `json:"validationAnnotations,omitempty"`
}

// DataFlowSignals tracks variable reads and writes within a function.
type DataFlowSignals struct {
	Reads  []string `json:"reads,omitempty"`
	Writes []string `json:"writes,omitempty"`
}

// LoopSignals tracks loop usage patterns.
type LoopSignals struct {
	HasRangeLoop bool     `json:"hasRangeLoop,omitempty"`
	HasForLoop   bool     `json:"hasForLoop,omitempty"`
	HasGoroutine bool     `json:"hasGoroutine,omitempty"`
	StreamOps    []string `json:"streamOps,omitempty"`
}

// ErrorHandlingSignals tracks error handling patterns.
type ErrorHandlingSignals struct {
	// Number of error check blocks (if err != nil)
	ErrorChecks int `json:"errorChecks,omitempty"`

	// Whether defer/recover is used
	HasRecover bool `json:"hasRecover,omitempty"`
}

// Calculate computes the ISD score for the given intent signals.
// Returns a value between 0.0 and 1.0.
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
// @docspec:preserves fields="signals"
func (c *IntentDensityCalculator) Calculate(signals *IntentSignals) float64 {
	if signals == nil {
		return 0.0
	}

	score := 0.0

	// Channel 1: Name semantics (0 or wNameSemantics)
	if signals.NameSemantics != nil && signals.NameSemantics.Intent != "" &&
		signals.NameSemantics.Intent != "unknown" {
		score += wNameSemantics
	}

	// Channel 2: Guard clauses (scaled up to wGuardClauses)
	if signals.GuardClauses > 0 {
		score += math.Min(wGuardClauses, float64(signals.GuardClauses)*0.035)
	}

	// Channel 3: Branches (scaled up to wBranches)
	if signals.Branches > 0 {
		score += math.Min(wBranches, float64(signals.Branches)*0.025)
	}

	// Channel 4: Data flow (0 or wDataFlow)
	if signals.DataFlow != nil {
		hasReads := len(signals.DataFlow.Reads) > 0
		hasWrites := len(signals.DataFlow.Writes) > 0
		if hasReads && hasWrites {
			score += wDataFlow
		} else if hasReads || hasWrites {
			score += wDataFlow * 0.5
		}
	}

	// Channel 5: Return type (implicit from name semantics)
	if signals.NameSemantics != nil && signals.NameSemantics.Intent != "" {
		intent := signals.NameSemantics.Intent
		if intent == "query" || intent == "creation" || intent == "transformation" {
			score += wReturnType
		}
	}

	// Channel 6: Loop properties (up to wLoops)
	if signals.LoopProperties != nil {
		loopScore := 0.0
		if signals.LoopProperties.HasGoroutine {
			loopScore += wLoops * 0.3
		}
		if signals.LoopProperties.HasRangeLoop {
			loopScore += wLoops * 0.3
		}
		if signals.LoopProperties.HasForLoop {
			loopScore += wLoops * 0.2
		}
		if len(signals.LoopProperties.StreamOps) > 0 {
			loopScore += math.Min(wLoops*0.2, float64(len(signals.LoopProperties.StreamOps))*0.01)
		}
		score += math.Min(wLoops, loopScore)
	}

	// Channel 7: Error handling (scaled up to wErrorHandling)
	if signals.ErrorHandling != nil {
		ehScore := 0.0
		if signals.ErrorHandling.ErrorChecks > 0 {
			ehScore += math.Min(wErrorHandling*0.7, float64(signals.ErrorHandling.ErrorChecks)*0.025)
		}
		if signals.ErrorHandling.HasRecover {
			ehScore += wErrorHandling * 0.3
		}
		score += math.Min(wErrorHandling, ehScore)
	}

	// Channel 8: Constants (scaled up to wConstants)
	if len(signals.Constants) > 0 {
		score += math.Min(wConstants, float64(len(signals.Constants))*0.015)
	}

	// Channel 9: Nil checks (scaled up to wNilChecks)
	if signals.NilChecks > 0 {
		score += math.Min(wNilChecks, float64(signals.NilChecks)*0.02)
	}

	// Channel 10: Assertions (scaled up to wAssertions)
	if signals.Assertions > 0 {
		score += math.Min(wAssertions, float64(signals.Assertions)*0.025)
	}

	// Channel 11: Logging (scaled up to wLogging)
	if signals.LogStatements > 0 {
		score += math.Min(wLogging, float64(signals.LogStatements)*0.02)
	}

	// Channel 12: Dependencies (scaled up to wDependencies)
	if len(signals.Dependencies) > 0 {
		score += math.Min(wDependencies, float64(len(signals.Dependencies))*0.025)
	}

	// Channel 13: Validation tags (scaled up to wValidationTags)
	if signals.ValidationTags > 0 {
		score += math.Min(wValidationTags, float64(signals.ValidationTags)*0.02)
	}

	return math.Min(1.0, score)
}

// Categorize returns a human-readable category for the ISD score.
//
// @docspec:method { since: "3.0.0" }
// @docspec:deterministic
func Categorize(score float64) string {
	switch {
	case score >= 0.8:
		return "high"
	case score >= 0.5:
		return "medium"
	case score >= 0.2:
		return "low"
	default:
		return "minimal"
	}
}
