package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class EventPayloadModel {

    private String type;
    private List<EventPayloadFieldModel> fields = new ArrayList<>();

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<EventPayloadFieldModel> getFields() {
        return fields;
    }

    public void setFields(List<EventPayloadFieldModel> fields) {
        this.fields = fields;
    }
}
