package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.docspec.annotation.DocInvariant;

import java.util.ArrayList;
import java.util.List;

@DocInvariant(on = "ContextModel", rules = {"id NOT_BLANK"})
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ContextModel {

    private String id;
    private String name;
    private String attachedTo;
    private String flow;
    private List<ContextInputModel> inputs = new ArrayList<>();
    private List<ContextUsesModel> uses = new ArrayList<>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAttachedTo() {
        return attachedTo;
    }

    public void setAttachedTo(String attachedTo) {
        this.attachedTo = attachedTo;
    }

    public String getFlow() {
        return flow;
    }

    public void setFlow(String flow) {
        this.flow = flow;
    }

    public List<ContextInputModel> getInputs() {
        return inputs;
    }

    public void setInputs(List<ContextInputModel> inputs) {
        this.inputs = inputs;
    }

    public List<ContextUsesModel> getUses() {
        return uses;
    }

    public void setUses(List<ContextUsesModel> uses) {
        this.uses = uses;
    }
}
