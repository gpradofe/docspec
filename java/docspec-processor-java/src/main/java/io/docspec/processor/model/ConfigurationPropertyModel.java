package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ConfigurationPropertyModel {

    private String key;
    private String type;

    @JsonProperty("default")
    private String defaultValue;

    private String description;
    private String source;
    private List<String> usedBy = new ArrayList<>();
    private List<String> affectsFlow = new ArrayList<>();
    private ValidRangeModel validRange;
    private String environment;
    private String affectsStep;

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDefaultValue() {
        return defaultValue;
    }

    public void setDefaultValue(String defaultValue) {
        this.defaultValue = defaultValue;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public List<String> getUsedBy() {
        return usedBy;
    }

    public void setUsedBy(List<String> usedBy) {
        this.usedBy = usedBy;
    }

    public List<String> getAffectsFlow() {
        return affectsFlow;
    }

    public void setAffectsFlow(List<String> affectsFlow) {
        this.affectsFlow = affectsFlow;
    }

    public ValidRangeModel getValidRange() {
        return validRange;
    }

    public void setValidRange(ValidRangeModel validRange) {
        this.validRange = validRange;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getAffectsStep() {
        return affectsStep;
    }

    public void setAffectsStep(String affectsStep) {
        this.affectsStep = affectsStep;
    }
}
