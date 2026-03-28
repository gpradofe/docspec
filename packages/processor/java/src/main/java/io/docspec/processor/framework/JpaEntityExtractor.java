package io.docspec.processor.framework;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.*;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@DocBoundary("framework detection without compile deps")
public class JpaEntityExtractor implements FrameworkDetector {

    private static final String ENTITY = "jakarta.persistence.Entity";
    private static final String ENTITY_JAVAX = "javax.persistence.Entity";
    private static final String TABLE = "jakarta.persistence.Table";
    private static final String TABLE_JAVAX = "javax.persistence.Table";
    private static final String COLUMN = "jakarta.persistence.Column";
    private static final String COLUMN_JAVAX = "javax.persistence.Column";
    private static final String ID = "jakarta.persistence.Id";
    private static final String ID_JAVAX = "javax.persistence.Id";
    private static final String GENERATED_VALUE = "jakarta.persistence.GeneratedValue";
    private static final String ENUMERATED = "jakarta.persistence.Enumerated";
    private static final String ENUMERATED_JAVAX = "javax.persistence.Enumerated";
    private static final String MANY_TO_ONE = "jakarta.persistence.ManyToOne";
    private static final String ONE_TO_MANY = "jakarta.persistence.OneToMany";
    private static final String MANY_TO_MANY = "jakarta.persistence.ManyToMany";
    private static final String ONE_TO_ONE = "jakarta.persistence.OneToOne";

    // Validation constraint annotations
    private static final String NOT_NULL = "jakarta.validation.constraints.NotNull";
    private static final String NOT_NULL_JAVAX = "javax.validation.constraints.NotNull";
    private static final String SIZE = "jakarta.validation.constraints.Size";
    private static final String SIZE_JAVAX = "javax.validation.constraints.Size";
    private static final String PATTERN = "jakarta.validation.constraints.Pattern";
    private static final String PATTERN_JAVAX = "javax.validation.constraints.Pattern";

    @Override
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(ENTITY) != null
                || processingEnv.getElementUtils().getTypeElement(ENTITY_JAVAX) != null;
    }

    @Override
    public String frameworkName() {
        return "jpa";
    }

    @Override
    public FrameworkInfo detect(TypeElement typeElement, ProcessingEnvironment processingEnv) {
        if (isEntity(typeElement)) {
            return new FrameworkInfo("entity", "Data Models", false);
        }
        return FrameworkInfo.NONE;
    }

    public boolean isEntity(TypeElement typeElement) {
        return hasAnnotation(typeElement, ENTITY) || hasAnnotation(typeElement, ENTITY_JAVAX);
    }

    @DocMethod(since = "3.0.0")
    public DataModelInfo extractDataModel(TypeElement entityElement, ProcessingEnvironment processingEnv) {
        DataModelInfo model = new DataModelInfo();
        model.setName(entityElement.getSimpleName().toString());
        model.setQualified(entityElement.getQualifiedName().toString());
        model.setDiscoveredFrom("jpa");

        // Table name
        String tableName = getTableName(entityElement);
        model.setTable(tableName);

        List<DataModelFieldModel> fields = new ArrayList<>();
        List<DataModelRelationshipModel> relationships = new ArrayList<>();

        for (Element enclosed : entityElement.getEnclosedElements()) {
            if (enclosed instanceof VariableElement field && enclosed.getKind() == ElementKind.FIELD) {
                if (field.getModifiers().contains(Modifier.STATIC)) continue;

                // Check if it's a relationship
                DataModelRelationshipModel rel = extractRelationship(field);
                if (rel != null) {
                    relationships.add(rel);
                    continue;
                }

                // Regular field
                DataModelFieldModel fieldModel = new DataModelFieldModel();
                fieldModel.setName(field.getSimpleName().toString());
                fieldModel.setType(simplifyType(field.asType().toString()));

                // Column info
                AnnotationMirror columnAnnot = findAnnotation(field, COLUMN);
                if (columnAnnot == null) columnAnnot = findAnnotation(field, COLUMN_JAVAX);
                if (columnAnnot != null) {
                    String colName = getStringValue(columnAnnot, "name", processingEnv);
                    if (colName != null && !colName.isEmpty()) {
                        fieldModel.setColumn(colName);
                    }
                    Boolean nullable = getBooleanValue(columnAnnot, "nullable", processingEnv);
                    if (nullable != null) fieldModel.setNullable(nullable);
                    Boolean unique = getBooleanValue(columnAnnot, "unique", processingEnv);
                    if (unique != null && unique) fieldModel.setUnique(true);
                    Integer length = getIntValue(columnAnnot, "length", processingEnv);
                    if (length != null && length != 255) fieldModel.setLength(length);
                } else {
                    // Default column name is the field name in snake_case
                    fieldModel.setColumn(toSnakeCase(field.getSimpleName().toString()));
                }

                // Primary key
                if (hasAnnotation(field, ID) || hasAnnotation(field, ID_JAVAX)) {
                    fieldModel.setPrimaryKey(true);
                }

                // Enumerated
                AnnotationMirror enumAnnot = findAnnotation(field, ENUMERATED);
                if (enumAnnot == null) enumAnnot = findAnnotation(field, ENUMERATED_JAVAX);
                if (enumAnnot != null) {
                    String enumType = getStringValue(enumAnnot, "value", processingEnv);
                    if (enumType != null) {
                        // Extract just the enum constant name
                        int dot = enumType.lastIndexOf('.');
                        fieldModel.setEnumType(dot >= 0 ? enumType.substring(dot + 1) : enumType);
                    }
                }

                // Validation constraints: @NotNull
                AnnotationMirror notNullAnnot = findAnnotationAny(field, NOT_NULL, NOT_NULL_JAVAX);
                if (notNullAnnot != null) {
                    fieldModel.setNullable(false);
                }

                // Validation constraints: @Size
                AnnotationMirror sizeAnnot = findAnnotationAny(field, SIZE, SIZE_JAVAX);
                if (sizeAnnot != null) {
                    Integer maxValue = getIntValue(sizeAnnot, "max", processingEnv);
                    if (maxValue != null) {
                        fieldModel.setLength(maxValue);
                    }
                }

                // Validation constraints: @Pattern
                AnnotationMirror patternAnnot = findAnnotationAny(field, PATTERN, PATTERN_JAVAX);
                if (patternAnnot != null) {
                    String regexpValue = getStringValue(patternAnnot, "regexp", processingEnv);
                    if (regexpValue != null && !regexpValue.isEmpty()) {
                        fieldModel.setPattern(regexpValue);
                    }
                }

                fields.add(fieldModel);
            }
        }

        model.setFields(fields);
        model.setRelationships(relationships);
        return model;
    }

    private DataModelRelationshipModel extractRelationship(VariableElement field) {
        String[][] relAnnotations = {
                {MANY_TO_ONE, "jakarta.persistence.ManyToOne", "MANY_TO_ONE"},
                {"javax.persistence.ManyToOne", "javax.persistence.ManyToOne", "MANY_TO_ONE"},
                {ONE_TO_MANY, "jakarta.persistence.OneToMany", "ONE_TO_MANY"},
                {"javax.persistence.OneToMany", "javax.persistence.OneToMany", "ONE_TO_MANY"},
                {MANY_TO_MANY, "jakarta.persistence.ManyToMany", "MANY_TO_MANY"},
                {"javax.persistence.ManyToMany", "javax.persistence.ManyToMany", "MANY_TO_MANY"},
                {ONE_TO_ONE, "jakarta.persistence.OneToOne", "ONE_TO_ONE"},
                {"javax.persistence.OneToOne", "javax.persistence.OneToOne", "ONE_TO_ONE"},
        };

        for (String[] relInfo : relAnnotations) {
            AnnotationMirror annot = findAnnotation(field, relInfo[0]);
            if (annot != null) {
                DataModelRelationshipModel rel = new DataModelRelationshipModel();
                rel.setType(relInfo[2]);
                rel.setField(field.getSimpleName().toString());

                // Target type
                String targetType = simplifyType(field.asType().toString());
                // For collections, extract the generic type
                String generic = extractGenericType(field.asType().toString());
                if (generic != null) {
                    rel.setTarget(simplifyType(generic));
                } else {
                    rel.setTarget(targetType);
                }

                // mappedBy
                for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                        annot.getElementValues().entrySet()) {
                    if (entry.getKey().getSimpleName().contentEquals("mappedBy")) {
                        String mappedBy = entry.getValue().getValue().toString();
                        if (!mappedBy.isEmpty()) rel.setMappedBy(mappedBy);
                    }
                    if (entry.getKey().getSimpleName().contentEquals("cascade")) {
                        rel.setCascade(entry.getValue().getValue().toString());
                    }
                }

                return rel;
            }
        }
        return null;
    }

    private String getTableName(TypeElement element) {
        AnnotationMirror tableAnnot = findAnnotation(element, TABLE);
        if (tableAnnot == null) tableAnnot = findAnnotation(element, TABLE_JAVAX);
        if (tableAnnot != null) {
            for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                    tableAnnot.getElementValues().entrySet()) {
                if (entry.getKey().getSimpleName().contentEquals("name")) {
                    return entry.getValue().getValue().toString();
                }
            }
        }
        // Default: class name to snake_case + plural
        return toSnakeCase(element.getSimpleName().toString()) + "s";
    }

    private boolean hasAnnotation(Element element, String annotationQualifiedName) {
        return findAnnotation(element, annotationQualifiedName) != null;
    }

    private AnnotationMirror findAnnotation(Element element, String annotationQualifiedName) {
        for (AnnotationMirror mirror : element.getAnnotationMirrors()) {
            TypeElement annotationType = (TypeElement) mirror.getAnnotationType().asElement();
            if (annotationType.getQualifiedName().contentEquals(annotationQualifiedName)) {
                return mirror;
            }
        }
        return null;
    }

    private AnnotationMirror findAnnotationAny(Element element, String... qualifiedNames) {
        for (AnnotationMirror mirror : element.getAnnotationMirrors()) {
            String annotName = ((TypeElement) mirror.getAnnotationType().asElement()).getQualifiedName().toString();
            for (String name : qualifiedNames) {
                if (annotName.equals(name)) return mirror;
            }
        }
        return null;
    }

    private String getStringValue(AnnotationMirror mirror, String key, ProcessingEnvironment processingEnv) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                return value != null ? value.toString() : null;
            }
        }
        return null;
    }

    private Boolean getBooleanValue(AnnotationMirror mirror, String key, ProcessingEnvironment processingEnv) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof Boolean b) return b;
            }
        }
        return null;
    }

    private Integer getIntValue(AnnotationMirror mirror, String key, ProcessingEnvironment processingEnv) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof Integer i) return i;
                if (value instanceof Number n) return n.intValue();
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
}
