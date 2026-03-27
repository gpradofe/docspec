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
 * Channel 6: Assignment Patterns (Data Flow).
 * Traces data flow in the method body: builder patterns, constructor calls,
 * and assignment chains. Populates the data flow writes list.
 */
public class AssignmentPatternChannel extends AbstractTreesChannel {

    private static final Pattern BUILDER_PATTERN = Pattern.compile(
            "\\b(\\w+)\\.builder\\(\\)|new\\s+(\\w+)Builder\\b");
    private static final Pattern CONSTRUCTOR_PATTERN = Pattern.compile(
            "new\\s+([A-Z]\\w+)\\s*\\(");
    private static final Pattern ASSIGNMENT_PATTERN = Pattern.compile(
            "\\b(\\w+)\\s*=\\s*(?!null|true|false|\\d)");

    @Override
    public String channelName() {
        return "assignment-patterns";
    }

    @Override
    public int channelNumber() {
        return 6;
    }

    @Override
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        if (methodTree == null) return;

        String methodSource = getMethodSource(methodTree);
        List<String> writes = new ArrayList<>();

        // Detect builder patterns
        Matcher builderMatcher = BUILDER_PATTERN.matcher(methodSource);
        while (builderMatcher.find()) {
            String builder = builderMatcher.group(1) != null
                    ? builderMatcher.group(1) : builderMatcher.group(2);
            if (builder != null) {
                String entry = "builder:" + builder;
                if (!writes.contains(entry)) {
                    writes.add(entry);
                }
            }
        }

        // Detect constructor calls
        Matcher constructorMatcher = CONSTRUCTOR_PATTERN.matcher(methodSource);
        while (constructorMatcher.find()) {
            String type = constructorMatcher.group(1);
            String entry = "new:" + type;
            if (!writes.contains(entry)) {
                writes.add(entry);
            }
        }

        if (!writes.isEmpty()) {
            IntentSignalsModel.DataFlowModel dataFlow = signals.getDataFlow();
            if (dataFlow == null) {
                dataFlow = new IntentSignalsModel.DataFlowModel();
                signals.setDataFlow(dataFlow);
            }
            for (String write : writes) {
                if (!dataFlow.getWrites().contains(write)) {
                    dataFlow.getWrites().add(write);
                }
            }
        }
    }
}
