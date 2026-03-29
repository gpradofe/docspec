package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.docspec.annotation.DocInvariant;

import java.util.ArrayList;
import java.util.List;

@DocInvariant(on = "DataStoreModel", rules = {"id NOT_BLANK", "type NOT_BLANK"})
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class DataStoreModel {

    private String id;
    private String name;
    private String type;
    private List<String> tables = new ArrayList<>();
    private String schemaSource;
    private String migrationTool;
    private List<DataStoreMigrationModel> migrations = new ArrayList<>();
    private List<DataStoreKeyPatternModel> keyPatterns = new ArrayList<>();
    private List<DataStoreBucketModel> buckets = new ArrayList<>();
    private List<DataStoreTopicModel> topics = new ArrayList<>();

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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<String> getTables() {
        return tables;
    }

    public void setTables(List<String> tables) {
        this.tables = tables;
    }

    public String getSchemaSource() {
        return schemaSource;
    }

    public void setSchemaSource(String schemaSource) {
        this.schemaSource = schemaSource;
    }

    public String getMigrationTool() {
        return migrationTool;
    }

    public void setMigrationTool(String migrationTool) {
        this.migrationTool = migrationTool;
    }

    public List<DataStoreMigrationModel> getMigrations() {
        return migrations;
    }

    public void setMigrations(List<DataStoreMigrationModel> migrations) {
        this.migrations = migrations;
    }

    public List<DataStoreKeyPatternModel> getKeyPatterns() {
        return keyPatterns;
    }

    public void setKeyPatterns(List<DataStoreKeyPatternModel> keyPatterns) {
        this.keyPatterns = keyPatterns;
    }

    public List<DataStoreBucketModel> getBuckets() {
        return buckets;
    }

    public void setBuckets(List<DataStoreBucketModel> buckets) {
        this.buckets = buckets;
    }

    public List<DataStoreTopicModel> getTopics() {
        return topics;
    }

    public void setTopics(List<DataStoreTopicModel> topics) {
        this.topics = topics;
    }
}
