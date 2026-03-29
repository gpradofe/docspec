package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.VariableElement;
import javax.lang.model.type.TypeKind;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Channel 6: Assignment Patterns (Data Flow).
 * Traces data flow in the method body: builder patterns, constructor calls,
 * and assignment chains. Populates the data flow writes list.
 * Falls back to parameter type analysis when Trees is unavailable.
 */
public class AssignmentPatternChannel extends AbstractTreesChannel {

    private static final Pattern BUILDER_PATTERN = Pattern.compile(
            "\\b(\\w+)\\.builder\\(\\)|new\\s+(\\w+)Builder\\b");
    private static final Pattern CONSTRUCTOR_PATTERN = Pattern.compile(
            "new\\s+([A-Z]\\w+)\\s*\\(");

    @Override
    public String channelName() {
        return "assignment-patterns";
    }

    @Override
    public int channelNumber() {
        return 6;
    }

    @Override
    public boolean requiresTrees() {
        // Works without Trees via parameter-based heuristics
        return false;
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        List<String> writes = new ArrayList<>();

        if (methodTree != null) {
            String methodSource = getMethodSource(methodTree);

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

            // Detect assignment patterns (field writes)
            // Look for this.field = or field = patterns
            if (methodSource.contains("this.")) {
                Pattern fieldWrite = Pattern.compile("this\\.(\\w+)\\s*=");
                Matcher fieldMatcher = fieldWrite.matcher(methodSource);
                while (fieldMatcher.find()) {
                    String entry = "field:" + fieldMatcher.group(1);
                    if (!writes.contains(entry)) {
                        writes.add(entry);
                    }
                }
            }
        } else {
            // Fallback: infer data flow from method signature
            // void methods with parameters likely write/mutate state
            if (method.getReturnType().getKind() == TypeKind.VOID && !method.getParameters().isEmpty()) {
                for (VariableElement param : method.getParameters()) {
                    String typeName = param.asType().toString();
                    // Simplify type name
                    if (typeName.contains(".")) {
                        typeName = typeName.substring(typeName.lastIndexOf('.') + 1);
                    }
                    if (typeName.contains("<")) {
                        typeName = typeName.substring(0, typeName.indexOf('<'));
                    }
                    String entry = "param:" + typeName;
                    if (!writes.contains(entry)) {
                        writes.add(entry);
                    }
                }
            }

            // Methods named set*, add*, put*, insert*, etc. are clearly writes
            String methodName = method.getSimpleName().toString();
            if (methodName.startsWith("set") || methodName.startsWith("add")
                    || methodName.startsWith("put") || methodName.startsWith("insert")
                    || methodName.startsWith("save") || methodName.startsWith("store")
                    || methodName.startsWith("write") || methodName.startsWith("update")
                    || methodName.startsWith("push") || methodName.startsWith("register")) {
                if (writes.isEmpty()) {
                    writes.add("mutation:" + methodName);
                }
            }

            // Non-void return type with "create" or "build" naming implies writes
            if (method.getReturnType().getKind() != TypeKind.VOID) {
                if (methodName.startsWith("create") || methodName.startsWith("build")
                        || methodName.startsWith("make") || methodName.startsWith("construct")
                        || methodName.startsWith("generate") || methodName.startsWith("new")) {
                    String returnType = method.getReturnType().toString();
                    if (returnType.contains(".")) {
                        returnType = returnType.substring(returnType.lastIndexOf('.') + 1);
                    }
                    if (returnType.contains("<")) {
                        returnType = returnType.substring(0, returnType.indexOf('<'));
                    }
                    writes.add("new:" + returnType);
                }
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
