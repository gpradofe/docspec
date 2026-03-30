package io.docspec.processor.dsti;

import io.docspec.annotation.*;
import io.docspec.processor.model.IntentSignalsModel;

@DocBoundary("Calculates the Intent Signal Density (ISD) score for a method based on collected intent signals across all 13 channels. Raw score ranges from 0.0 to 1.0, scaled to 0.0-10.0 for human readability. Uses weighted formula: ISD = w1*nameSemantics + w2*guardClauses + ... + w13*validationAnnotations.")
@DocInvariant(rules = {"score >= 0.0", "score <= 10.0", "channel weights sum to 1.0"})
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

    @DocDeterministic
    @DocMethod(value = "Calculates the ISD score for the given intent signals on a 0.0-10.0 scale where higher values indicate richer intent signal density",
               since = "3.0.0",
               params = {@Param(name = "signals", value = "The collected intent signals for a method")},
               returns = "A score between 0.0 and 10.0")
    @DocExample(title = "Compute ISD score from intent signals",
        language = "java",
        code = "IntentDensityCalculator calc = new IntentDensityCalculator();\nIntentSignalsModel signals = new IntentSignalsModel();\n// ... populate signals from 13 channels ...\ndouble score = calc.calculate(signals);\n// score ranges from 0.0 (no signals) to 10.0 (maximum density)")
    public double calculate(IntentSignalsModel signals) {
        double score = 0.0;

        // Channel 1: Name semantics (0 or W_NAME_SEMANTICS)
        // Contributes fully if the naming channel produced a non-unknown intent
        if (signals.getNameSemantics() != null && signals.getNameSemantics().getIntent() != null
                && !"unknown".equals(signals.getNameSemantics().getIntent())) {
            score += W_NAME_SEMANTICS;
        }

        // Channel 2: Guard clauses (scaled up to W_GUARD_CLAUSES)
        if (signals.getGuardClauses() != null && signals.getGuardClauses() > 0) {
            score += Math.min(W_GUARD_CLAUSES, signals.getGuardClauses() * 0.05);
        }

        // Channel 3: Branches (scaled up to W_BRANCHES)
        if (signals.getBranches() != null && signals.getBranches() > 0) {
            score += Math.min(W_BRANCHES, signals.getBranches() * 0.04);
        }

        // Channel 4: Data flow (up to W_DATA_FLOW)
        if (signals.getDataFlow() != null) {
            boolean hasReads = signals.getDataFlow().getReads() != null && !signals.getDataFlow().getReads().isEmpty();
            boolean hasWrites = signals.getDataFlow().getWrites() != null && !signals.getDataFlow().getWrites().isEmpty();
            if (hasReads && hasWrites) {
                score += W_DATA_FLOW;
            } else if (hasReads || hasWrites) {
                score += W_DATA_FLOW * 0.6;
            }
        }

        // Channel 5: Return type (up to W_RETURN_TYPE)
        // First check if the ReturnTypeChannel populated dataFlow.reads with return:* entries
        boolean hasReturnTypeSignal = false;
        if (signals.getDataFlow() != null && signals.getDataFlow().getReads() != null) {
            for (String read : signals.getDataFlow().getReads()) {
                if (read != null && read.startsWith("return:")) {
                    hasReturnTypeSignal = true;
                    // Non-void return types are more informative
                    if (!"return:void".equals(read)) {
                        score += W_RETURN_TYPE;
                    } else {
                        // Void still contributes partially (it tells us mutation intent)
                        score += W_RETURN_TYPE * 0.4;
                    }
                    break;
                }
            }
        }
        // Fallback: if no return type signal from the channel, infer from naming intent
        if (!hasReturnTypeSignal && signals.getNameSemantics() != null && signals.getNameSemantics().getIntent() != null) {
            String intent = signals.getNameSemantics().getIntent();
            if ("query".equals(intent) || "creation".equals(intent) || "transformation".equals(intent)
                    || "predicate".equals(intent)) {
                score += W_RETURN_TYPE * 0.6;
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
            score += Math.min(W_ERROR_HANDLING, signals.getErrorHandling().getCatchBlocks() * 0.05);
        }

        // Channel 8: Constants (scaled up to W_CONSTANTS)
        if (signals.getConstants() != null && !signals.getConstants().isEmpty()) {
            score += Math.min(W_CONSTANTS, signals.getConstants().size() * 0.02);
        }

        // Channel 9: Null checks (scaled up to W_NULL_CHECKS)
        if (signals.getNullChecks() > 0) {
            score += Math.min(W_NULL_CHECKS, signals.getNullChecks() * 0.03);
        }

        // Channel 10: Assertions (scaled up to W_ASSERTIONS)
        if (signals.getAssertions() > 0) {
            score += Math.min(W_ASSERTIONS, signals.getAssertions() * 0.035);
        }

        // Channel 11: Logging (scaled up to W_LOGGING)
        if (signals.getLogStatements() > 0) {
            score += Math.min(W_LOGGING, signals.getLogStatements() * 0.025);
        }

        // Channel 12: Dependencies (scaled up to W_DEPENDENCIES)
        if (signals.getDependencies() != null && !signals.getDependencies().isEmpty()) {
            score += Math.min(W_DEPENDENCIES, signals.getDependencies().size() * 0.035);
        }

        // Channel 13: Validation annotations (scaled up to W_VALIDATION_ANNOTATIONS)
        if (signals.getValidationAnnotations() > 0) {
            score += Math.min(W_VALIDATION_ANNOTATIONS, signals.getValidationAnnotations() * 0.025);
        }

        // Scale to 0.0–10.0 range for human readability
        return Math.min(10.0, Math.round(score * 10.0 * 100.0) / 100.0);
    }
}
