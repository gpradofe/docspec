package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class CrossRefModel {

    private String sourceQualified;
    private String targetArtifact;
    private String targetFlow;
    private String targetStep;
    private String targetMember;
    private String description;

    public String getSourceQualified() {
        return sourceQualified;
    }

    public void setSourceQualified(String sourceQualified) {
        this.sourceQualified = sourceQualified;
    }

    public String getTargetArtifact() {
        return targetArtifact;
    }

    public void setTargetArtifact(String targetArtifact) {
        this.targetArtifact = targetArtifact;
    }

    public String getTargetFlow() {
        return targetFlow;
    }

    public void setTargetFlow(String targetFlow) {
        this.targetFlow = targetFlow;
    }

    public String getTargetStep() {
        return targetStep;
    }

    public void setTargetStep(String targetStep) {
        this.targetStep = targetStep;
    }

    public String getTargetMember() {
        return targetMember;
    }

    public void setTargetMember(String targetMember) {
        this.targetMember = targetMember;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
