package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.AnnotationMirror;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Channel 11: Assertions (Constant).
 * Detects assert statements from the AST and assertion-style method calls
 * ({@code check*}, {@code require*}, {@code verify*}) from the method source.
 * Falls back to detecting assertion-related annotations when Trees is unavailable.
 * Sets the assertions count on signals.
 */
public class ConstantChannel extends AbstractTreesChannel {

    private static final Pattern ASSERTION_CALL_PATTERN = Pattern.compile(
            "\\b(check[A-Z]\\w*|require[A-Z]\\w*|verify[A-Z]\\w*|assert[A-Z]\\w*|Preconditions\\.\\w+|Assert\\.\\w+|Assertions\\.\\w+)\\s*\\(");

    @Override
    public String channelName() {
        return "assertions";
    }

    @Override
    public int channelNumber() {
        return 11;
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
        int assertions = 0;

        if (methodTree != null) {
            // Detect assert statements from AST
            List<?> stmts = getStatements(methodTree);
            for (Object stmt : stmts) {
                String stmtClassName = stmt.getClass().getSimpleName();
                if (stmtClassName.contains("Assert")) {
                    assertions++;
                }
            }

            // Detect assertion-style method calls from source
            String methodSource = getMethodSource(methodTree);
            Matcher assertionMatcher = ASSERTION_CALL_PATTERN.matcher(methodSource);
            while (assertionMatcher.find()) {
                assertions++;
            }
        } else {
            // Fallback: detect DocInvariant, DocDeterministic annotations as assertion proxies
            for (AnnotationMirror am : method.getAnnotationMirrors()) {
                String annotName = am.getAnnotationType().asElement().getSimpleName().toString();
                if ("DocInvariant".equals(annotName) || "DocDeterministic".equals(annotName)
                        || "DocPreserves".equals(annotName)) {
                    assertions++;
                }
            }

            // Naming heuristic: methods named validate*, verify*, check*, assert*, ensure*
            // inherently contain assertion logic
            String methodName = method.getSimpleName().toString();
            if (methodName.startsWith("validate") || methodName.startsWith("verify")
                    || methodName.startsWith("check") || methodName.startsWith("assert")
                    || methodName.startsWith("ensure") || methodName.startsWith("require")) {
                assertions++;
            }
        }

        if (assertions > 0) {
            signals.setAssertions(assertions);
        }
    }
}
