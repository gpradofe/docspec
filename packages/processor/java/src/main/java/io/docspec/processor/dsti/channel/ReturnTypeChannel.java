package io.docspec.processor.dsti.channel;

import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import javax.lang.model.type.TypeKind;
import javax.lang.model.type.TypeMirror;
import java.util.ArrayList;
import java.util.List;

/**
 * Channel 5: Return Type.
 * Analyzes the method's return type for signals (Optional, List, void, etc.).
 * Populates data flow reads/writes based on return type characteristics.
 */
public class ReturnTypeChannel implements IntentChannel {

    @Override
    public String channelName() {
        return "return-type";
    }

    @Override
    public int channelNumber() {
        return 5;
    }

    @Override
    public boolean requiresTrees() {
        return false;
    }

    @Override
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        TypeMirror returnType = method.getReturnType();
        String returnTypeName = returnType.toString();

        List<String> reads = new ArrayList<>();

        if (returnType.getKind() == TypeKind.VOID) {
            reads.add("return:void");
        } else if (returnTypeName.contains("Optional")) {
            reads.add("return:optional");
        } else if (returnTypeName.contains("List") || returnTypeName.contains("Collection")
                || returnTypeName.contains("Set") || returnTypeName.contains("Iterable")) {
            reads.add("return:collection");
        } else if (returnTypeName.contains("Map")) {
            reads.add("return:map");
        } else if (returnTypeName.contains("CompletableFuture") || returnTypeName.contains("Mono")
                || returnTypeName.contains("Flux") || returnTypeName.contains("Publisher")) {
            reads.add("return:reactive");
        } else if (returnType.getKind().isPrimitive() || "java.lang.String".equals(returnTypeName)
                || "String".equals(returnTypeName)) {
            reads.add("return:scalar");
        } else {
            reads.add("return:object");
        }

        if (!reads.isEmpty()) {
            IntentSignalsModel.DataFlowModel dataFlow = signals.getDataFlow();
            if (dataFlow == null) {
                dataFlow = new IntentSignalsModel.DataFlowModel();
                signals.setDataFlow(dataFlow);
            }
            for (String read : reads) {
                if (!dataFlow.getReads().contains(read)) {
                    dataFlow.getReads().add(read);
                }
            }
        }
    }
}
