package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class DataModelRelationshipModel {

    private String type;
    private String target;
    private String field;
    private String mappedBy;
    private String cascade;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTarget() {
        return target;
    }

    public void setTarget(String target) {
        this.target = target;
    }

    public String getField() {
        return field;
    }

    public void setField(String field) {
        this.field = field;
    }

    public String getMappedBy() {
        return mappedBy;
    }

    public void setMappedBy(String mappedBy) {
        this.mappedBy = mappedBy;
    }

    public String getCascade() {
        return cascade;
    }

    public void setCascade(String cascade) {
        this.cascade = cascade;
    }
}
