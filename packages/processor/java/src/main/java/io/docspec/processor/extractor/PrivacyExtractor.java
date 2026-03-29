package io.docspec.processor.extractor;

import io.docspec.annotation.*;
import io.docspec.processor.model.DocSpecModel;
import io.docspec.processor.model.PrivacyFieldModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import java.util.*;

/**
 * Detects {@code @DocPII} and {@code @DocSensitive} annotations on fields
 * and populates the privacy section of the DocSpec model.
 */
@DocBoundary("classpath-safe extraction")
public class PrivacyExtractor implements DocSpecExtractor {

    private static final String DOC_PII = "io.docspec.annotation.DocPII";
    private static final String DOC_SENSITIVE = "io.docspec.annotation.DocSensitive";

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return processingEnv.getElementUtils().getTypeElement(DOC_PII) != null;
    }

    @Override
    public String extractorName() {
        return "privacy";
    }

    @Override
    @DocMethod(since = "3.0.0")
    @DocBoundary("privacy extraction entry point")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        String ownerQualified = typeElement.getQualifiedName().toString();
        List<PrivacyFieldModel> privacyFields = new ArrayList<>();

        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (!(enclosed instanceof VariableElement field) || enclosed.getKind() != ElementKind.FIELD) {
                continue;
            }

            // Check @DocPII
            AnnotationMirror piiMirror = findAnnotation(field, DOC_PII);
            if (piiMirror != null) {
                PrivacyFieldModel pf = new PrivacyFieldModel();
                pf.setField(ownerQualified + "." + field.getSimpleName().toString());
                pf.setPiiType(getStringValue(piiMirror, "value", processingEnv));

                String retention = getStringValue(piiMirror, "retention", processingEnv);
                if (retention != null) pf.setRetention(retention);

                String gdprBasis = getStringValue(piiMirror, "gdprBasis", processingEnv);
                if (gdprBasis != null) pf.setGdprBasis(gdprBasis);

                Boolean encrypted = getBooleanValue(piiMirror, "encrypted", processingEnv);
                if (encrypted != null) pf.setEncrypted(encrypted);

                Boolean neverLog = getBooleanValue(piiMirror, "neverLog", processingEnv);
                if (neverLog != null) pf.setNeverLog(neverLog);

                Boolean neverReturn = getBooleanValue(piiMirror, "neverReturn", processingEnv);
                if (neverReturn != null) pf.setNeverReturn(neverReturn);

                privacyFields.add(pf);
            }

            // Check @DocSensitive
            AnnotationMirror sensitiveMirror = findAnnotation(field, DOC_SENSITIVE);
            if (sensitiveMirror != null) {
                PrivacyFieldModel pf = new PrivacyFieldModel();
                pf.setField(ownerQualified + "." + field.getSimpleName().toString());
                pf.setPiiType("other");
                pf.setNeverLog(true);
                privacyFields.add(pf);
            }
        }

        if (!privacyFields.isEmpty()) {
            model.getPrivacy().addAll(privacyFields);
        }
    }

    // --- Private helpers ---

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
}
