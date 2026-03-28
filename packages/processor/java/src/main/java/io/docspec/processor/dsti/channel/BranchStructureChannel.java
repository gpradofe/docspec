package io.docspec.processor.dsti.channel;

import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import java.util.List;

/**
 * Channel 3: Branch Structure.
 * Counts if-statements (branches) from the Trees AST.
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
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        if (methodTree == null) return;

        List<?> stmts = getStatements(methodTree);
        int branches = 0;

        for (Object stmt : stmts) {
            String stmtClassName = stmt.getClass().getSimpleName();
            if (stmtClassName.contains("If")) {
                branches++;
            }
        }

        if (branches > 0) {
            signals.setBranches(branches);
        }
    }
}
