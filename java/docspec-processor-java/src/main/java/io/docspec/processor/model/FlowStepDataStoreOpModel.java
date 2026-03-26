package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class FlowStepDataStoreOpModel {

    private String store;
    private String operation;
    private List<String> tables = new ArrayList<>();
    private boolean transactional;
    private boolean cascading;

    public String getStore() {
        return store;
    }

    public void setStore(String store) {
        this.store = store;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public List<String> getTables() {
        return tables;
    }

    public void setTables(List<String> tables) {
        this.tables = tables;
    }

    public boolean isTransactional() {
        return transactional;
    }

    public void setTransactional(boolean transactional) {
        this.transactional = transactional;
    }

    public boolean isCascading() {
        return cascading;
    }

    public void setCascading(boolean cascading) {
        this.cascading = cascading;
    }
}
