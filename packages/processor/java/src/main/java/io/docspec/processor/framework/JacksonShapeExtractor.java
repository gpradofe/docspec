package io.docspec.processor.framework;

import io.docspec.annotation.*;
import io.docspec.processor.model.JsonShapeModel;
import io.docspec.processor.model.JsonShapeFieldModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@DocBoundary("framework detection without compile deps")
public class JacksonShapeExtractor implements FrameworkDetector {

    private static final String JSON_PROPERTY = "com.fasterxml.jackson.annotation.JsonProperty";
    private static final String JSON_IGNORE = "com.fasterxml.jackson.annotation.JsonIgnore";
    private static final String JSON_NAMING = "com.fasterxml.jackson.databind.annotation.JsonNaming";
    private static final String JSON_SUB_TYPES = "com.fasterxml.jackson.annotation.JsonSubTypes";

    @Override
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(JSON_PROPERTY) != null;
    }

    @Override
    public String frameworkName() {
        return "jackson";
    }

    @Override
    public FrameworkInfo detect(TypeElement typeElement, ProcessingEnvironment processingEnv) {
        // Jackson doesn't determine stereotypes — it provides JSON shape info
        return FrameworkInfo.NONE;
    }

    @DocMethod(since = "3.0.0")
    public JsonShapeModel extractJsonShape(TypeElement typeElement, ProcessingEnvironment processingEnv) {
        List<JsonShapeFieldModel> shapeFields = new ArrayList<>();
        boolean hasJacksonAnnotations = false;

        // Check for class-level @JsonNaming
        String namingStrategy = getNamingStrategy(typeElement);

        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (enclosed instanceof VariableElement field && enclosed.getKind() == ElementKind.FIELD) {
                if (field.getModifiers().contains(Modifier.STATIC)) continue;

                // Skip @JsonIgnore fields
                if (hasAnnotation(field, JSON_IGNORE)) {
                    hasJacksonAnnotations = true;
                    continue;
                }

                JsonShapeFieldModel shapeField = new JsonShapeFieldModel();
                shapeField.setName(field.getSimpleName().toString());
                shapeField.setType(simplifyType(field.asType().toString()));

                // Check @JsonProperty for custom name
                AnnotationMirror jsonProp = findAnnotation(field, JSON_PROPERTY);
                if (jsonProp != null) {
                    hasJacksonAnnotations = true;
                    String propName = getAnnotationStringValue(jsonProp, "value", processingEnv);
                    if (propName != null && !propName.isEmpty()) {
                        shapeField.setJsonProperty(propName);
                    }
                } else if (namingStrategy != null) {
                    // Apply naming strategy
                    String jsonName = applyNamingStrategy(field.getSimpleName().toString(), namingStrategy);
                    if (!jsonName.equals(field.getSimpleName().toString())) {
                        shapeField.setJsonProperty(jsonName);
                    }
                }

                // Check if field type is an enum — extract values
                TypeElement fieldType = resolveTypeElement(field, processingEnv);
                if (fieldType != null && fieldType.getKind() == ElementKind.ENUM) {
                    List<String> enumValues = new ArrayList<>();
                    for (Element enumEl : fieldType.getEnclosedElements()) {
                        if (enumEl.getKind() == ElementKind.ENUM_CONSTANT) {
                            enumValues.add(enumEl.getSimpleName().toString());
                        }
                    }
                    if (!enumValues.isEmpty()) {
                        shapeField.setEnumValues(enumValues);
                    }
                }

                shapeFields.add(shapeField);
            }
        }

        // Detect @JsonSubTypes polymorphic hierarchy
        List<String> subtypeNames = new ArrayList<>();
        AnnotationMirror jsonSubTypes = findAnnotation(typeElement, JSON_SUB_TYPES);
        if (jsonSubTypes != null) {
            hasJacksonAnnotations = true;
            for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                    processingEnv.getElementUtils().getElementValuesWithDefaults(jsonSubTypes).entrySet()) {
                if (entry.getKey().getSimpleName().contentEquals("value")) {
                    @SuppressWarnings("unchecked")
                    List<? extends AnnotationValue> typeEntries =
                            (List<? extends AnnotationValue>) entry.getValue().getValue();
                    for (AnnotationValue typeEntry : typeEntries) {
                        AnnotationMirror typeMirror = (AnnotationMirror) typeEntry.getValue();
                        String name = null;
                        String className = null;
                        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> attr :
                                processingEnv.getElementUtils().getElementValuesWithDefaults(typeMirror).entrySet()) {
                            String attrName = attr.getKey().getSimpleName().toString();
                            if ("name".equals(attrName)) {
                                Object val = attr.getValue().getValue();
                                if (val instanceof String s && !s.isEmpty()) {
                                    name = s;
                                }
                            } else if ("value".equals(attrName)) {
                                // TypeMirror — simplify to simple class name
                                String fullName = attr.getValue().getValue().toString();
                                int dotIdx = fullName.lastIndexOf('.');
                                className = dotIdx >= 0 ? fullName.substring(dotIdx + 1) : fullName;
                            }
                        }
                        // Prefer the explicit name; fall back to the class name
                        if (name != null) {
                            subtypeNames.add(name);
                        } else if (className != null) {
                            subtypeNames.add(className);
                        }
                    }
                }
            }
        }

        // Also include public getter methods without fields (computed properties)
        // Only if there are Jackson annotations present
        if (!shapeFields.isEmpty() || hasJacksonAnnotations) {
            JsonShapeModel shape = new JsonShapeModel();
            shape.setDescription("JSON representation for API responses");
            shape.setFields(shapeFields);
            if (!subtypeNames.isEmpty()) {
                shape.setSubtypes(subtypeNames);
            }
            return shape;
        }

        return null;
    }

    private String getNamingStrategy(TypeElement typeElement) {
        AnnotationMirror naming = findAnnotation(typeElement, JSON_NAMING);
        if (naming != null) {
            for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                    naming.getElementValues().entrySet()) {
                String value = entry.getValue().getValue().toString();
                if (value.contains("SnakeCaseStrategy") || value.contains("SNAKE_CASE")) {
                    return "SNAKE_CASE";
                }
                if (value.contains("KebabCaseStrategy") || value.contains("KEBAB_CASE")) {
                    return "KEBAB_CASE";
                }
            }
        }
        return null;
    }

    private String applyNamingStrategy(String fieldName, String strategy) {
        return switch (strategy) {
            case "SNAKE_CASE" -> toSnakeCase(fieldName);
            case "KEBAB_CASE" -> toSnakeCase(fieldName).replace('_', '-');
            default -> fieldName;
        };
    }

    private TypeElement resolveTypeElement(VariableElement field, ProcessingEnvironment processingEnv) {
        try {
            String typeName = field.asType().toString();
            // Remove generics
            int angleIdx = typeName.indexOf('<');
            if (angleIdx > 0) typeName = typeName.substring(0, angleIdx);
            return processingEnv.getElementUtils().getTypeElement(typeName);
        } catch (Exception e) {
            return null;
        }
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

    private String getAnnotationStringValue(AnnotationMirror mirror, String key, ProcessingEnvironment env) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                env.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object val = entry.getValue().getValue();
                return val instanceof String s ? s : (val != null ? val.toString() : null);
            }
        }
        return null;
    }

    private String simplifyType(String fullType) {
        return fullType.replaceAll("java\\.lang\\.", "").replaceAll("java\\.util\\.", "");
    }

    private String toSnakeCase(String camelCase) {
        return camelCase.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase();
    }
}
