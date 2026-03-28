package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class MemberDependencyModel {

    private String name;
    private String type;
    private String classification;
    private String injectionMechanism;
    private boolean required = true;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getClassification() {
        return classification;
    }

    public void setClassification(String classification) {
        this.classification = classification;
    }

    public String getInjectionMechanism() {
        return injectionMechanism;
    }

    public void setInjectionMechanism(String injectionMechanism) {
        this.injectionMechanism = injectionMechanism;
    }

    public boolean isRequired() {
        return required;
    }

    public void setRequired(boolean required) {
        this.required = required;
    }
}
