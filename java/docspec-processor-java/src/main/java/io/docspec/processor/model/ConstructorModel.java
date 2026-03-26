package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ConstructorModel {

    private String visibility;
    private String description;
    private List<MethodParamModel> params = new ArrayList<>();

    public String getVisibility() {
        return visibility;
    }

    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<MethodParamModel> getParams() {
        return params;
    }

    public void setParams(List<MethodParamModel> params) {
        this.params = params;
    }
}
