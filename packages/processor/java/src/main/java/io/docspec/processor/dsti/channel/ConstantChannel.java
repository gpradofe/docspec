package io.docspec.processor.dsti.channel;

import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Channel 11: Assertions (Constant).
 * Detects assert statements from the AST and assertion-style method calls
 * ({@code check*}, {@code require*}, {@code verify*}) from the method source.
 * Sets the assertions count on signals.
 */
public class ConstantChannel extends AbstractTreesChannel {

    private static final Pattern ASSERTION_CALL_PATTERN = Pattern.compile(
            "\\b(check[A-Z]\\w*|require[A-Z]\\w*|verify[A-Z]\\w*)\\s*\\(");

    @Override
    public String channelName() {
        return "assertions";
    }

    @Override
    public int channelNumber() {
        return 11;
    }

    @Override
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        if (methodTree == null) return;

        int assertions = 0;

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

        if (assertions > 0) {
            signals.setAssertions(assertions);
        }
    }
}
