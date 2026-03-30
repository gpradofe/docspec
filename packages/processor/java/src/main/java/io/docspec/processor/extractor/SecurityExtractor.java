package io.docspec.processor.extractor;

import io.docspec.annotation.*;
import io.docspec.processor.model.DocSpecModel;
import io.docspec.processor.model.SecurityEndpointRuleModel;
import io.docspec.processor.model.SecurityModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import java.util.*;

@DocBoundary("Detects Spring Security annotations @PreAuthorize, @Secured, @RolesAllowed on types and methods and populates the security section of the DocSpec model.")
@DocEvent(name = "docspec.extraction.security",
    description = "Emitted when Spring Security annotations have been extracted from a type.",
    trigger = "Type has @PreAuthorize, @Secured, or @RolesAllowed annotations",
    channel = "compiler-diagnostics",
    since = "3.0"
)
public class SecurityExtractor implements DocSpecExtractor {

    private static final String PRE_AUTHORIZE = "org.springframework.security.access.prepost.PreAuthorize";
    private static final String SECURED = "org.springframework.security.access.annotation.Secured";
    private static final String ROLES_ALLOWED_JAVAX = "javax.annotation.security.RolesAllowed";
    private static final String ROLES_ALLOWED_JAKARTA = "jakarta.annotation.security.RolesAllowed";

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
        return processingEnv.getElementUtils().getTypeElement(PRE_AUTHORIZE) != null;
    }

    @Override
    public String extractorName() {
        return "security";
    }

    @Override
    @DocMethod(since = "3.0.0")
    @DocBoundary("security extraction entry point")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        String basePath = getClassBasePath(typeElement);
        Set<String> allRoles = new LinkedHashSet<>();
        List<SecurityEndpointRuleModel> endpointRules = new ArrayList<>();

        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (!(enclosed instanceof ExecutableElement method)) {
                continue;
            }

            List<String> rules = new ArrayList<>();

            // Check @PreAuthorize
            AnnotationMirror preAuth = findAnnotation(method, PRE_AUTHORIZE);
            if (preAuth != null) {
                String expression = getStringValue(preAuth, "value", processingEnv);
                if (expression != null) {
                    rules.add("PreAuthorize: " + expression);
                    extractRolesFromExpression(expression, allRoles);
                }
            }

            // Check @Secured
            AnnotationMirror secured = findAnnotation(method, SECURED);
            if (secured != null) {
                List<String> securedRoles = getStringArrayValue(secured, "value", processingEnv);
                if (securedRoles != null) {
                    for (String role : securedRoles) {
                        rules.add("Secured: " + role);
                        allRoles.add(role.startsWith("ROLE_") ? role.substring(5) : role);
                    }
                }
            }

            // Check @RolesAllowed (javax and jakarta)
            for (String rolesAllowedAnnotation : List.of(ROLES_ALLOWED_JAVAX, ROLES_ALLOWED_JAKARTA)) {
                AnnotationMirror rolesAllowed = findAnnotation(method, rolesAllowedAnnotation);
                if (rolesAllowed != null) {
                    List<String> roles = getStringArrayValue(rolesAllowed, "value", processingEnv);
                    if (roles != null) {
                        for (String role : roles) {
                            rules.add("RolesAllowed: " + role);
                            allRoles.add(role);
                        }
                    }
                }
            }

            if (!rules.isEmpty()) {
                String methodPath = getMethodPath(method);
                if (methodPath != null) {
                    SecurityEndpointRuleModel rule = new SecurityEndpointRuleModel();
                    rule.setPath(normalizePath(basePath, methodPath));
                    rule.setRules(rules);
                    rule.setPublic(false);
                    endpointRules.add(rule);
                }
            }
        }

        // Also check class-level security annotations
        List<String> classRules = new ArrayList<>();
        AnnotationMirror classPreAuth = findAnnotation(typeElement, PRE_AUTHORIZE);
        if (classPreAuth != null) {
            String expression = getStringValue(classPreAuth, "value", processingEnv);
            if (expression != null) {
                classRules.add("PreAuthorize: " + expression);
                extractRolesFromExpression(expression, allRoles);
            }
        }
        AnnotationMirror classSecured = findAnnotation(typeElement, SECURED);
        if (classSecured != null) {
            List<String> securedRoles = getStringArrayValue(classSecured, "value", processingEnv);
            if (securedRoles != null) {
                for (String role : securedRoles) {
                    classRules.add("Secured: " + role);
                    allRoles.add(role.startsWith("ROLE_") ? role.substring(5) : role);
                }
            }
        }

        if (endpointRules.isEmpty() && classRules.isEmpty()) {
            return;
        }

        // Initialize security model if needed
        SecurityModel security = model.getSecurity();
        if (security == null) {
            security = new SecurityModel();
            model.setSecurity(security);
        }

        // Add endpoint rules
        security.getEndpoints().addAll(endpointRules);

        // Merge roles (avoiding duplicates)
        Set<String> existingRoles = new LinkedHashSet<>(security.getRoles());
        existingRoles.addAll(allRoles);
        security.setRoles(new ArrayList<>(existingRoles));
    }

    // --- Private helpers ---

    private void extractRolesFromExpression(String expression, Set<String> roles) {
        // Extract roles from SpEL expressions like hasRole('ADMIN'), hasAnyRole('USER', 'ADMIN')
        int idx = 0;
        while (idx < expression.length()) {
            int start = expression.indexOf('\'', idx);
            if (start < 0) break;
            int end = expression.indexOf('\'', start + 1);
            if (end < 0) break;
            String role = expression.substring(start + 1, end);
            roles.add(role.startsWith("ROLE_") ? role.substring(5) : role);
            idx = end + 1;
        }
    }

    private String getClassBasePath(TypeElement typeElement) {
        AnnotationMirror requestMapping = findAnnotation(typeElement, REQUEST_MAPPING);
        if (requestMapping != null) {
            return extractPathFromMapping(requestMapping);
        }
        return "";
    }

    private String getMethodPath(ExecutableElement method) {
        for (AnnotationMirror annotation : method.getAnnotationMirrors()) {
            String annotName = ((TypeElement) annotation.getAnnotationType().asElement())
                    .getQualifiedName().toString();
            if (MAPPING_TO_METHOD.containsKey(annotName) || annotName.equals(REQUEST_MAPPING)) {
                return extractPathFromMapping(annotation);
            }
        }
        return null;
    }

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

    private String normalizePath(String basePath, String methodPath) {
        String base = basePath != null ? basePath : "";
        String method = methodPath != null ? methodPath : "";
        if (!base.startsWith("/") && !base.isEmpty()) base = "/" + base;
        if (!method.startsWith("/") && !method.isEmpty()) method = "/" + method;
        String result = base + method;
        return result.isEmpty() ? "/" : result;
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
