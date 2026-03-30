package io.docspec.processor.dsti.channel;

import io.docspec.annotation.*;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import javax.lang.model.type.TypeMirror;
import java.util.ArrayList;
import java.util.List;

@DocBoundary("Channel 8: Error Handling. Counts try/catch blocks and extracts caught exception types from Trees AST. Falls back to declared thrown types when Trees is unavailable.")
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
    public boolean requiresTrees() {
        // Works without Trees via declared thrown types fallback
        return false;
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        int catchBlocks = 0;
        List<String> caughtTypes = new ArrayList<>();

        if (methodTree != null) {
            // AST-based: scan for try/catch blocks
            List<?> stmts = getStatements(methodTree);
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

            // Also scan source for throw statements (even without catch blocks, throwing is error handling)
            String methodSource = getMethodSource(methodTree);
            if (catchBlocks == 0 && methodSource.contains("throw ")) {
                catchBlocks = 1; // At minimum, the method throws exceptions
            }
        }

        // Fallback: use declared thrown types from method signature (always available)
        List<? extends TypeMirror> thrownTypes = method.getThrownTypes();
        if (!thrownTypes.isEmpty()) {
            for (TypeMirror thrownType : thrownTypes) {
                String typeName = thrownType.toString();
                // Simplify to just the class name
                if (typeName.contains(".")) {
                    typeName = typeName.substring(typeName.lastIndexOf('.') + 1);
                }
                if (!caughtTypes.contains(typeName)) {
                    caughtTypes.add(typeName);
                }
            }
            // If we had no catch blocks from AST, each thrown type implies at least
            // some error-handling logic in the method or its callers
            if (catchBlocks == 0) {
                catchBlocks = thrownTypes.size();
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
