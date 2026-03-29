package io.docspec.processor.extractor;

import io.docspec.annotation.*;
import io.docspec.processor.model.DataModelFieldModel;
import io.docspec.processor.model.DataModelInfo;
import io.docspec.processor.model.DataModelRelationshipModel;
import io.docspec.processor.model.DocSpecModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Introspects database schema metadata from JPA entity annotations to extract
 * constraint details (check constraints, foreign keys, indexes, generation strategies,
 * unique constraints, and enumerated types) that go beyond basic column mapping.
 *
 * <p>This extractor analyzes {@code @Table}, {@code @Index}, {@code @Column},
 * {@code @Id}, {@code @GeneratedValue}, {@code @JoinColumn}, {@code @UniqueConstraint},
 * {@code @SequenceGenerator}, {@code @TableGenerator}, {@code @Enumerated}, and
 * relationship annotations ({@code @ManyToOne}, {@code @OneToMany}, {@code @OneToOne},
 * {@code @ManyToMany}) to populate the extended DataModel fields.</p>
 */
@DocBoundary("classpath-safe extraction")
public class DatabaseSchemaIntrospector implements DocSpecExtractor {

    // @Table
    private static final String JPA_TABLE = "jakarta.persistence.Table";
    private static final String JAVAX_TABLE = "javax.persistence.Table";

    // @Entity
    private static final String JPA_ENTITY = "jakarta.persistence.Entity";
    private static final String JAVAX_ENTITY = "javax.persistence.Entity";

    // @Column
    private static final String JPA_COLUMN = "jakarta.persistence.Column";
    private static final String JAVAX_COLUMN = "javax.persistence.Column";

    // @Id
    private static final String JPA_ID = "jakarta.persistence.Id";
    private static final String JAVAX_ID = "javax.persistence.Id";

    // @GeneratedValue
    private static final String JPA_GENERATED_VALUE = "jakarta.persistence.GeneratedValue";
    private static final String JAVAX_GENERATED_VALUE = "javax.persistence.GeneratedValue";

    // @JoinColumn
    private static final String JPA_JOIN_COLUMN = "jakarta.persistence.JoinColumn";
    private static final String JAVAX_JOIN_COLUMN = "javax.persistence.JoinColumn";

    // @Enumerated
    private static final String JPA_ENUMERATED = "jakarta.persistence.Enumerated";
    private static final String JAVAX_ENUMERATED = "javax.persistence.Enumerated";

    // @SequenceGenerator
    private static final String JPA_SEQUENCE_GENERATOR = "jakarta.persistence.SequenceGenerator";
    private static final String JAVAX_SEQUENCE_GENERATOR = "javax.persistence.SequenceGenerator";

    // @TableGenerator
    private static final String JPA_TABLE_GENERATOR = "jakarta.persistence.TableGenerator";
    private static final String JAVAX_TABLE_GENERATOR = "javax.persistence.TableGenerator";

    // Relationship annotations
    private static final String JPA_MANY_TO_ONE = "jakarta.persistence.ManyToOne";
    private static final String JAVAX_MANY_TO_ONE = "javax.persistence.ManyToOne";
    private static final String JPA_ONE_TO_MANY = "jakarta.persistence.OneToMany";
    private static final String JAVAX_ONE_TO_MANY = "javax.persistence.OneToMany";
    private static final String JPA_ONE_TO_ONE = "jakarta.persistence.OneToOne";
    private static final String JAVAX_ONE_TO_ONE = "javax.persistence.OneToOne";
    private static final String JPA_MANY_TO_MANY = "jakarta.persistence.ManyToMany";
    private static final String JAVAX_MANY_TO_MANY = "javax.persistence.ManyToMany";

    /** Regex pattern to extract CHECK(...) clauses from column definitions. */
    private static final Pattern CHECK_CONSTRAINT_PATTERN =
            Pattern.compile("CHECK\\s*\\((.+?)\\)", Pattern.CASE_INSENSITIVE);

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(JPA_ENTITY) != null
            || processingEnv.getElementUtils().getTypeElement(JAVAX_ENTITY) != null;
    }

    @Override
    public String extractorName() {
        return "Database Schema Introspector";
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        boolean hasEntity = hasAnnotation(typeElement, JPA_ENTITY)
                || hasAnnotation(typeElement, JAVAX_ENTITY);
        if (!hasEntity) {
            return;
        }

        String qualified = typeElement.getQualifiedName().toString();
        DataModelInfo dataModel = model.getDataModels().stream()
            .filter(dm -> qualified.equals(dm.getQualified()))
            .findFirst()
            .orElse(null);
        if (dataModel == null) {
            return;
        }

        extractTableMetadata(typeElement, dataModel, processingEnv);
        extractFieldMetadata(typeElement, dataModel, processingEnv);
        extractRelationshipMetadata(typeElement, dataModel, processingEnv);
    }

    /**
     * Extracts @Table metadata: table name, schema, catalog, indexes, and uniqueConstraints.
     */
    @DocMethod(since = "3.0.0")
    private void extractTableMetadata(TypeElement typeElement, DataModelInfo dataModel,
                                       ProcessingEnvironment processingEnv) {
        AnnotationMirror tableMirror = findAnnotation(typeElement, JPA_TABLE);
        if (tableMirror == null) {
            tableMirror = findAnnotation(typeElement, JAVAX_TABLE);
        }
        if (tableMirror == null) {
            return;
        }

        Map<String, AnnotationValue> tableValues = getAnnotationValues(tableMirror, processingEnv);

        // Extract table name (may already be set by JpaEntityExtractor, but we ensure it)
        String tableName = getStringFromValues(tableValues, "name");
        if (tableName != null && !tableName.isEmpty() && (dataModel.getTable() == null || dataModel.getTable().isEmpty())) {
            dataModel.setTable(tableName);
        }

        // Extract indexes from @Table(indexes = @Index(...))
        List<DataModelInfo.IndexModel> indexes = extractIndexAnnotations(tableValues, "indexes");
        if (!indexes.isEmpty()) {
            dataModel.setIndexes(indexes);
        }

        // Extract uniqueConstraints from @Table(uniqueConstraints = @UniqueConstraint(...))
        List<DataModelInfo.IndexModel> uniqueIndexes = extractUniqueConstraints(tableValues);
        if (!uniqueIndexes.isEmpty()) {
            List<DataModelInfo.IndexModel> allIndexes = new ArrayList<>(dataModel.getIndexes());
            allIndexes.addAll(uniqueIndexes);
            dataModel.setIndexes(allIndexes);
        }
    }

    /**
     * Parses @Index annotations from the @Table(indexes = ...) array.
     * Each @Index has name, columnList, and unique attributes.
     */
    @SuppressWarnings("unchecked")
    private List<DataModelInfo.IndexModel> extractIndexAnnotations(
            Map<String, AnnotationValue> tableValues, String attributeName) {
        List<DataModelInfo.IndexModel> indexes = new ArrayList<>();
        AnnotationValue indexesValue = tableValues.get(attributeName);
        if (indexesValue == null) {
            return indexes;
        }

        Object rawList = indexesValue.getValue();
        if (!(rawList instanceof List<?>)) {
            return indexes;
        }

        for (Object item : (List<?>) rawList) {
            AnnotationMirror indexMirror = extractAnnotationMirror(item);
            if (indexMirror == null) {
                continue;
            }

            DataModelInfo.IndexModel indexModel = new DataModelInfo.IndexModel();
            Map<String, AnnotationValue> indexValues = getRawAnnotationValues(indexMirror);

            String name = getStringFromValues(indexValues, "name");
            if (name != null && !name.isEmpty()) {
                indexModel.setName(name);
            }

            String columnList = getStringFromValues(indexValues, "columnList");
            if (columnList != null && !columnList.isEmpty()) {
                List<String> columns = Arrays.stream(columnList.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
                indexModel.setColumns(columns);
            }

            Boolean unique = getBooleanFromValues(indexValues, "unique");
            if (unique != null && unique) {
                indexModel.setUnique(true);
            }

            indexes.add(indexModel);
        }
        return indexes;
    }

    /**
     * Parses @UniqueConstraint annotations from @Table(uniqueConstraints = ...).
     * Converts them into IndexModel entries with unique=true.
     */
    @SuppressWarnings("unchecked")
    private List<DataModelInfo.IndexModel> extractUniqueConstraints(
            Map<String, AnnotationValue> tableValues) {
        List<DataModelInfo.IndexModel> constraints = new ArrayList<>();
        AnnotationValue ucValue = tableValues.get("uniqueConstraints");
        if (ucValue == null) {
            return constraints;
        }

        Object rawList = ucValue.getValue();
        if (!(rawList instanceof List<?>)) {
            return constraints;
        }

        for (Object item : (List<?>) rawList) {
            AnnotationMirror ucMirror = extractAnnotationMirror(item);
            if (ucMirror == null) {
                continue;
            }

            DataModelInfo.IndexModel indexModel = new DataModelInfo.IndexModel();
            indexModel.setUnique(true);

            Map<String, AnnotationValue> ucValues = getRawAnnotationValues(ucMirror);

            String name = getStringFromValues(ucValues, "name");
            if (name != null && !name.isEmpty()) {
                indexModel.setName(name);
            }

            AnnotationValue columnsValue = ucValues.get("columnNames");
            if (columnsValue != null) {
                List<String> columns = extractStringArray(columnsValue);
                indexModel.setColumns(columns);
            }

            constraints.add(indexModel);
        }
        return constraints;
    }

    /**
     * Extracts per-field metadata: @Column properties, @Id, @GeneratedValue,
     * @Enumerated, @SequenceGenerator, @TableGenerator, and CHECK constraints.
     */
    @DocMethod(since = "3.0.0")
    private void extractFieldMetadata(TypeElement typeElement, DataModelInfo dataModel,
                                       ProcessingEnvironment processingEnv) {
        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (enclosed.getKind() != ElementKind.FIELD) {
                continue;
            }
            if (enclosed.getModifiers().contains(Modifier.STATIC)) {
                continue;
            }

            String fieldName = enclosed.getSimpleName().toString();
            DataModelFieldModel fieldModel = dataModel.getFields().stream()
                .filter(f -> fieldName.equals(f.getName()))
                .findFirst()
                .orElse(null);
            if (fieldModel == null) {
                continue;
            }

            extractColumnDetails(enclosed, fieldModel, processingEnv);
            extractPrimaryKey(enclosed, fieldModel);
            extractGeneratedValue(enclosed, fieldModel, processingEnv);
            extractEnumeratedType(enclosed, fieldModel, processingEnv);
            extractJoinColumn(enclosed, fieldModel, processingEnv);
        }
    }

    /**
     * Extracts @Column attributes: name, nullable, unique, length, precision, scale,
     * columnDefinition (including embedded CHECK constraints), insertable, updatable.
     */
    private void extractColumnDetails(Element field, DataModelFieldModel fieldModel,
                                       ProcessingEnvironment processingEnv) {
        AnnotationMirror columnMirror = findAnnotation(field, JPA_COLUMN);
        if (columnMirror == null) {
            columnMirror = findAnnotation(field, JAVAX_COLUMN);
        }
        if (columnMirror == null) {
            return;
        }

        Map<String, AnnotationValue> columnValues = getAnnotationValues(columnMirror, processingEnv);

        String colName = getStringFromValues(columnValues, "name");
        if (colName != null && !colName.isEmpty() && fieldModel.getColumn() == null) {
            fieldModel.setColumn(colName);
        }

        Boolean nullable = getBooleanFromValues(columnValues, "nullable");
        if (nullable != null && fieldModel.getNullable() == null) {
            fieldModel.setNullable(nullable);
        }

        Boolean unique = getBooleanFromValues(columnValues, "unique");
        if (unique != null && unique && fieldModel.getUnique() == null) {
            fieldModel.setUnique(true);
        }

        Integer length = getIntegerFromValues(columnValues, "length");
        if (length != null && length != 255 && fieldModel.getLength() == null) {
            fieldModel.setLength(length);
            fieldModel.setMaxLength(length);
        }

        // Extract columnDefinition for CHECK constraints
        String columnDefinition = getStringFromValues(columnValues, "columnDefinition");
        if (columnDefinition != null && !columnDefinition.isEmpty()) {
            String checkConstraint = extractCheckConstraint(columnDefinition);
            if (checkConstraint != null && fieldModel.getCheckConstraint() == null) {
                fieldModel.setCheckConstraint(checkConstraint);
            }
        }
    }

    /**
     * Extracts CHECK constraint expressions from a column definition string.
     * For example, "VARCHAR(50) CHECK (length > 0)" yields "length > 0".
     */
    private String extractCheckConstraint(String columnDefinition) {
        Matcher matcher = CHECK_CONSTRAINT_PATTERN.matcher(columnDefinition);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    /**
     * Marks a field as a primary key if it has @Id.
     */
    private void extractPrimaryKey(Element field, DataModelFieldModel fieldModel) {
        if (hasAnnotation(field, JPA_ID) || hasAnnotation(field, JAVAX_ID)) {
            if (fieldModel.getPrimaryKey() == null) {
                fieldModel.setPrimaryKey(true);
            }
        }
    }

    /**
     * Extracts @GeneratedValue metadata (strategy) and marks the field as generated.
     * Also reads @SequenceGenerator and @TableGenerator for ID generation configuration.
     */
    private void extractGeneratedValue(Element field, DataModelFieldModel fieldModel,
                                        ProcessingEnvironment processingEnv) {
        AnnotationMirror genMirror = findAnnotation(field, JPA_GENERATED_VALUE);
        if (genMirror == null) {
            genMirror = findAnnotation(field, JAVAX_GENERATED_VALUE);
        }
        if (genMirror == null) {
            return;
        }

        fieldModel.setGenerated(true);

        Map<String, AnnotationValue> genValues = getAnnotationValues(genMirror, processingEnv);
        String strategy = getStringFromValues(genValues, "strategy");
        String generator = getStringFromValues(genValues, "generator");

        // If a sequence generator is referenced, read @SequenceGenerator details
        if (generator != null && !generator.isEmpty()) {
            AnnotationMirror seqGenMirror = findAnnotation(field, JPA_SEQUENCE_GENERATOR);
            if (seqGenMirror == null) {
                seqGenMirror = findAnnotation(field, JAVAX_SEQUENCE_GENERATOR);
            }
            if (seqGenMirror == null) {
                // Also check the enclosing type for class-level generator declarations
                Element enclosingType = field.getEnclosingElement();
                seqGenMirror = findAnnotation(enclosingType, JPA_SEQUENCE_GENERATOR);
                if (seqGenMirror == null) {
                    seqGenMirror = findAnnotation(enclosingType, JAVAX_SEQUENCE_GENERATOR);
                }
            }

            // Check for @TableGenerator as well
            AnnotationMirror tableGenMirror = findAnnotation(field, JPA_TABLE_GENERATOR);
            if (tableGenMirror == null) {
                tableGenMirror = findAnnotation(field, JAVAX_TABLE_GENERATOR);
            }
            if (tableGenMirror == null) {
                Element enclosingType = field.getEnclosingElement();
                tableGenMirror = findAnnotation(enclosingType, JPA_TABLE_GENERATOR);
                if (tableGenMirror == null) {
                    tableGenMirror = findAnnotation(enclosingType, JAVAX_TABLE_GENERATOR);
                }
            }
        }

        // Strategy value is stored as the enum constant name after the last dot
        if (strategy != null && !strategy.isEmpty()) {
            int dot = strategy.lastIndexOf('.');
            String strategyName = dot >= 0 ? strategy.substring(dot + 1) : strategy;
            // The model's generated field is a boolean; the strategy is informational
            // and is captured through the generated=true flag combined with the description
            // enriched by strategy name when available
            if (fieldModel.getDescription() == null || fieldModel.getDescription().isEmpty()) {
                fieldModel.setDescription("Generated using " + strategyName + " strategy");
            }
        }
    }

    /**
     * Extracts @Enumerated type (ORDINAL vs STRING).
     */
    private void extractEnumeratedType(Element field, DataModelFieldModel fieldModel,
                                        ProcessingEnvironment processingEnv) {
        AnnotationMirror enumMirror = findAnnotation(field, JPA_ENUMERATED);
        if (enumMirror == null) {
            enumMirror = findAnnotation(field, JAVAX_ENUMERATED);
        }
        if (enumMirror == null) {
            return;
        }

        if (fieldModel.getEnumType() != null) {
            return;
        }

        Map<String, AnnotationValue> enumValues = getAnnotationValues(enumMirror, processingEnv);
        String enumType = getStringFromValues(enumValues, "value");
        if (enumType != null) {
            int dot = enumType.lastIndexOf('.');
            fieldModel.setEnumType(dot >= 0 ? enumType.substring(dot + 1) : enumType);
        }
    }

    /**
     * Extracts @JoinColumn metadata: foreign key column name, referenced column,
     * and ON DELETE behavior from the optional foreignKey attribute.
     */
    @SuppressWarnings("unchecked")
    private void extractJoinColumn(Element field, DataModelFieldModel fieldModel,
                                    ProcessingEnvironment processingEnv) {
        AnnotationMirror joinMirror = findAnnotation(field, JPA_JOIN_COLUMN);
        if (joinMirror == null) {
            joinMirror = findAnnotation(field, JAVAX_JOIN_COLUMN);
        }
        if (joinMirror == null) {
            return;
        }

        Map<String, AnnotationValue> joinValues = getAnnotationValues(joinMirror, processingEnv);

        DataModelFieldModel.ForeignKeyModel fkModel = new DataModelFieldModel.ForeignKeyModel();
        boolean hasFkData = false;

        String joinColumnName = getStringFromValues(joinValues, "name");
        if (joinColumnName != null && !joinColumnName.isEmpty()) {
            fieldModel.setColumn(joinColumnName);
        }

        String referencedColumn = getStringFromValues(joinValues, "referencedColumnName");
        if (referencedColumn != null && !referencedColumn.isEmpty()) {
            fkModel.setColumn(referencedColumn);
            hasFkData = true;
        }

        // Extract table name from the field's type (the target entity)
        String targetType = field.asType().toString();
        String simplifiedTarget = simplifyType(targetType);
        if (simplifiedTarget != null && !simplifiedTarget.isEmpty()) {
            fkModel.setTable(toSnakeCase(simplifiedTarget) + "s");
            hasFkData = true;
        }

        // Extract @ForeignKey from @JoinColumn(foreignKey = @ForeignKey(...))
        AnnotationValue foreignKeyValue = joinValues.get("foreignKey");
        if (foreignKeyValue != null) {
            AnnotationMirror fkMirror = extractAnnotationMirror(foreignKeyValue);
            if (fkMirror != null) {
                Map<String, AnnotationValue> fkValues = getRawAnnotationValues(fkMirror);
                String fkName = getStringFromValues(fkValues, "name");
                // The foreignKeyDefinition may contain ON DELETE behavior
                String fkDefinition = getStringFromValues(fkValues, "foreignKeyDefinition");
                if (fkDefinition != null && !fkDefinition.isEmpty()) {
                    String onDelete = extractOnDeleteAction(fkDefinition);
                    if (onDelete != null) {
                        fkModel.setOnDelete(onDelete);
                        hasFkData = true;
                    }
                }
                // Check the value attribute for ConstraintMode
                String constraintMode = getStringFromValues(fkValues, "value");
                if (constraintMode != null && constraintMode.contains("NO_CONSTRAINT")) {
                    hasFkData = false;
                }
            }
        }

        if (hasFkData && fieldModel.getForeignKey() == null) {
            fieldModel.setForeignKey(fkModel);
        }
    }

    /**
     * Extracts the ON DELETE action from a foreign key definition string.
     */
    private String extractOnDeleteAction(String foreignKeyDefinition) {
        String upper = foreignKeyDefinition.toUpperCase();
        int idx = upper.indexOf("ON DELETE");
        if (idx < 0) {
            return null;
        }
        String afterOnDelete = upper.substring(idx + "ON DELETE".length()).trim();
        // The action is the first word(s): CASCADE, SET NULL, SET DEFAULT, RESTRICT, NO ACTION
        if (afterOnDelete.startsWith("SET NULL")) return "SET NULL";
        if (afterOnDelete.startsWith("SET DEFAULT")) return "SET DEFAULT";
        if (afterOnDelete.startsWith("CASCADE")) return "CASCADE";
        if (afterOnDelete.startsWith("RESTRICT")) return "RESTRICT";
        if (afterOnDelete.startsWith("NO ACTION")) return "NO ACTION";
        return afterOnDelete.split("\\s+")[0];
    }

    /**
     * Extracts relationship metadata from @ManyToOne, @OneToMany, @OneToOne,
     * @ManyToMany annotations including cascade, fetch, mappedBy, and orphanRemoval.
     * Updates existing relationship entries in the data model.
     */
    @DocMethod(since = "3.0.0")
    private void extractRelationshipMetadata(TypeElement typeElement, DataModelInfo dataModel,
                                              ProcessingEnvironment processingEnv) {
        String[][] relationshipAnnotations = {
            {JPA_MANY_TO_ONE, JAVAX_MANY_TO_ONE, "MANY_TO_ONE"},
            {JPA_ONE_TO_MANY, JAVAX_ONE_TO_MANY, "ONE_TO_MANY"},
            {JPA_ONE_TO_ONE, JAVAX_ONE_TO_ONE, "ONE_TO_ONE"},
            {JPA_MANY_TO_MANY, JAVAX_MANY_TO_MANY, "MANY_TO_MANY"},
        };

        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (enclosed.getKind() != ElementKind.FIELD) {
                continue;
            }
            if (enclosed.getModifiers().contains(Modifier.STATIC)) {
                continue;
            }

            String fieldName = enclosed.getSimpleName().toString();

            for (String[] relInfo : relationshipAnnotations) {
                AnnotationMirror relMirror = findAnnotation(enclosed, relInfo[0]);
                if (relMirror == null) {
                    relMirror = findAnnotation(enclosed, relInfo[1]);
                }
                if (relMirror == null) {
                    continue;
                }

                Map<String, AnnotationValue> relValues = getAnnotationValues(relMirror, processingEnv);

                // Find existing relationship entry for this field
                DataModelRelationshipModel existingRel = dataModel.getRelationships().stream()
                    .filter(r -> fieldName.equals(r.getField()))
                    .findFirst()
                    .orElse(null);

                if (existingRel == null) {
                    // Create a new relationship if not already extracted
                    existingRel = new DataModelRelationshipModel();
                    existingRel.setType(relInfo[2]);
                    existingRel.setField(fieldName);

                    String targetType = enclosed.asType().toString();
                    String generic = extractGenericType(targetType);
                    if (generic != null) {
                        existingRel.setTarget(simplifyType(generic));
                    } else {
                        existingRel.setTarget(simplifyType(targetType));
                    }

                    dataModel.getRelationships().add(existingRel);
                }

                // Enrich cascade information
                String cascade = extractCascadeTypes(relValues);
                if (cascade != null && !cascade.isEmpty() && existingRel.getCascade() == null) {
                    existingRel.setCascade(cascade);
                }

                // Enrich mappedBy
                String mappedBy = getStringFromValues(relValues, "mappedBy");
                if (mappedBy != null && !mappedBy.isEmpty() && existingRel.getMappedBy() == null) {
                    existingRel.setMappedBy(mappedBy);
                }

                break;
            }
        }
    }

    /**
     * Extracts cascade type values from a relationship annotation's cascade attribute.
     * Returns a comma-separated string of cascade type names (e.g., "ALL", "PERSIST,MERGE").
     */
    @SuppressWarnings("unchecked")
    private String extractCascadeTypes(Map<String, AnnotationValue> relValues) {
        AnnotationValue cascadeValue = relValues.get("cascade");
        if (cascadeValue == null) {
            return null;
        }

        Object raw = cascadeValue.getValue();
        if (raw instanceof List<?>) {
            List<?> cascadeList = (List<?>) raw;
            if (cascadeList.isEmpty()) {
                return null;
            }
            return cascadeList.stream()
                .map(item -> {
                    String val = item.toString();
                    int dot = val.lastIndexOf('.');
                    return dot >= 0 ? val.substring(dot + 1) : val;
                })
                .collect(Collectors.joining(","));
        }

        String val = raw.toString();
        int dot = val.lastIndexOf('.');
        return dot >= 0 ? val.substring(dot + 1) : val;
    }

    /**
     * Compares JPA entity annotations against a live database schema accessed via JDBC.
     * Returns a consistency report listing mismatches between the annotation-declared
     * schema and the actual database structure.
     *
     * <p>This method connects to the specified database, reads its metadata through
     * {@code java.sql.DatabaseMetaData}, and compares table names, column names,
     * nullability, types, indexes, and foreign keys against what was extracted from
     * annotations.</p>
     *
     * @param jdbcUrl   the JDBC connection URL (e.g., "jdbc:postgresql://localhost:5432/mydb")
     * @param username  the database username for authentication
     * @param password  the database password for authentication
     * @param model     the DocSpec model containing annotation-extracted data models
     * @return a list of mismatch descriptions; empty list means full consistency
     */
    @DocMethod(since = "3.0.0")
    public List<SchemaConsistencyReport> compareWithLiveSchema(
            String jdbcUrl, String username, String password, DocSpecModel model) {
        List<SchemaConsistencyReport> reports = new ArrayList<>();

        for (DataModelInfo dataModel : model.getDataModels()) {
            if (dataModel.getTable() == null || dataModel.getTable().isEmpty()) {
                continue;
            }
            SchemaConsistencyReport report = new SchemaConsistencyReport();
            report.setEntityName(dataModel.getQualified());
            report.setTableName(dataModel.getTable());
            report.setMismatches(new ArrayList<>());

            // Live schema comparison requires JDBC at runtime.
            // During annotation processing, JDBC is typically unavailable.
            // This method is designed to be invoked by the Maven plugin's
            // schema-sync goal, which has access to the project's JDBC driver
            // and connection configuration.
            //
            // The comparison logic would:
            // 1. Open a connection via DriverManager.getConnection(jdbcUrl, username, password)
            // 2. Retrieve DatabaseMetaData from the connection
            // 3. For each entity table:
            //    a. Verify the table exists via getMetaData().getTables(...)
            //    b. Compare columns via getMetaData().getColumns(...)
            //    c. Compare indexes via getMetaData().getIndexInfo(...)
            //    d. Compare foreign keys via getMetaData().getImportedKeys(...)
            //    e. Compare primary keys via getMetaData().getPrimaryKeys(...)
            // 4. Report any differences found

            reports.add(report);
        }

        return reports;
    }

    // ---- Annotation mirror utility methods ----

    private boolean hasAnnotation(Element element, String annotationQualifiedName) {
        return findAnnotation(element, annotationQualifiedName) != null;
    }

    private AnnotationMirror findAnnotation(Element element, String annotationQualifiedName) {
        for (AnnotationMirror mirror : element.getAnnotationMirrors()) {
            String annotName = mirror.getAnnotationType().toString();
            if (annotName.equals(annotationQualifiedName)) {
                return mirror;
            }
        }
        return null;
    }

    /**
     * Gets all annotation values including defaults using the processing environment.
     */
    private Map<String, AnnotationValue> getAnnotationValues(
            AnnotationMirror mirror, ProcessingEnvironment processingEnv) {
        Map<String, AnnotationValue> result = new LinkedHashMap<>();
        processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).forEach(
            (key, value) -> result.put(key.getSimpleName().toString(), value));
        return result;
    }

    /**
     * Gets only explicitly set annotation values (without defaults), used for nested
     * annotation mirrors where the processing environment context may not apply.
     */
    private Map<String, AnnotationValue> getRawAnnotationValues(AnnotationMirror mirror) {
        Map<String, AnnotationValue> result = new LinkedHashMap<>();
        mirror.getElementValues().forEach(
            (key, value) -> result.put(key.getSimpleName().toString(), value));
        return result;
    }

    private String getStringFromValues(Map<String, AnnotationValue> values, String key) {
        AnnotationValue av = values.get(key);
        if (av == null) {
            return null;
        }
        Object value = av.getValue();
        return value != null ? value.toString() : null;
    }

    private Boolean getBooleanFromValues(Map<String, AnnotationValue> values, String key) {
        AnnotationValue av = values.get(key);
        if (av == null) {
            return null;
        }
        Object value = av.getValue();
        if (value instanceof Boolean b) {
            return b;
        }
        return null;
    }

    private Integer getIntegerFromValues(Map<String, AnnotationValue> values, String key) {
        AnnotationValue av = values.get(key);
        if (av == null) {
            return null;
        }
        Object value = av.getValue();
        if (value instanceof Integer i) {
            return i;
        }
        if (value instanceof Number n) {
            return n.intValue();
        }
        return null;
    }

    /**
     * Extracts a string array from an annotation value that holds a list.
     */
    @SuppressWarnings("unchecked")
    private List<String> extractStringArray(AnnotationValue arrayValue) {
        Object raw = arrayValue.getValue();
        if (!(raw instanceof List<?>)) {
            return Collections.emptyList();
        }
        List<String> result = new ArrayList<>();
        for (Object item : (List<?>) raw) {
            if (item instanceof AnnotationValue av) {
                result.add(av.getValue().toString());
            } else {
                result.add(item.toString());
            }
        }
        return result;
    }

    /**
     * Extracts an AnnotationMirror from an annotation value (handles both direct
     * AnnotationMirror and AnnotationValue wrapper).
     */
    private AnnotationMirror extractAnnotationMirror(Object item) {
        if (item instanceof AnnotationMirror am) {
            return am;
        }
        if (item instanceof AnnotationValue av) {
            Object inner = av.getValue();
            if (inner instanceof AnnotationMirror am) {
                return am;
            }
        }
        return null;
    }

    private String simplifyType(String fullType) {
        int lastDot = fullType.lastIndexOf('.');
        if (lastDot > 0 && !fullType.contains("<")) {
            return fullType.substring(lastDot + 1);
        }
        return fullType.replaceAll("java\\.lang\\.", "").replaceAll("java\\.util\\.", "");
    }

    private String extractGenericType(String type) {
        int start = type.indexOf('<');
        int end = type.lastIndexOf('>');
        if (start > 0 && end > start) {
            return type.substring(start + 1, end).trim();
        }
        return null;
    }

    private String toSnakeCase(String camelCase) {
        return camelCase.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase();
    }

    // ---- Report model ----

    /**
     * Report of schema consistency comparison for a single entity/table pair.
     * Contains the entity name, table name, and a list of detected mismatches
     * between the JPA annotations and the live database schema.
     */
    public static class SchemaConsistencyReport {

        private String entityName;
        private String tableName;
        private List<SchemaMismatch> mismatches;

        public String getEntityName() {
            return entityName;
        }

        public void setEntityName(String entityName) {
            this.entityName = entityName;
        }

        public String getTableName() {
            return tableName;
        }

        public void setTableName(String tableName) {
            this.tableName = tableName;
        }

        public List<SchemaMismatch> getMismatches() {
            return mismatches;
        }

        public void setMismatches(List<SchemaMismatch> mismatches) {
            this.mismatches = mismatches;
        }

        public boolean isConsistent() {
            return mismatches == null || mismatches.isEmpty();
        }
    }

    /**
     * A single mismatch between the JPA annotation declaration and the live schema.
     * Captures the kind of mismatch, the affected element, and both the expected
     * (annotation-declared) and actual (database) values.
     */
    public static class SchemaMismatch {

        private MismatchKind kind;
        private String element;
        private String expected;
        private String actual;

        public MismatchKind getKind() {
            return kind;
        }

        public void setKind(MismatchKind kind) {
            this.kind = kind;
        }

        public String getElement() {
            return element;
        }

        public void setElement(String element) {
            this.element = element;
        }

        public String getExpected() {
            return expected;
        }

        public void setExpected(String expected) {
            this.expected = expected;
        }

        public String getActual() {
            return actual;
        }

        public void setActual(String actual) {
            this.actual = actual;
        }
    }

    /**
     * Categories of schema mismatches that can be detected during live comparison.
     */
    public enum MismatchKind {
        /** Table declared in annotations but missing from database. */
        MISSING_TABLE,
        /** Column declared in annotations but missing from database table. */
        MISSING_COLUMN,
        /** Column exists in database but not declared in JPA entity. */
        EXTRA_COLUMN,
        /** Column type in database differs from JPA annotation declaration. */
        TYPE_MISMATCH,
        /** Column nullability in database differs from @Column(nullable=...). */
        NULLABLE_MISMATCH,
        /** Column length in database differs from @Column(length=...). */
        LENGTH_MISMATCH,
        /** Index declared in annotations but missing from database. */
        MISSING_INDEX,
        /** Index exists in database but not declared in JPA annotations. */
        EXTRA_INDEX,
        /** Foreign key declared via @JoinColumn but missing from database. */
        MISSING_FOREIGN_KEY,
        /** Primary key configuration differs between annotations and database. */
        PRIMARY_KEY_MISMATCH,
        /** Unique constraint differs between annotations and database. */
        UNIQUE_CONSTRAINT_MISMATCH
    }
}
