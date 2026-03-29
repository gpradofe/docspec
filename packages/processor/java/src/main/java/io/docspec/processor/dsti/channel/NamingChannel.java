package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocMethod;
import io.docspec.processor.dsti.NamingAnalyzer;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;

/**
 * Channel 1: Name Semantics.
 * Uses {@link NamingAnalyzer} to extract verb, object, and intent category
 * from the method name using camelCase conventions.
 */
public class NamingChannel implements IntentChannel {

    private final NamingAnalyzer namingAnalyzer;

    public NamingChannel(NamingAnalyzer namingAnalyzer) {
        this.namingAnalyzer = namingAnalyzer;
    }

    @Override
    public String channelName() {
        return "naming";
    }

    @Override
    public int channelNumber() {
        return 1;
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
        String methodName = method.getSimpleName().toString();
        NamingAnalyzer.NameSemantics semantics = namingAnalyzer.analyze(methodName);

        IntentSignalsModel.NameSemanticsModel nameModel = new IntentSignalsModel.NameSemanticsModel();
        nameModel.setVerb(semantics.verb());
        nameModel.setObject(semantics.object());
        nameModel.setIntent(semantics.intent());
        signals.setNameSemantics(nameModel);
    }
}
