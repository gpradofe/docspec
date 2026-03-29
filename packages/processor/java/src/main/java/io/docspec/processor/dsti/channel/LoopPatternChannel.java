package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.VariableElement;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Channel 7: Loop Patterns.
 * Detects {@code .stream()}, {@code Stream.}, enhanced-for loops from Trees AST.
 * Falls back to parameter/return type analysis when Trees is unavailable:
 * collection parameters or return types suggest iteration.
 * Sets loopProperties (hasStreams, hasEnhancedFor, streamOps).
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
    public boolean requiresTrees() {
        // Works without Trees via type-based heuristics
        return false;
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        boolean hasStreams = false;
        boolean hasEnhancedFor = false;
        List<String> streamOps = new ArrayList<>();

        if (methodTree != null) {
            String methodSource = getMethodSource(methodTree);
            List<?> stmts = getStatements(methodTree);

            // Stream detection from method source
            if (methodSource.contains(".stream()") || methodSource.contains("Stream.")
                    || methodSource.contains(".parallelStream()") || methodSource.contains("StreamSupport.")) {
                hasStreams = true;
            }

            // Enhanced for loop detection from AST statements
            for (Object stmt : stmts) {
                String stmtClassName = stmt.getClass().getSimpleName();
                if (stmtClassName.contains("EnhancedForLoop")) {
                    hasEnhancedFor = true;
                }
                // Also check for traditional for loops
                if (stmtClassName.contains("ForLoop") && !stmtClassName.contains("Enhanced")) {
                    hasEnhancedFor = true; // treat any loop as iteration signal
                }
                // While loops
                if (stmtClassName.contains("While")) {
                    hasEnhancedFor = true;
                }
            }

            // Also scan source for for/while keywords in nested blocks
            if (!hasEnhancedFor) {
                if (methodSource.contains("for (") || methodSource.contains("for(")
                        || methodSource.contains("while (") || methodSource.contains("while(")) {
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
        } else {
            // Fallback: infer iteration from parameter and return types
            // Collection/array parameters suggest the method iterates over them
            for (VariableElement param : method.getParameters()) {
                String typeName = param.asType().toString();
                if (isCollectionType(typeName)) {
                    hasEnhancedFor = true;
                    break;
                }
            }

            // Stream return type implies stream processing
            String returnTypeName = method.getReturnType().toString();
            if (returnTypeName.contains("Stream")) {
                hasStreams = true;
            }
            // Collection return types may also imply iteration in the body
            if (!hasEnhancedFor && isCollectionType(returnTypeName)) {
                hasEnhancedFor = true;
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

    private boolean isCollectionType(String typeName) {
        return typeName.contains("List") || typeName.contains("Collection")
                || typeName.contains("Set") || typeName.contains("Map")
                || typeName.contains("Iterable") || typeName.contains("Iterator")
                || typeName.contains("Stream") || typeName.contains("[]")
                || typeName.contains("Queue") || typeName.contains("Deque");
    }
}
