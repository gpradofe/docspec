package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import javax.lang.model.type.TypeKind;
import java.util.List;

/**
 * Channel 3: Branch Structure.
 * Counts if-statements (branches) from the Trees AST when available.
 * Falls back to heuristic branch estimation from method signature when Trees is unavailable:
 * methods returning boolean or Optional, or having multiple parameters, likely contain branches.
 */
public class BranchStructureChannel extends AbstractTreesChannel {

    @Override
    public String channelName() {
        return "branch-structure";
    }

    @Override
    public int channelNumber() {
        return 3;
    }

    @Override
    public boolean requiresTrees() {
        // Works without Trees via signature-based heuristics
        return false;
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        int branches = 0;

        if (methodTree != null) {
            // AST-based: count if-statements from tree
            List<?> stmts = getStatements(methodTree);
            for (Object stmt : stmts) {
                String stmtClassName = stmt.getClass().getSimpleName();
                if (stmtClassName.contains("If")) {
                    branches++;
                }
                // Also count switch statements as branching
                if (stmtClassName.contains("Switch")) {
                    branches++;
                }
                // Ternary expressions in variable declarations also indicate branching
                if (stmtClassName.contains("Variable") || stmtClassName.contains("ExpressionStatement")) {
                    String stmtStr = stmt.toString();
                    if (stmtStr.contains(" ? ") && stmtStr.contains(" : ")) {
                        branches++;
                    }
                }
            }

            // Also scan full method source for branches in nested blocks
            String methodSource = getMethodSource(methodTree);
            int ifCount = countKeywordOccurrences(methodSource, "if ");
            int switchCount = countKeywordOccurrences(methodSource, "switch ");
            int ternaryCount = countTernaryOps(methodSource);
            int deepBranches = ifCount + switchCount + ternaryCount;
            // Use the higher of the two counts (AST top-level vs source deep)
            branches = Math.max(branches, deepBranches);
        } else {
            // Heuristic fallback: estimate branches from method signature
            // Boolean return type implies conditional logic
            String returnTypeName = method.getReturnType().toString();
            if (method.getReturnType().getKind() == TypeKind.BOOLEAN
                    || "java.lang.Boolean".equals(returnTypeName) || "Boolean".equals(returnTypeName)) {
                branches += 1;
            }

            // Optional return suggests null-check branching
            if (returnTypeName.contains("Optional")) {
                branches += 1;
            }

            // Declared exceptions suggest error-path branching
            if (!method.getThrownTypes().isEmpty()) {
                branches += method.getThrownTypes().size();
            }

            // Multiple parameters often correlate with conditional logic
            if (method.getParameters().size() >= 3) {
                branches += 1;
            }
        }

        if (branches > 0) {
            signals.setBranches(branches);
        }
    }

    /**
     * Counts occurrences of a keyword followed by space/paren in source code.
     * Simple heuristic that avoids matching inside string literals in most cases.
     */
    private int countKeywordOccurrences(String source, String keyword) {
        int count = 0;
        int idx = 0;
        while ((idx = source.indexOf(keyword, idx)) != -1) {
            // Verify it's at a word boundary (not part of a larger identifier)
            if (idx == 0 || !Character.isLetterOrDigit(source.charAt(idx - 1))) {
                count++;
            }
            idx += keyword.length();
        }
        return count;
    }

    /**
     * Counts ternary operator occurrences (? :) in method source.
     */
    private int countTernaryOps(String source) {
        int count = 0;
        int idx = 0;
        while ((idx = source.indexOf(" ? ", idx)) != -1) {
            // Check there's a matching colon after
            int colonIdx = source.indexOf(" : ", idx + 3);
            if (colonIdx != -1) {
                count++;
            }
            idx += 3;
        }
        return count;
    }
}
