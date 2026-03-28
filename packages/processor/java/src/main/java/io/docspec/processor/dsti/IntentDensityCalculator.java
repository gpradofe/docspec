package io.docspec.processor.dsti;

import io.docspec.annotation.DocDeterministic;
import io.docspec.annotation.DocInvariant;
import io.docspec.processor.model.IntentSignalsModel;

/**
 * Calculates the Intent Signal Density (ISD) score for a method based on
 * the collected intent signals across all 13 channels. The score ranges
 * from 0.0 (no intent signals) to 1.0 (maximum intent density).
 *
 * <p>ISD formula (weights sum to 1.0):</p>
 * <pre>
 * ISD = w1*nameSemantics + w2*guardClauses + w3*branches + w4*dataFlow
 *     + w5*returnType + w6*loops + w7*errorHandling + w8*constants
 *     + w9*nullChecks + w10*assertions + w11*logging + w12*dependencies
 *     + w13*validationAnnotations
 * </pre>
 */
@DocInvariant(rules = {"score >= 0.0", "score <= 1.0", "channel weights sum to 1.0"})
public class IntentDensityCalculator {

    // Channel weights (sum = 1.0)
    private static final double W_NAME_SEMANTICS = 0.15;
    private static final double W_GUARD_CLAUSES = 0.10;
    private static final double W_BRANCHES = 0.10;
    private static final double W_DATA_FLOW = 0.05;
    private static final double W_RETURN_TYPE = 0.05;
    private static final double W_LOOPS = 0.08;
    private static final double W_ERROR_HANDLING = 0.10;
    private static final double W_CONSTANTS = 0.05;
    private static final double W_NULL_CHECKS = 0.07;
    private static final double W_ASSERTIONS = 0.07;
    private static final double W_LOGGING = 0.05;
    private static final double W_DEPENDENCIES = 0.08;
    private static final double W_VALIDATION_ANNOTATIONS = 0.05;

    /**
     * Calculates the ISD score for the given intent signals.
     *
     * @param signals the collected intent signals for a method
     * @return a score between 0.0 and 1.0
     */
    @DocDeterministic
    public double calculate(IntentSignalsModel signals) {
        double score = 0.0;

        // Channel 1: Name semantics (0 or W_NAME_SEMANTICS)
        if (signals.getNameSemantics() != null && signals.getNameSemantics().getIntent() != null
                && !"unknown".equals(signals.getNameSemantics().getIntent())) {
            score += W_NAME_SEMANTICS;
        }

        // Channel 2: Guard clauses (scaled up to W_GUARD_CLAUSES)
        if (signals.getGuardClauses() != null && signals.getGuardClauses() > 0) {
            score += Math.min(W_GUARD_CLAUSES, signals.getGuardClauses() * 0.035);
        }

        // Channel 3: Branches (scaled up to W_BRANCHES)
        if (signals.getBranches() != null && signals.getBranches() > 0) {
            score += Math.min(W_BRANCHES, signals.getBranches() * 0.025);
        }

        // Channel 4: Data flow (0 or W_DATA_FLOW)
        if (signals.getDataFlow() != null) {
            boolean hasReads = signals.getDataFlow().getReads() != null && !signals.getDataFlow().getReads().isEmpty();
            boolean hasWrites = signals.getDataFlow().getWrites() != null && !signals.getDataFlow().getWrites().isEmpty();
            if (hasReads && hasWrites) {
                score += W_DATA_FLOW;
            } else if (hasReads || hasWrites) {
                score += W_DATA_FLOW * 0.5;
            }
        }

        // Channel 5: Return type (implicit — presence of nameSemantics verb contributes)
        // Return type complexity is inferred from verb: query/creation verbs imply non-void
        if (signals.getNameSemantics() != null && signals.getNameSemantics().getVerb() != null) {
            String intent = signals.getNameSemantics().getIntent();
            if ("query".equals(intent) || "creation".equals(intent) || "transformation".equals(intent)) {
                score += W_RETURN_TYPE;
            }
        }

        // Channel 6: Loop properties (up to W_LOOPS)
        if (signals.getLoopProperties() != null) {
            double loopScore = 0.0;
            if (Boolean.TRUE.equals(signals.getLoopProperties().getHasStreams())) loopScore += W_LOOPS * 0.6;
            if (Boolean.TRUE.equals(signals.getLoopProperties().getHasEnhancedFor())) loopScore += W_LOOPS * 0.4;
            score += Math.min(W_LOOPS, loopScore);
        }

        // Channel 7: Error handling (scaled up to W_ERROR_HANDLING)
        if (signals.getErrorHandling() != null && signals.getErrorHandling().getCatchBlocks() != null
                && signals.getErrorHandling().getCatchBlocks() > 0) {
            score += Math.min(W_ERROR_HANDLING, signals.getErrorHandling().getCatchBlocks() * 0.035);
        }

        // Channel 8: Constants (scaled up to W_CONSTANTS)
        if (signals.getConstants() != null && !signals.getConstants().isEmpty()) {
            score += Math.min(W_CONSTANTS, signals.getConstants().size() * 0.015);
        }

        // Channel 9: Null checks (scaled up to W_NULL_CHECKS)
        if (signals.getNullChecks() > 0) {
            score += Math.min(W_NULL_CHECKS, signals.getNullChecks() * 0.02);
        }

        // Channel 10: Assertions (scaled up to W_ASSERTIONS)
        if (signals.getAssertions() > 0) {
            score += Math.min(W_ASSERTIONS, signals.getAssertions() * 0.025);
        }

        // Channel 11: Logging (scaled up to W_LOGGING)
        if (signals.getLogStatements() > 0) {
            score += Math.min(W_LOGGING, signals.getLogStatements() * 0.02);
        }

        // Channel 12: Dependencies (scaled up to W_DEPENDENCIES)
        if (signals.getDependencies() != null && !signals.getDependencies().isEmpty()) {
            score += Math.min(W_DEPENDENCIES, signals.getDependencies().size() * 0.025);
        }

        // Channel 13: Validation annotations (scaled up to W_VALIDATION_ANNOTATIONS)
        if (signals.getValidationAnnotations() > 0) {
            score += Math.min(W_VALIDATION_ANNOTATIONS, signals.getValidationAnnotations() * 0.02);
        }

        return Math.min(1.0, score);
    }
}
