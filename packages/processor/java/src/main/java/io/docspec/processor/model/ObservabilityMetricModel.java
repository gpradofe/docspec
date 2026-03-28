package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ObservabilityMetricModel {

    private String name;
    private String type;
    private List<String> labels = new ArrayList<>();
    private List<String> emittedBy = new ArrayList<>();

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

    public List<String> getLabels() {
        return labels;
    }

    public void setLabels(List<String> labels) {
        this.labels = labels;
    }

    public List<String> getEmittedBy() {
        return emittedBy;
    }

    public void setEmittedBy(List<String> emittedBy) {
        this.emittedBy = emittedBy;
    }
}
