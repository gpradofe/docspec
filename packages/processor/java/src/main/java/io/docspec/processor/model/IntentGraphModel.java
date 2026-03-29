package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.docspec.annotation.DocInvariant;

import java.util.ArrayList;
import java.util.List;

@DocInvariant(on = "IntentGraphModel", rules = {"methods NOT_NULL"})
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class IntentGraphModel {

    private List<IntentMethodModel> methods = new ArrayList<>();

    public List<IntentMethodModel> getMethods() {
        return methods;
    }

    public void setMethods(List<IntentMethodModel> methods) {
        this.methods = methods;
    }
}
