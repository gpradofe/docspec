package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class DataModelInfo {

    private String name;
    private String qualified;
    private String description;
    private String table;
    private String discoveredFrom;
    private List<DataModelFieldModel> fields = new ArrayList<>();
    private List<DataModelRelationshipModel> relationships = new ArrayList<>();
    private JsonShapeModel jsonShape;
    private DataModelUsedByModel usedBy;
    private List<IndexModel> indexes = new ArrayList<>();

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getQualified() {
        return qualified;
    }

    public void setQualified(String qualified) {
        this.qualified = qualified;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTable() {
        return table;
    }

    public void setTable(String table) {
        this.table = table;
    }

    public String getDiscoveredFrom() {
        return discoveredFrom;
    }

    public void setDiscoveredFrom(String discoveredFrom) {
        this.discoveredFrom = discoveredFrom;
    }

    public List<DataModelFieldModel> getFields() {
        return fields;
    }

    public void setFields(List<DataModelFieldModel> fields) {
        this.fields = fields;
    }

    public List<DataModelRelationshipModel> getRelationships() {
        return relationships;
    }

    public void setRelationships(List<DataModelRelationshipModel> relationships) {
        this.relationships = relationships;
    }

    public JsonShapeModel getJsonShape() {
        return jsonShape;
    }

    public void setJsonShape(JsonShapeModel jsonShape) {
        this.jsonShape = jsonShape;
    }

    public DataModelUsedByModel getUsedBy() {
        return usedBy;
    }

    public void setUsedBy(DataModelUsedByModel usedBy) {
        this.usedBy = usedBy;
    }

    public List<IndexModel> getIndexes() {
        return indexes;
    }

    public void setIndexes(List<IndexModel> indexes) {
        this.indexes = indexes;
    }

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class IndexModel {

        private String name;
        private List<String> columns = new ArrayList<>();

        @JsonInclude(JsonInclude.Include.NON_EMPTY)
        private Boolean unique;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public List<String> getColumns() {
            return columns;
        }

        public void setColumns(List<String> columns) {
            this.columns = columns;
        }

        public Boolean getUnique() {
            return unique;
        }

        public void setUnique(Boolean unique) {
            this.unique = unique;
        }
    }

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class DataModelUsedByModel {

        private List<String> endpoints = new ArrayList<>();
        private List<String> repositories = new ArrayList<>();

        public List<String> getEndpoints() {
            return endpoints;
        }

        public void setEndpoints(List<String> endpoints) {
            this.endpoints = endpoints;
        }

        public List<String> getRepositories() {
            return repositories;
        }

        public void setRepositories(List<String> repositories) {
            this.repositories = repositories;
        }
    }
}
