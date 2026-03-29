package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.AnnotationMirror;
import javax.lang.model.element.AnnotationValue;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Channel 2: Guard Clauses.
 * Counts if-throw patterns in the method body as guard clauses.
 * Also counts {@code @DocIntentional} and {@code @DocPreserves} annotation-based guards.
 * Requires Trees for body analysis, but has an annotation-based fallback.
 */
public class GuardClauseChannel extends AbstractTreesChannel {

    private static final String DOC_INTENTIONAL = "io.docspec.annotation.DocIntentional";
    private static final String DOC_PRESERVES = "io.docspec.annotation.DocPreserves";

    @Override
    public String channelName() {
        return "guard-clauses";
    }

    @Override
    public int channelNumber() {
        return 2;
    }

    @Override
    public boolean requiresTrees() {
        // This channel works without Trees by falling back to annotation-based analysis.
        return false;
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        int guardClauses = 0;

        // Annotation-based guard clause detection
        AnnotationMirror intentional = findAnnotation(method, DOC_INTENTIONAL);
        if (intentional != null) {
            guardClauses++;
            List<String> preserves = getStringArrayValue(intentional, "preserves", env);
            if (preserves != null && !preserves.isEmpty()) {
                guardClauses += preserves.size();
            }
        }
        AnnotationMirror preservesMirror = findAnnotation(method, DOC_PRESERVES);
        if (preservesMirror != null) {
            List<String> fields = getStringArrayValue(preservesMirror, "fields", env);
            if (fields != null) {
                guardClauses += fields.size();
            }
        }

        // AST-based guard clause detection (if-throw patterns)
        int astGuards = 0;
        if (methodTree != null) {
            List<?> stmts = getStatements(methodTree);
            for (Object stmt : stmts) {
                String stmtClassName = stmt.getClass().getSimpleName();
                if (stmtClassName.contains("If") && isGuardClause(stmt)) {
                    astGuards++;
                }
            }
        }

        int total = guardClauses + astGuards;
        if (total > 0) {
            Integer existing = signals.getGuardClauses();
            signals.setGuardClauses((existing != null ? existing : 0) + total);
        } else {
            // Only set null if nothing was found and nothing was previously set
            if (signals.getGuardClauses() == null || signals.getGuardClauses() == 0) {
                signals.setGuardClauses(null);
            }
        }
    }

    /**
     * Heuristic: checks if a statement looks like a guard clause (if-then-throw).
     */
    private boolean isGuardClause(Object ifStmt) {
        try {
            java.lang.reflect.Method getThenStatement = ifStmt.getClass().getMethod("getThenStatement");
            Object thenStmt = getThenStatement.invoke(ifStmt);
            if (thenStmt != null) {
                String thenStr = thenStmt.toString();
                return thenStr.contains("throw ");
            }
        } catch (Exception ignored) {
            // Cannot determine
        }
        return false;
    }

    private AnnotationMirror findAnnotation(ExecutableElement element, String annotationQualifiedName) {
        for (AnnotationMirror mirror : element.getAnnotationMirrors()) {
            TypeElement annotationType = (TypeElement) mirror.getAnnotationType().asElement();
            if (annotationType.getQualifiedName().contentEquals(annotationQualifiedName)) {
                return mirror;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<String> getStringArrayValue(AnnotationMirror mirror, String key, ProcessingEnvironment env) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                env.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof List<?> list) {
                    List<String> result = new ArrayList<>();
                    for (Object item : list) {
                        if (item instanceof AnnotationValue av) {
                            result.add(av.getValue().toString());
                        }
                    }
                    return result.isEmpty() ? null : result;
                }
            }
        }
        return null;
    }
}
