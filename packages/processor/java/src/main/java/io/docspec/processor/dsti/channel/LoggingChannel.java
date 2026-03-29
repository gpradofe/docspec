package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.Element;
import javax.lang.model.element.ElementKind;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.VariableElement;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Channel 12: Logging.
 * Detects logger method calls ({@code log}, {@code debug}, {@code info},
 * {@code warn}, {@code error}, {@code trace}) from method source.
 * Falls back to detecting Logger-typed fields in the enclosing class when Trees is unavailable.
 * Sets the logStatements count on signals.
 */
public class LoggingChannel extends AbstractTreesChannel {

    private static final Pattern LOG_PATTERN = Pattern.compile(
            "\\b\\w+\\s*\\.\\s*(log|debug|info|warn|error|trace)\\s*\\(");

    @Override
    public String channelName() {
        return "logging";
    }

    @Override
    public int channelNumber() {
        return 12;
    }

    @Override
    public boolean requiresTrees() {
        // Works without Trees via field-type heuristic
        return false;
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        int logStatements = 0;

        if (methodTree != null) {
            // AST-based: scan method source for logger calls
            String methodSource = getMethodSource(methodTree);
            Matcher logMatcher = LOG_PATTERN.matcher(methodSource);
            while (logMatcher.find()) {
                logStatements++;
            }
        } else {
            // Fallback: if the enclosing class has a Logger-typed field,
            // assume at least 1 log statement per non-trivial method
            if (hasLoggerField(owner) && method.getParameters().size() > 0) {
                logStatements = 1;
            }
        }

        if (logStatements > 0) {
            signals.setLogStatements(logStatements);
        }
    }

    /**
     * Checks if the enclosing type has a field whose type looks like a logger.
     */
    private boolean hasLoggerField(TypeElement owner) {
        for (Element element : owner.getEnclosedElements()) {
            if (element.getKind() == ElementKind.FIELD && element instanceof VariableElement field) {
                String fieldType = field.asType().toString();
                if (fieldType.contains("Logger") || fieldType.contains("Log")
                        || fieldType.contains("Tracer")) {
                    return true;
                }
            }
        }
        return false;
    }
}
