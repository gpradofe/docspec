package io.docspec.processor.extractor;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.DocSpecModel;
import io.docspec.processor.model.ExternalDependencyEndpointModel;
import io.docspec.processor.model.ExternalDependencyModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import java.util.*;

/**
 * Detects external service calls via {@code RestTemplate}, {@code WebClient},
 * {@code RestClient}, and {@code @FeignClient} annotations, and populates the
 * external dependencies section of the DocSpec model.
 */
@DocBoundary("classpath-safe extraction")
public class ExternalDependencyExtractor implements DocSpecExtractor {

    private static final String REST_TEMPLATE = "org.springframework.web.client.RestTemplate";
    private static final String WEB_CLIENT = "org.springframework.web.reactive.function.client.WebClient";
    private static final String REST_CLIENT = "org.springframework.web.client.RestClient";
    private static final String FEIGN_CLIENT = "org.springframework.cloud.openfeign.FeignClient";

    private static final Map<String, String> MAPPING_TO_METHOD = Map.of(
            "org.springframework.web.bind.annotation.GetMapping", "GET",
            "org.springframework.web.bind.annotation.PostMapping", "POST",
            "org.springframework.web.bind.annotation.PutMapping", "PUT",
            "org.springframework.web.bind.annotation.DeleteMapping", "DELETE",
            "org.springframework.web.bind.annotation.PatchMapping", "PATCH"
    );
    private static final String REQUEST_MAPPING = "org.springframework.web.bind.annotation.RequestMapping";

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(REST_TEMPLATE) != null;
    }

    @Override
    public String extractorName() {
        return "external-dependency";
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        String ownerQualified = typeElement.getQualifiedName().toString();

        // Check if type has @FeignClient
        AnnotationMirror feignClient = findAnnotation(typeElement, FEIGN_CLIENT);
        if (feignClient != null) {
            extractFeignClient(typeElement, feignClient, processingEnv, model);
            return; // Feign clients are complete external dependency declarations
        }

        // Check fields for RestTemplate, WebClient, RestClient
        boolean hasHttpClient = false;
        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (enclosed instanceof VariableElement field && enclosed.getKind() == ElementKind.FIELD) {
                String fieldType = processingEnv.getTypeUtils().erasure(field.asType()).toString();
                if (fieldType.equals(REST_TEMPLATE) || fieldType.equals(WEB_CLIENT)
                        || fieldType.equals(REST_CLIENT)) {
                    hasHttpClient = true;
                    break;
                }
            }
        }

        if (hasHttpClient) {
            // We can detect that this class makes external calls, but we cannot
            // determine the specific URL/service without deeper analysis. Create
            // a placeholder entry.
            ExternalDependencyModel dep = new ExternalDependencyModel();
            dep.setName("external-via-" + typeElement.getSimpleName().toString());
            dep.setBaseUrl("(detected from HTTP client field)");
            model.getExternalDependencies().add(dep);
        }
    }

    private void extractFeignClient(TypeElement typeElement, AnnotationMirror feignClient,
                                     ProcessingEnvironment processingEnv, DocSpecModel model) {
        String name = getStringValue(feignClient, "name", processingEnv);
        if (name == null) {
            name = getStringValue(feignClient, "value", processingEnv);
        }
        if (name == null) {
            name = typeElement.getSimpleName().toString();
        }

        String url = getStringValue(feignClient, "url", processingEnv);

        ExternalDependencyModel dep = new ExternalDependencyModel();
        dep.setName(name);
        if (url != null) {
            dep.setBaseUrl(url);
        }

        // Extract methods as endpoints
        List<ExternalDependencyEndpointModel> endpoints = new ArrayList<>();
        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (!(enclosed instanceof ExecutableElement method)) {
                continue;
            }

            String httpMethod = null;
            String path = null;

            for (AnnotationMirror annotation : method.getAnnotationMirrors()) {
                String annotName = ((TypeElement) annotation.getAnnotationType().asElement())
                        .getQualifiedName().toString();

                String mappedMethod = MAPPING_TO_METHOD.get(annotName);
                if (mappedMethod != null) {
                    httpMethod = mappedMethod;
                    path = extractPathFromMapping(annotation);
                    break;
                }

                if (annotName.equals(REQUEST_MAPPING)) {
                    httpMethod = extractMethodFromRequestMapping(annotation, processingEnv);
                    if (httpMethod == null) httpMethod = "GET";
                    path = extractPathFromMapping(annotation);
                    break;
                }
            }

            if (httpMethod != null) {
                ExternalDependencyEndpointModel ep = new ExternalDependencyEndpointModel();
                ep.setMethod(httpMethod);
                ep.setPath(path != null ? path : "/");
                ep.setUsedBy(List.of(typeElement.getQualifiedName().toString() + "." + method.getSimpleName()));
                endpoints.add(ep);
            }
        }

        dep.setEndpoints(endpoints);
        model.getExternalDependencies().add(dep);
    }

    // --- Private helpers ---

    private String extractPathFromMapping(AnnotationMirror annotation) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                annotation.getElementValues().entrySet()) {
            String key = entry.getKey().getSimpleName().toString();
            if ("value".equals(key) || "path".equals(key)) {
                Object val = entry.getValue().getValue();
                if (val instanceof java.util.List<?> list && !list.isEmpty()) {
                    return ((AnnotationValue) list.get(0)).getValue().toString();
                }
                return val.toString();
            }
        }
        return "";
    }

    private String extractMethodFromRequestMapping(AnnotationMirror annotation, ProcessingEnvironment processingEnv) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                annotation.getElementValues().entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals("method")) {
                Object val = entry.getValue().getValue();
                if (val instanceof java.util.List<?> list && !list.isEmpty()) {
                    String method = ((AnnotationValue) list.get(0)).getValue().toString();
                    int dot = method.lastIndexOf('.');
                    return dot >= 0 ? method.substring(dot + 1) : method;
                }
                String method = val.toString();
                int dot = method.lastIndexOf('.');
                return dot >= 0 ? method.substring(dot + 1) : method;
            }
        }
        return null;
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
