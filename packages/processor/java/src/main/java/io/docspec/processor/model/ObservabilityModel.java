package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ObservabilityModel {

    private List<ObservabilityMetricModel> metrics = new ArrayList<>();
    private List<ObservabilityTraceModel> traces = new ArrayList<>();
    private List<ObservabilityHealthCheckModel> healthChecks = new ArrayList<>();

    public List<ObservabilityMetricModel> getMetrics() {
        return metrics;
    }

    public void setMetrics(List<ObservabilityMetricModel> metrics) {
        this.metrics = metrics;
    }

    public List<ObservabilityTraceModel> getTraces() {
        return traces;
    }

    public void setTraces(List<ObservabilityTraceModel> traces) {
        this.traces = traces;
    }

    public List<ObservabilityHealthCheckModel> getHealthChecks() {
        return healthChecks;
    }

    public void setHealthChecks(List<ObservabilityHealthCheckModel> healthChecks) {
        this.healthChecks = healthChecks;
    }
}
