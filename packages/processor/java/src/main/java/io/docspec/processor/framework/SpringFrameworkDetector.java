package io.docspec.processor.framework;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.EndpointMappingModel;
import io.docspec.processor.model.MethodModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@DocBoundary("framework detection without compile deps")
public class SpringFrameworkDetector implements FrameworkDetector {

    private static final String REST_CONTROLLER = "org.springframework.web.bind.annotation.RestController";
    private static final String CONTROLLER = "org.springframework.stereotype.Controller";
    private static final String SERVICE = "org.springframework.stereotype.Service";
    private static final String REPOSITORY = "org.springframework.stereotype.Repository";
    private static final String COMPONENT = "org.springframework.stereotype.Component";
    private static final String CONFIGURATION = "org.springframework.context.annotation.Configuration";
    private static final String SCHEDULED = "org.springframework.scheduling.annotation.Scheduled";
    private static final String EVENT_LISTENER = "org.springframework.context.event.EventListener";
    private static final String TRANSACTIONAL = "org.springframework.transaction.annotation.Transactional";
    private static final String CACHEABLE = "org.springframework.cache.annotation.Cacheable";

    private static final Map<String, StereotypeMapping> STEREOTYPE_MAP = Map.of(
            REST_CONTROLLER, new StereotypeMapping("api", "API Controllers"),
            CONTROLLER, new StereotypeMapping("api", "Controllers"),
            SERVICE, new StereotypeMapping("service", "Services"),
            REPOSITORY, new StereotypeMapping("data-access", "Repositories"),
            COMPONENT, new StereotypeMapping("component", "Components"),
            CONFIGURATION, new StereotypeMapping("configuration", null) // excluded by default
    );

    @Override
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(SERVICE) != null
                || processingEnv.getElementUtils().getTypeElement(REST_CONTROLLER) != null;
    }

    @Override
    public String frameworkName() {
        return "spring-boot";
    }

    @Override
    public FrameworkInfo detect(TypeElement typeElement, ProcessingEnvironment processingEnv) {
        for (AnnotationMirror annotation : typeElement.getAnnotationMirrors()) {
            String annotName = ((TypeElement) annotation.getAnnotationType().asElement())
                    .getQualifiedName().toString();

            StereotypeMapping mapping = STEREOTYPE_MAP.get(annotName);
            if (mapping != null) {
                if (annotName.equals(CONFIGURATION)) {
                    return FrameworkInfo.EXCLUDED;
                }
                return new FrameworkInfo(mapping.stereotype, mapping.moduleGroup, false);
            }
        }

        // Check for @Scheduled methods inside the class
        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (enclosed instanceof ExecutableElement method) {
                if (hasAnnotation(method, SCHEDULED)) {
                    return new FrameworkInfo("job", "Scheduled Jobs", false);
                }
                if (hasAnnotation(method, EVENT_LISTENER)) {
                    return new FrameworkInfo("event-handler", "Event Handlers", false);
                }
            }
        }

        return FrameworkInfo.NONE;
    }

    /**
     * Applies method-level Spring annotations (@Transactional, @Cacheable) to the method model.
     */
    @DocMethod(since = "3.0.0")
    public void applyMethodAnnotations(ExecutableElement method, MethodModel methodModel) {
        List<String> tags = methodModel.getTags() != null ? new ArrayList<>(methodModel.getTags()) : new ArrayList<>();
        boolean changed = false;

        if (hasAnnotation(method, TRANSACTIONAL)) {
            tags.add("transactional");
            changed = true;
        }
        if (hasAnnotation(method, CACHEABLE)) {
            tags.add("cacheable");
            changed = true;
        }

        if (changed) {
            methodModel.setTags(tags);
        }
    }

    public boolean isScheduledMethod(ExecutableElement method) {
        return hasAnnotation(method, SCHEDULED);
    }

    public boolean isEventListenerMethod(ExecutableElement method) {
        return hasAnnotation(method, EVENT_LISTENER);
    }

    /**
     * Gets the class-level @RequestMapping base path for a controller.
     */
    public String getClassBasePath(TypeElement typeElement) {
        AnnotationMirror requestMapping = findAnnotation(typeElement,
                "org.springframework.web.bind.annotation.RequestMapping");
        if (requestMapping != null) {
            return extractPathFromMapping(requestMapping);
        }
        return "";
    }

    /**
     * Extracts an EndpointMappingModel from Spring @GetMapping/@PostMapping/etc.
     * Returns null if the method has no Spring mapping annotation.
     */
    @DocMethod(since = "3.0.0")
    public EndpointMappingModel extractEndpointMapping(ExecutableElement method, String basePath) {
        Map<String, String> MAPPING_TO_METHOD = Map.of(
                "org.springframework.web.bind.annotation.GetMapping", "GET",
                "org.springframework.web.bind.annotation.PostMapping", "POST",
                "org.springframework.web.bind.annotation.PutMapping", "PUT",
                "org.springframework.web.bind.annotation.DeleteMapping", "DELETE",
                "org.springframework.web.bind.annotation.PatchMapping", "PATCH"
        );

        for (AnnotationMirror annotation : method.getAnnotationMirrors()) {
            String annotName = ((TypeElement) annotation.getAnnotationType().asElement())
                    .getQualifiedName().toString();

            // Check specific HTTP method mappings
            String httpMethod = MAPPING_TO_METHOD.get(annotName);
            if (httpMethod != null) {
                String path = extractPathFromMapping(annotation);
                EndpointMappingModel mapping = new EndpointMappingModel();
                mapping.setMethod(httpMethod);
                mapping.setPath(normalizePath(basePath, path));
                return mapping;
            }

            // Check generic @RequestMapping
            if (annotName.equals("org.springframework.web.bind.annotation.RequestMapping")) {
                String path = extractPathFromMapping(annotation);
                String reqMethod = extractMethodFromRequestMapping(annotation);
                EndpointMappingModel mapping = new EndpointMappingModel();
                mapping.setMethod(reqMethod != null ? reqMethod : "GET");
                mapping.setPath(normalizePath(basePath, path));
                return mapping;
            }
        }
        return null;
    }

    public String getRequestMappingPath(ExecutableElement method) {
        // Check for @GetMapping, @PostMapping, etc.
        String[] mappingAnnotations = {
                "org.springframework.web.bind.annotation.GetMapping",
                "org.springframework.web.bind.annotation.PostMapping",
                "org.springframework.web.bind.annotation.PutMapping",
                "org.springframework.web.bind.annotation.DeleteMapping",
                "org.springframework.web.bind.annotation.PatchMapping",
                "org.springframework.web.bind.annotation.RequestMapping"
        };

        for (AnnotationMirror annotation : method.getAnnotationMirrors()) {
            String annotName = ((TypeElement) annotation.getAnnotationType().asElement())
                    .getQualifiedName().toString();
            for (String mappingAnnotation : mappingAnnotations) {
                if (annotName.equals(mappingAnnotation)) {
                    return extractPathFromMapping(annotation);
                }
            }
        }
        return null;
    }

    private String extractPathFromMapping(AnnotationMirror annotation) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                annotation.getElementValues().entrySet()) {
            String key = entry.getKey().getSimpleName().toString();
            if (key.equals("value") || key.equals("path")) {
                Object val = entry.getValue().getValue();
                if (val instanceof java.util.List<?> list && !list.isEmpty()) {
                    return ((AnnotationValue) list.get(0)).getValue().toString();
                }
                return val.toString();
            }
        }
        return "";
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

    private String extractMethodFromRequestMapping(AnnotationMirror annotation) {
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

    private String normalizePath(String basePath, String methodPath) {
        String base = basePath != null ? basePath : "";
        String method = methodPath != null ? methodPath : "";
        if (!base.startsWith("/") && !base.isEmpty()) base = "/" + base;
        if (!method.startsWith("/") && !method.isEmpty()) method = "/" + method;
        String result = base + method;
        return result.isEmpty() ? "/" : result;
    }

    /**
     * Extracts cron or fixedRate info from @Scheduled annotation.
     */
    public String getScheduleInfo(ExecutableElement method) {
        AnnotationMirror scheduled = findAnnotation(method, SCHEDULED);
        if (scheduled == null) return null;
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                scheduled.getElementValues().entrySet()) {
            String key = entry.getKey().getSimpleName().toString();
            String value = entry.getValue().getValue().toString();
            if ("cron".equals(key) && !value.isEmpty()) {
                return "cron: " + value;
            }
            if ("fixedRate".equals(key) || "fixedDelay".equals(key)) {
                return key + ": " + value + "ms";
            }
            if ("fixedRateString".equals(key) || "fixedDelayString".equals(key)) {
                return key.replace("String", "") + ": " + value;
            }
        }
        return "scheduled";
    }

    private boolean hasAnnotation(Element element, String annotationQualifiedName) {
        for (AnnotationMirror mirror : element.getAnnotationMirrors()) {
            TypeElement annotationType = (TypeElement) mirror.getAnnotationType().asElement();
            if (annotationType.getQualifiedName().contentEquals(annotationQualifiedName)) {
                return true;
            }
        }
        return false;
    }

    private record StereotypeMapping(String stereotype, String moduleGroup) {}
}
