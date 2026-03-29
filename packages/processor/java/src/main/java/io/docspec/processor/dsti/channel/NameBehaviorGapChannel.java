package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;

/**
 * Channel 4: Name-Behavior Gap.
 * Cross-references channel 1 (naming intent) and channel 2/3 (guard clauses/branches).
 * If the name says "validate" but no guards are found, flags a gap.
 * Does not require Trees (reads from already-populated signals).
 */
public class NameBehaviorGapChannel implements IntentChannel {

    @Override
    public String channelName() {
        return "name-behavior-gap";
    }

    @Override
    public int channelNumber() {
        return 4;
    }

    @Override
    public boolean requiresTrees() {
        return false;
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        IntentSignalsModel.NameSemanticsModel nameSemantics = signals.getNameSemantics();
        if (nameSemantics == null || nameSemantics.getIntent() == null) {
            return;
        }

        String intent = nameSemantics.getIntent();
        Integer guardClauses = signals.getGuardClauses();
        Integer branches = signals.getBranches();

        // If naming suggests validation but no guards or branches were found, flag data flow gap
        if ("validation".equals(intent)
                && (guardClauses == null || guardClauses == 0)
                && (branches == null || branches == 0)) {
            IntentSignalsModel.DataFlowModel dataFlow = signals.getDataFlow();
            if (dataFlow == null) {
                dataFlow = new IntentSignalsModel.DataFlowModel();
                signals.setDataFlow(dataFlow);
            }
            // Flag the gap by recording a synthetic read indicating missing validation body
            if (dataFlow.getReads().isEmpty()) {
                dataFlow.getReads().add("name-behavior-gap:validation-without-guards");
            }
        }
    }
}
