package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class IntentMethodModel {

    private String qualified;
    private IntentSignalsModel intentSignals;

    public String getQualified() {
        return qualified;
    }

    public void setQualified(String qualified) {
        this.qualified = qualified;
    }

    public IntentSignalsModel getIntentSignals() {
        return intentSignals;
    }

    public void setIntentSignals(IntentSignalsModel intentSignals) {
        this.intentSignals = intentSignals;
    }
}
