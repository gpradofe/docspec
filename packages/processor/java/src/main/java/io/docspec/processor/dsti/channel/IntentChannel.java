package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocBoundary;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;

/**
 * Interface for individual DSTI intent extraction channels.
 * Each channel analyzes one specific aspect of method behavior.
 * Channels are independent and can be enabled/disabled for ablation studies.
 */
@DocBoundary("DSTI channel interface")
public interface IntentChannel {
    /** Human-readable channel name (e.g., "naming", "guard-clauses"). */
    String channelName();

    /** Channel number (1-13) per the DSTI specification. */
    int channelNumber();

    /** Whether this channel requires the com.sun.source.util.Trees API for AST analysis. */
    boolean requiresTrees();

    /**
     * Extract intent signals from the given method and merge them into the signals model.
     *
     * @param method     the method to analyze
     * @param owner      the enclosing type
     * @param trees      the Trees instance (may be null if requiresTrees() returns false)
     * @param methodTree the method's tree representation from Trees.getTree() (may be null)
     * @param env        the processing environment
     * @param signals    the signals model to populate (merge into, do not overwrite other channels)
     */
    void extract(ExecutableElement method, TypeElement owner,
                 Object trees, Object methodTree,
                 ProcessingEnvironment env, IntentSignalsModel signals);
}
