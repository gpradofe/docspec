package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class JsonShapeModel {

    private String description;
    private List<JsonShapeFieldModel> fields = new ArrayList<>();
    private List<String> subtypes;

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<JsonShapeFieldModel> getFields() {
        return fields;
    }

    public void setFields(List<JsonShapeFieldModel> fields) {
        this.fields = fields;
    }

    public List<String> getSubtypes() {
        return subtypes;
    }

    public void setSubtypes(List<String> subtypes) {
        this.subtypes = subtypes;
    }
}
