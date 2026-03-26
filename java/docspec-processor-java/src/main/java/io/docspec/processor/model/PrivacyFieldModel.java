package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class PrivacyFieldModel {

    private String field;
    private String piiType;
    private String retention;
    private String gdprBasis;
    private boolean encrypted;
    private boolean neverLog;
    private boolean neverReturn;
    private boolean maskedInResponses;

    public String getField() {
        return field;
    }

    public void setField(String field) {
        this.field = field;
    }

    public String getPiiType() {
        return piiType;
    }

    public void setPiiType(String piiType) {
        this.piiType = piiType;
    }

    public String getRetention() {
        return retention;
    }

    public void setRetention(String retention) {
        this.retention = retention;
    }

    public String getGdprBasis() {
        return gdprBasis;
    }

    public void setGdprBasis(String gdprBasis) {
        this.gdprBasis = gdprBasis;
    }

    public boolean isEncrypted() {
        return encrypted;
    }

    public void setEncrypted(boolean encrypted) {
        this.encrypted = encrypted;
    }

    public boolean isNeverLog() {
        return neverLog;
    }

    public void setNeverLog(boolean neverLog) {
        this.neverLog = neverLog;
    }

    public boolean isNeverReturn() {
        return neverReturn;
    }

    public void setNeverReturn(boolean neverReturn) {
        this.neverReturn = neverReturn;
    }

    public boolean isMaskedInResponses() {
        return maskedInResponses;
    }

    public void setMaskedInResponses(boolean maskedInResponses) {
        this.maskedInResponses = maskedInResponses;
    }
}
