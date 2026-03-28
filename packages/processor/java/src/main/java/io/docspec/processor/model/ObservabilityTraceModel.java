package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ObservabilityTraceModel {

    private String spanName;
    private String service;
    private String parentSpan;

    public String getSpanName() {
        return spanName;
    }

    public void setSpanName(String spanName) {
        this.spanName = spanName;
    }

    public String getService() {
        return service;
    }

    public void setService(String service) {
        this.service = service;
    }

    public String getParentSpan() {
        return parentSpan;
    }

    public void setParentSpan(String parentSpan) {
        this.parentSpan = parentSpan;
    }
}
