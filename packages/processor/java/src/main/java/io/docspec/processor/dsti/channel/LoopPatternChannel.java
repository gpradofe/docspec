package io.docspec.processor.dsti.channel;

import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Channel 7: Loop Patterns.
 * Detects {@code .stream()}, {@code Stream.}, enhanced-for loops.
 * Sets loopProperties (hasStreams, hasEnhancedFor).
 * Also detects stream operations (filter, map, flatMap, distinct, sorted).
 */
public class LoopPatternChannel extends AbstractTreesChannel {

    private static final Pattern STREAM_OP_PATTERN = Pattern.compile(
            "\\.(filter|map|flatMap|distinct|sorted|reduce|collect|forEach|peek|limit|skip|anyMatch|allMatch|noneMatch|findFirst|findAny|toList|count|min|max)\\s*\\(");

    @Override
    public String channelName() {
        return "loop-patterns";
    }

    @Override
    public int channelNumber() {
        return 7;
    }

    @Override
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        if (methodTree == null) return;

        String methodSource = getMethodSource(methodTree);
        List<?> stmts = getStatements(methodTree);

        boolean hasStreams = false;
        boolean hasEnhancedFor = false;
        List<String> streamOps = new ArrayList<>();

        // Stream detection from method source
        if (methodSource.contains(".stream()") || methodSource.contains("Stream.")) {
            hasStreams = true;
        }

        // Enhanced for loop detection from AST statements
        for (Object stmt : stmts) {
            String stmtClassName = stmt.getClass().getSimpleName();
            if (stmtClassName.contains("EnhancedForLoop")) {
                hasEnhancedFor = true;
            }
        }

        // Detect specific stream operations
        if (hasStreams) {
            Matcher streamOpMatcher = STREAM_OP_PATTERN.matcher(methodSource);
            while (streamOpMatcher.find()) {
                String op = streamOpMatcher.group(1);
                if (!streamOps.contains(op)) {
                    streamOps.add(op);
                }
            }
        }

        if (hasStreams || hasEnhancedFor) {
            IntentSignalsModel.LoopPropertiesModel loopProps = new IntentSignalsModel.LoopPropertiesModel();
            loopProps.setHasStreams(hasStreams ? true : null);
            loopProps.setHasEnhancedFor(hasEnhancedFor ? true : null);
            if (!streamOps.isEmpty()) {
                loopProps.setStreamOps(streamOps);
            }
            signals.setLoopProperties(loopProps);
        }
    }
}
