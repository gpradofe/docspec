package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class DataModelFieldModel {

    private String name;
    private String type;
    private String column;
    private String enumType;
    private String description;

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    private Boolean primaryKey;

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    private Boolean nullable;

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    private Boolean unique;

    private Integer length;

    private String pattern;

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    private Boolean generated;

    private ForeignKeyModel foreignKey;

    private String checkConstraint;

    private Integer maxLength;

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

    public String getColumn() {
        return column;
    }

    public void setColumn(String column) {
        this.column = column;
    }

    public String getEnumType() {
        return enumType;
    }

    public void setEnumType(String enumType) {
        this.enumType = enumType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getPrimaryKey() {
        return primaryKey;
    }

    public void setPrimaryKey(Boolean primaryKey) {
        this.primaryKey = primaryKey;
    }

    public Boolean getNullable() {
        return nullable;
    }

    public void setNullable(Boolean nullable) {
        this.nullable = nullable;
    }

    public Boolean getUnique() {
        return unique;
    }

    public void setUnique(Boolean unique) {
        this.unique = unique;
    }

    public Integer getLength() {
        return length;
    }

    public void setLength(Integer length) {
        this.length = length;
    }

    public String getPattern() {
        return pattern;
    }

    public void setPattern(String pattern) {
        this.pattern = pattern;
    }

    public Boolean getGenerated() {
        return generated;
    }

    public void setGenerated(Boolean generated) {
        this.generated = generated;
    }

    public ForeignKeyModel getForeignKey() {
        return foreignKey;
    }

    public void setForeignKey(ForeignKeyModel foreignKey) {
        this.foreignKey = foreignKey;
    }

    public String getCheckConstraint() {
        return checkConstraint;
    }

    public void setCheckConstraint(String checkConstraint) {
        this.checkConstraint = checkConstraint;
    }

    public Integer getMaxLength() {
        return maxLength;
    }

    public void setMaxLength(Integer maxLength) {
        this.maxLength = maxLength;
    }

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class ForeignKeyModel {

        private String table;
        private String column;
        private String onDelete;

        public String getTable() {
            return table;
        }

        public void setTable(String table) {
            this.table = table;
        }

        public String getColumn() {
            return column;
        }

        public void setColumn(String column) {
            this.column = column;
        }

        public String getOnDelete() {
            return onDelete;
        }

        public void setOnDelete(String onDelete) {
            this.onDelete = onDelete;
        }
    }
}
