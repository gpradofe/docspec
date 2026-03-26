package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class FlowStepModel {

    private String id;
    private String name;
    private String actor;
    private String actorQualified;
    private String description;
    private String type = "process";
    private String retryTarget;
    private boolean ai = false;
    private List<String> inputs = new ArrayList<>();
    private List<String> outputs = new ArrayList<>();
    private List<FlowStepDataStoreOpModel> dataStoreOps = new ArrayList<>();
    private List<String> configDependencies = new ArrayList<>();
    private FlowStepObservabilityModel observability;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getActor() {
        return actor;
    }

    public void setActor(String actor) {
        this.actor = actor;
    }

    public String getActorQualified() {
        return actorQualified;
    }

    public void setActorQualified(String actorQualified) {
        this.actorQualified = actorQualified;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getRetryTarget() {
        return retryTarget;
    }

    public void setRetryTarget(String retryTarget) {
        this.retryTarget = retryTarget;
    }

    public boolean isAi() {
        return ai;
    }

    public void setAi(boolean ai) {
        this.ai = ai;
    }

    public List<String> getInputs() {
        return inputs;
    }

    public void setInputs(List<String> inputs) {
        this.inputs = inputs;
    }

    public List<String> getOutputs() {
        return outputs;
    }

    public void setOutputs(List<String> outputs) {
        this.outputs = outputs;
    }

    public List<FlowStepDataStoreOpModel> getDataStoreOps() {
        return dataStoreOps;
    }

    public void setDataStoreOps(List<FlowStepDataStoreOpModel> dataStoreOps) {
        this.dataStoreOps = dataStoreOps;
    }

    public List<String> getConfigDependencies() {
        return configDependencies;
    }

    public void setConfigDependencies(List<String> configDependencies) {
        this.configDependencies = configDependencies;
    }

    public FlowStepObservabilityModel getObservability() {
        return observability;
    }

    public void setObservability(FlowStepObservabilityModel observability) {
        this.observability = observability;
    }
}
