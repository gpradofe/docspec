package io.docspec.processor.dsti.channel;

import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;

/**
 * Channel 10: Null Checks (Exception Messages).
 * Counts null check patterns ({@code != null}, {@code == null},
 * {@code Objects.requireNonNull}, {@code Optional.ofNullable}, {@code Optional.of}).
 * Sets the nullChecks count on signals.
 */
public class ExceptionMessageChannel extends AbstractTreesChannel {

    @Override
    public String channelName() {
        return "null-checks";
    }

    @Override
    public int channelNumber() {
        return 10;
    }

    @Override
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        if (methodTree == null) return;

        String methodSource = getMethodSource(methodTree);
        int nullChecks = 0;

        if (methodSource.contains("!= null")) {
            nullChecks += countOccurrences(methodSource, "!= null");
        }
        if (methodSource.contains("== null")) {
            nullChecks += countOccurrences(methodSource, "== null");
        }
        if (methodSource.contains("Objects.requireNonNull")) {
            nullChecks += countOccurrences(methodSource, "Objects.requireNonNull");
        }
        if (methodSource.contains("Optional.ofNullable")) {
            nullChecks += countOccurrences(methodSource, "Optional.ofNullable");
        }
        if (methodSource.contains("Optional.of(")) {
            nullChecks += countOccurrences(methodSource, "Optional.of(");
        }

        if (nullChecks > 0) {
            signals.setNullChecks(nullChecks);
        }
    }
}
