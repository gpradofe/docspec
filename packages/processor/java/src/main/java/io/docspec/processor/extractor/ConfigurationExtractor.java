package io.docspec.processor.extractor;

import io.docspec.annotation.*;
import io.docspec.processor.model.ConfigurationPropertyModel;
import io.docspec.processor.model.DocSpecModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Detects {@code @Value("${...}")} fields and {@code @ConfigurationProperties} classes,
 * and populates the configuration section of the DocSpec model.
 */
@DocBoundary("classpath-safe extraction")
public class ConfigurationExtractor implements DocSpecExtractor {

    private static final String SPRING_VALUE = "org.springframework.beans.factory.annotation.Value";
    private static final String CONFIGURATION_PROPERTIES = "org.springframework.boot.context.properties.ConfigurationProperties";

    /** Pattern to extract key and optional default from @Value("${key:default}") */
    private static final Pattern VALUE_PATTERN = Pattern.compile("\\$\\{([^:}]+)(?::([^}]*))?}");

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(SPRING_VALUE) != null;
    }

    @Override
    public String extractorName() {
        return "configuration";
    }

    @Override
    @DocMethod(since = "3.0.0")
    @DocBoundary("configuration extraction entry point")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        String ownerQualified = typeElement.getQualifiedName().toString();
        List<ConfigurationPropertyModel> properties = new ArrayList<>();

        // Check if the type has @ConfigurationProperties
        AnnotationMirror configProps = findAnnotation(typeElement, CONFIGURATION_PROPERTIES);
        if (configProps != null) {
            String prefix = getStringValue(configProps, "prefix", processingEnv);
            if (prefix == null) {
                prefix = getStringValue(configProps, "value", processingEnv);
            }
            extractConfigurationPropertiesFields(typeElement, prefix, ownerQualified, properties);
        }

        // Check fields for @Value annotations
        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (!(enclosed instanceof VariableElement field) || enclosed.getKind() != ElementKind.FIELD) {
                continue;
            }

            AnnotationMirror valueMirror = findAnnotation(field, SPRING_VALUE);
            if (valueMirror == null) {
                continue;
            }

            String valueExpression = getStringValue(valueMirror, "value", processingEnv);
            if (valueExpression == null) {
                continue;
            }

            Matcher matcher = VALUE_PATTERN.matcher(valueExpression);
            if (matcher.find()) {
                String key = matcher.group(1);
                String defaultValue = matcher.group(2);

                ConfigurationPropertyModel prop = new ConfigurationPropertyModel();
                prop.setKey(key);
                prop.setType(simplifyType(field.asType().toString()));
                if (defaultValue != null && !defaultValue.isEmpty()) {
                    prop.setDefaultValue(defaultValue);
                }
                prop.setSource("@Value");
                prop.setUsedBy(List.of(ownerQualified));
                properties.add(prop);
            }
        }

        if (!properties.isEmpty()) {
            model.getConfiguration().addAll(properties);
        }
    }

    private void extractConfigurationPropertiesFields(TypeElement typeElement, String prefix,
                                                       String ownerQualified,
                                                       List<ConfigurationPropertyModel> properties) {
        String effectivePrefix = (prefix != null && !prefix.isEmpty()) ? prefix + "." : "";

        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (!(enclosed instanceof VariableElement field) || enclosed.getKind() != ElementKind.FIELD) {
                continue;
            }
            if (field.getModifiers().contains(Modifier.STATIC)) {
                continue;
            }

            String fieldName = field.getSimpleName().toString();
            String key = effectivePrefix + camelToKebab(fieldName);

            ConfigurationPropertyModel prop = new ConfigurationPropertyModel();
            prop.setKey(key);
            prop.setType(simplifyType(field.asType().toString()));
            prop.setSource("@ConfigurationProperties");
            prop.setUsedBy(List.of(ownerQualified));
            properties.add(prop);
        }
    }

    // --- Private helpers ---

    private String camelToKebab(String camelCase) {
        return camelCase.replaceAll("([a-z])([A-Z])", "$1-$2").toLowerCase();
    }

    private String simplifyType(String fullType) {
        return fullType
                .replaceAll("java\\.lang\\.", "")
                .replaceAll("java\\.util\\.", "");
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

    private String getStringValue(AnnotationMirror mirror, String key, ProcessingEnvironment processingEnv) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof String s) {
                    return s.isEmpty() ? null : s;
                }
                return value != null ? value.toString() : null;
            }
        }
        return null;
    }
}
