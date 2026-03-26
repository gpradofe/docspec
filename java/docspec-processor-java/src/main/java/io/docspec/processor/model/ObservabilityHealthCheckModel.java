package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ObservabilityHealthCheckModel {

    private String path;
    private List<String> checks = new ArrayList<>();

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public List<String> getChecks() {
        return checks;
    }

    public void setChecks(List<String> checks) {
        this.checks = checks;
    }
}
