package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.docspec.annotation.DocInvariant;

import java.util.ArrayList;
import java.util.List;

@DocInvariant(on = "ErrorModel", rules = {"code NOT_BLANK"})
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ErrorModel {

    private String code;
    private String exception;
    private String description;
    private String resolution;
    private String since;

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    private Integer httpStatus;

    private List<String> causes = new ArrayList<>();
    private List<String> thrownBy = new ArrayList<>();
    private List<String> endpoints = new ArrayList<>();

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getException() {
        return exception;
    }

    public void setException(String exception) {
        this.exception = exception;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getResolution() {
        return resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }

    public String getSince() {
        return since;
    }

    public void setSince(String since) {
        this.since = since;
    }

    public Integer getHttpStatus() {
        return httpStatus;
    }

    public void setHttpStatus(Integer httpStatus) {
        this.httpStatus = httpStatus;
    }

    public List<String> getCauses() {
        return causes;
    }

    public void setCauses(List<String> causes) {
        this.causes = causes;
    }

    public List<String> getThrownBy() {
        return thrownBy;
    }

    public void setThrownBy(List<String> thrownBy) {
        this.thrownBy = thrownBy;
    }

    public List<String> getEndpoints() {
        return endpoints;
    }

    public void setEndpoints(List<String> endpoints) {
        this.endpoints = endpoints;
    }
}
