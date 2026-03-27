package io.docspec.processor.dsti.channel;

import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import java.util.ArrayList;
import java.util.List;

/**
 * Channel 8: Error Handling.
 * Counts try/catch blocks and extracts caught exception types.
 * Sets the errorHandling model on signals.
 */
public class ErrorHandlingChannel extends AbstractTreesChannel {

    @Override
    public String channelName() {
        return "error-handling";
    }

    @Override
    public int channelNumber() {
        return 8;
    }

    @Override
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        if (methodTree == null) return;

        List<?> stmts = getStatements(methodTree);
        int catchBlocks = 0;
        List<String> caughtTypes = new ArrayList<>();

        for (Object stmt : stmts) {
            String stmtClassName = stmt.getClass().getSimpleName();

            if (stmtClassName.contains("Try")) {
                try {
                    java.lang.reflect.Method getCatches = stmt.getClass().getMethod("getCatches");
                    Object catches = getCatches.invoke(stmt);
                    if (catches instanceof List<?> catchList) {
                        catchBlocks += catchList.size();
                        for (Object catchClause : catchList) {
                            try {
                                java.lang.reflect.Method getParameter = catchClause.getClass().getMethod("getParameter");
                                Object param = getParameter.invoke(catchClause);
                                if (param != null) {
                                    java.lang.reflect.Method getType = param.getClass().getMethod("getType");
                                    Object type = getType.invoke(param);
                                    if (type != null) {
                                        caughtTypes.add(type.toString());
                                    }
                                }
                            } catch (Exception ignored) {
                                // Skip if we cannot extract catch parameter type
                            }
                        }
                    }
                } catch (Exception ignored) {
                    // Try block analysis failed
                }
            }
        }

        if (catchBlocks > 0) {
            IntentSignalsModel.ErrorHandlingModel errorHandling = new IntentSignalsModel.ErrorHandlingModel();
            errorHandling.setCatchBlocks(catchBlocks);
            if (!caughtTypes.isEmpty()) {
                errorHandling.setCaughtTypes(caughtTypes);
            }
            signals.setErrorHandling(errorHandling);
        }
    }
}
