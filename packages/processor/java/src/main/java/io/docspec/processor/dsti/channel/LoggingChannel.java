package io.docspec.processor.dsti.channel;

import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Channel 12: Logging.
 * Detects logger method calls ({@code log}, {@code debug}, {@code info},
 * {@code warn}, {@code error}, {@code trace}).
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
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        if (methodTree == null) return;

        String methodSource = getMethodSource(methodTree);
        int logStatements = 0;

        Matcher logMatcher = LOG_PATTERN.matcher(methodSource);
        while (logMatcher.find()) {
            logStatements++;
        }

        if (logStatements > 0) {
            signals.setLogStatements(logStatements);
        }
    }
}
