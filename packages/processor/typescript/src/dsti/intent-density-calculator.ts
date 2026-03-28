/**
 * @docspec:module id="docspec-ts-isd-calculator" name="DSTI Intent Density Calculator"
 * @docspec:description "Calculates the Intent Signal Density (ISD) score for a method
 *   based on all 13 DSTI channels. Score ranges from 0.0 (no intent signals) to 1.0
 *   (maximum density). Uses weighted sum with standardized channel weights that are
 *   consistent across all 6 language implementations."
 * @docspec:boundary "processor-internal"
 * @docspec:since "3.0.0"
 * @docspec:deterministic true
 */
import type { ExtractedSignals } from "./intent-extractor.js";

/**
 * Calculates the Intent Signal Density (ISD) score for a method based on
 * the collected intent signals across all 13 channels. The score ranges
 * from 0.0 (no intent signals) to 1.0 (maximum intent density).
 *
 * Port of the Java IntentDensityCalculator to TypeScript.
 *
 * ISD formula (weights sum to 1.0):
 *   ISD = w1*nameSemantics + w2*guardClauses + w3*branches + w4*dataFlow
 *       + w5*returnType + w6*loops + w7*errorHandling + w8*constants
 *       + w9*nullChecks + w10*assertions + w11*logging + w12*dependencies
 *       + w13*validationAnnotations
 */

// Channel weights (sum = 1.0)
const W_NAME_SEMANTICS = 0.15;
const W_GUARD_CLAUSES = 0.10;
const W_BRANCHES = 0.10;
const W_DATA_FLOW = 0.05;
const W_RETURN_TYPE = 0.05;
const W_LOOPS = 0.08;
const W_ERROR_HANDLING = 0.10;
const W_CONSTANTS = 0.05;
const W_NULL_CHECKS = 0.07;
const W_ASSERTIONS = 0.07;
const W_LOGGING = 0.05;
const W_DEPENDENCIES = 0.08;
const W_VALIDATION_ANNOTATIONS = 0.05;

export class IntentDensityCalculator {
  /**
   * Calculates the ISD score for the given intent signals.
   *
   * @param signals the collected intent signals for a method
   * @returns a score between 0.0 and 1.0
   */
  calculate(signals: ExtractedSignals): number {
    let score = 0.0;

    // Channel 1: Name semantics (0 or W_NAME_SEMANTICS)
    if (signals.nameSemantics?.intent && signals.nameSemantics.intent !== "unknown") {
      score += W_NAME_SEMANTICS;
    }

    // Channel 2: Guard clauses (scaled up to W_GUARD_CLAUSES)
    if (signals.guardClauses && signals.guardClauses > 0) {
      score += Math.min(W_GUARD_CLAUSES, signals.guardClauses * 0.035);
    }

    // Channel 3: Branches (scaled up to W_BRANCHES)
    if (signals.branches && signals.branches > 0) {
      score += Math.min(W_BRANCHES, signals.branches * 0.025);
    }

    // Channel 4: Data flow (0 or W_DATA_FLOW)
    if (signals.dataFlow) {
      const hasReads = signals.dataFlow.reads && signals.dataFlow.reads.length > 0;
      const hasWrites = signals.dataFlow.writes && signals.dataFlow.writes.length > 0;
      if (hasReads && hasWrites) {
        score += W_DATA_FLOW;
      } else if (hasReads || hasWrites) {
        score += W_DATA_FLOW * 0.5;
      }
    }

    // Channel 5: Return type (inferred from verb intent)
    // Query/creation/transformation verbs imply non-void return, adding signal density
    if (signals.nameSemantics?.intent) {
      const intent = signals.nameSemantics.intent;
      if (intent === "query" || intent === "creation" || intent === "transformation") {
        score += W_RETURN_TYPE;
      }
    }

    // Channel 6: Loop properties (up to W_LOOPS)
    if (signals.loopProperties) {
      let loopScore = 0.0;
      if (signals.loopProperties.hasStreams) loopScore += W_LOOPS * 0.6;
      if (signals.loopProperties.hasEnhancedFor) loopScore += W_LOOPS * 0.4;
      score += Math.min(W_LOOPS, loopScore);
    }

    // Channel 7: Error handling (scaled up to W_ERROR_HANDLING)
    if (signals.errorHandling && signals.errorHandling.catchBlocks > 0) {
      score += Math.min(W_ERROR_HANDLING, signals.errorHandling.catchBlocks * 0.035);
    }

    // Channel 8: Constants (scaled up to W_CONSTANTS)
    if (signals.constants && signals.constants.length > 0) {
      score += Math.min(W_CONSTANTS, signals.constants.length * 0.015);
    }

    // Channel 9: Null checks (scaled up to W_NULL_CHECKS)
    if (signals.nullChecks && signals.nullChecks > 0) {
      score += Math.min(W_NULL_CHECKS, signals.nullChecks * 0.02);
    }

    // Channel 10: Assertions (scaled up to W_ASSERTIONS)
    if (signals.assertions && signals.assertions > 0) {
      score += Math.min(W_ASSERTIONS, signals.assertions * 0.025);
    }

    // Channel 11: Logging (scaled up to W_LOGGING)
    if (signals.logStatements && signals.logStatements > 0) {
      score += Math.min(W_LOGGING, signals.logStatements * 0.02);
    }

    // Channel 12: Dependencies (scaled up to W_DEPENDENCIES)
    if (signals.dependencies && signals.dependencies.length > 0) {
      score += Math.min(W_DEPENDENCIES, signals.dependencies.length * 0.025);
    }

    // Channel 13: Validation annotations
    if (signals.validationAnnotations && signals.validationAnnotations > 0) {
      score += Math.min(W_VALIDATION_ANNOTATIONS, signals.validationAnnotations * 0.02);
    }

    return Math.min(1.0, score);
  }

  /**
   * Returns the weight configuration for external inspection / testing.
   */
  getWeights(): Record<string, number> {
    return {
      nameSemantics: W_NAME_SEMANTICS,
      guardClauses: W_GUARD_CLAUSES,
      branches: W_BRANCHES,
      dataFlow: W_DATA_FLOW,
      returnType: W_RETURN_TYPE,
      loops: W_LOOPS,
      errorHandling: W_ERROR_HANDLING,
      constants: W_CONSTANTS,
      nullChecks: W_NULL_CHECKS,
      assertions: W_ASSERTIONS,
      logging: W_LOGGING,
      dependencies: W_DEPENDENCIES,
      validationAnnotations: W_VALIDATION_ANNOTATIONS,
    };
  }
}
