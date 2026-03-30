package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.LinkedHashMap;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class AnnotationModel {

    private String name;
    private String qualified;
    private Map<String, Object> attributes = new LinkedHashMap<>();

    public AnnotationModel() {}

    public AnnotationModel(String name, String qualified) {
        this.name = name;
        this.qualified = qualified;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getQualified() { return qualified; }
    public void setQualified(String qualified) { this.qualified = qualified; }

    public Map<String, Object> getAttributes() { return attributes; }
    public void setAttributes(Map<String, Object> attributes) { this.attributes = attributes; }
}
