package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class FlowModel {

    private String id;
    private String name;
    private String description;
    private String trigger;
    private List<FlowStepModel> steps = new ArrayList<>();

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTrigger() {
        return trigger;
    }

    public void setTrigger(String trigger) {
        this.trigger = trigger;
    }

    public List<FlowStepModel> getSteps() {
        return steps;
    }

    public void setSteps(List<FlowStepModel> steps) {
        this.steps = steps;
    }
}
