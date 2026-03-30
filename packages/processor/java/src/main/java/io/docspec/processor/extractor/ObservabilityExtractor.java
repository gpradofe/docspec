package io.docspec.processor.extractor;

import io.docspec.annotation.*;
import io.docspec.processor.model.DocSpecModel;
import io.docspec.processor.model.ObservabilityHealthCheckModel;
import io.docspec.processor.model.ObservabilityMetricModel;
import io.docspec.processor.model.ObservabilityModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import javax.lang.model.type.TypeMirror;
import java.util.*;

@DocBoundary("Detects Micrometer annotations @Timed and @Counted plus Spring Actuator health indicators, populating the observability section of the DocSpec model.")
public class ObservabilityExtractor implements DocSpecExtractor {

    private static final String TIMED = "io.micrometer.core.annotation.Timed";
    private static final String COUNTED = "io.micrometer.core.annotation.Counted";
    private static final String HEALTH_INDICATOR = "org.springframework.boot.actuate.health.HealthIndicator";

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(TIMED) != null;
    }

    @Override
    public String extractorName() {
        return "observability";
    }

    @Override
    @DocMethod(since = "3.0.0")
    @DocBoundary("observability extraction entry point")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        String ownerQualified = typeElement.getQualifiedName().toString();
        List<ObservabilityMetricModel> metrics = new ArrayList<>();
        ObservabilityHealthCheckModel healthCheck = null;

        // Check methods for @Timed and @Counted
        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (!(enclosed instanceof ExecutableElement method)) {
                continue;
            }

            // @Timed
            AnnotationMirror timed = findAnnotation(method, TIMED);
            if (timed != null) {
                ObservabilityMetricModel metric = new ObservabilityMetricModel();
                String name = getStringValue(timed, "value", processingEnv);
                if (name == null || name.isEmpty()) {
                    name = ownerQualified + "." + method.getSimpleName().toString();
                }
                metric.setName(name);
                metric.setType("timer");
                metric.setEmittedBy(List.of(ownerQualified + "." + method.getSimpleName().toString()));

                // Extract extra tags if present
                List<String> extraTags = getStringArrayValue(timed, "extraTags", processingEnv);
                if (extraTags != null && !extraTags.isEmpty()) {
                    // extraTags are key-value pairs: [key1, val1, key2, val2, ...]
                    List<String> labels = new ArrayList<>();
                    for (int i = 0; i + 1 < extraTags.size(); i += 2) {
                        labels.add(extraTags.get(i));
                    }
                    metric.setLabels(labels);
                }

                metrics.add(metric);
            }

            // @Counted
            AnnotationMirror counted = findAnnotation(method, COUNTED);
            if (counted != null) {
                ObservabilityMetricModel metric = new ObservabilityMetricModel();
                String name = getStringValue(counted, "value", processingEnv);
                if (name == null || name.isEmpty()) {
                    name = ownerQualified + "." + method.getSimpleName().toString() + ".count";
                }
                metric.setName(name);
                metric.setType("counter");
                metric.setEmittedBy(List.of(ownerQualified + "." + method.getSimpleName().toString()));

                List<String> extraTags = getStringArrayValue(counted, "extraTags", processingEnv);
                if (extraTags != null && !extraTags.isEmpty()) {
                    List<String> labels = new ArrayList<>();
                    for (int i = 0; i + 1 < extraTags.size(); i += 2) {
                        labels.add(extraTags.get(i));
                    }
                    metric.setLabels(labels);
                }

                metrics.add(metric);
            }
        }

        // Check if type implements HealthIndicator
        if (implementsInterface(typeElement, HEALTH_INDICATOR, processingEnv)) {
            healthCheck = new ObservabilityHealthCheckModel();
            healthCheck.setPath("/actuator/health");
            healthCheck.setChecks(List.of(typeElement.getSimpleName().toString()));
        }

        if (metrics.isEmpty() && healthCheck == null) {
            return;
        }

        // Initialize observability model if needed
        ObservabilityModel observability = model.getObservability();
        if (observability == null) {
            observability = new ObservabilityModel();
            model.setObservability(observability);
        }

        observability.getMetrics().addAll(metrics);
        if (healthCheck != null) {
            observability.getHealthChecks().add(healthCheck);
        }
    }

    // --- Private helpers ---

    private boolean implementsInterface(TypeElement typeElement, String interfaceQualifiedName,
                                         ProcessingEnvironment processingEnv) {
        TypeElement targetInterface = processingEnv.getElementUtils().getTypeElement(interfaceQualifiedName);
        if (targetInterface == null) {
            return false;
        }
        TypeMirror targetType = targetInterface.asType();

        // Check all interfaces implemented by this type (including inherited)
        for (TypeMirror iface : typeElement.getInterfaces()) {
            String ifaceName = processingEnv.getTypeUtils().erasure(iface).toString();
            if (ifaceName.equals(interfaceQualifiedName)) {
                return true;
            }
        }

        // Check superclass chain
        TypeMirror superclass = typeElement.getSuperclass();
        if (superclass != null && !superclass.toString().equals("java.lang.Object")
                && !superclass.toString().equals("none")) {
            Element superElement = processingEnv.getTypeUtils().asElement(superclass);
            if (superElement instanceof TypeElement superType) {
                return implementsInterface(superType, interfaceQualifiedName, processingEnv);
            }
        }

        return false;
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

    @SuppressWarnings("unchecked")
    private List<String> getStringArrayValue(AnnotationMirror mirror, String key, ProcessingEnvironment processingEnv) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof List<?> list) {
                    List<String> result = new ArrayList<>();
                    for (Object item : list) {
                        if (item instanceof AnnotationValue av) {
                            result.add(av.getValue().toString());
                        }
                    }
                    return result.isEmpty() ? null : result;
                }
            }
        }
        return null;
    }
}
