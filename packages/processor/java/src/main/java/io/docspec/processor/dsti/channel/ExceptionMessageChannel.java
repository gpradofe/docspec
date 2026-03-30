package io.docspec.processor.dsti.channel;

import io.docspec.annotation.*;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.AnnotationMirror;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.VariableElement;

@DocBoundary("Channel 10: Null Checks. Counts null check patterns such as != null, == null, Objects.requireNonNull, Optional.ofNullable from source. Falls back to counting @NonNull/@Nullable annotations when Trees is unavailable.")
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
    public boolean requiresTrees() {
        // Works without Trees via annotation-based fallback
        return false;
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        int nullChecks = 0;

        if (methodTree != null) {
            // AST-based: scan method source for null-related patterns
            String methodSource = getMethodSource(methodTree);

            nullChecks += countOccurrences(methodSource, "!= null");
            nullChecks += countOccurrences(methodSource, "== null");
            nullChecks += countOccurrences(methodSource, "Objects.requireNonNull");
            nullChecks += countOccurrences(methodSource, "Optional.ofNullable");
            nullChecks += countOccurrences(methodSource, "Optional.of(");
            nullChecks += countOccurrences(methodSource, "Preconditions.checkNotNull");
            nullChecks += countOccurrences(methodSource, "Objects.nonNull");
            nullChecks += countOccurrences(methodSource, "Objects.isNull");
        } else {
            // Fallback: count @NonNull, @Nullable, @Nonnull annotations on parameters
            // These indicate the developer is thinking about nullability
            for (VariableElement param : method.getParameters()) {
                for (AnnotationMirror am : param.getAnnotationMirrors()) {
                    String annotName = am.getAnnotationType().asElement().getSimpleName().toString();
                    if ("NonNull".equals(annotName) || "Nonnull".equals(annotName)
                            || "Nullable".equals(annotName) || "NotNull".equals(annotName)) {
                        nullChecks++;
                    }
                }
            }

            // Also check return type annotations
            for (AnnotationMirror am : method.getAnnotationMirrors()) {
                String annotName = am.getAnnotationType().asElement().getSimpleName().toString();
                if ("NonNull".equals(annotName) || "Nonnull".equals(annotName)
                        || "Nullable".equals(annotName) || "NotNull".equals(annotName)) {
                    nullChecks++;
                }
            }

            // Optional return type implies null awareness
            String returnTypeName = method.getReturnType().toString();
            if (returnTypeName.contains("Optional")) {
                nullChecks++;
            }
        }

        if (nullChecks > 0) {
            signals.setNullChecks(nullChecks);
        }
    }
}
