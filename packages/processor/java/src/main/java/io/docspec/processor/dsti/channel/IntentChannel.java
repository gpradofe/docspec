package io.docspec.processor.dsti.channel;

import io.docspec.annotation.*;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;

@DocBoundary("Interface for individual DSTI intent extraction channels. Each channel analyzes one specific aspect of method behavior. Channels are independent and can be enabled/disabled for ablation studies.")
public interface IntentChannel {
    @DocMethod("Human-readable channel name, e.g. naming or guard-clauses")
    String channelName();

    @DocMethod("Channel number 1-13 per the DSTI specification")
    int channelNumber();

    @DocMethod("Whether this channel requires the com.sun.source.util.Trees API for AST analysis")
    boolean requiresTrees();

    @DocMethod(value = "Extracts intent signals from the given method and merges them into the signals model",
               params = {
                   @Param(name = "method", value = "The method to analyze"),
                   @Param(name = "owner", value = "The enclosing type"),
                   @Param(name = "trees", value = "The Trees instance, may be null if requiresTrees returns false"),
                   @Param(name = "methodTree", value = "The method tree representation from Trees.getTree, may be null"),
                   @Param(name = "env", value = "The processing environment"),
                   @Param(name = "signals", value = "The signals model to populate, merge into without overwriting other channels")
               })
    void extract(ExecutableElement method, TypeElement owner,
                 Object trees, Object methodTree,
                 ProcessingEnvironment env, IntentSignalsModel signals);
}
