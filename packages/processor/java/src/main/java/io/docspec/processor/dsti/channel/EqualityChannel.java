package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.AnnotationMirror;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.VariableElement;

/**
 * Channel 13: Validation Annotations (Equality).
 * Counts validation annotations on method parameters ({@code @NotNull}, {@code @Valid},
 * {@code @Min}, {@code @Max}, {@code @Size}, etc.).
 * Sets the validationAnnotations count on signals.
 */
public class EqualityChannel implements IntentChannel {

    @Override
    public String channelName() {
        return "validation-annotations";
    }

    @Override
    public int channelNumber() {
        return 13;
    }

    @Override
    public boolean requiresTrees() {
        return false;
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        int validationAnnotations = 0;

        for (VariableElement param : method.getParameters()) {
            for (AnnotationMirror am : param.getAnnotationMirrors()) {
                String annotName = am.getAnnotationType().asElement().getSimpleName().toString();
                if ("NotNull".equals(annotName) || "NonNull".equals(annotName)
                        || "Nonnull".equals(annotName) || "Valid".equals(annotName)
                        || "Min".equals(annotName) || "Max".equals(annotName)
                        || "Size".equals(annotName) || "NotBlank".equals(annotName)
                        || "NotEmpty".equals(annotName) || "Pattern".equals(annotName)
                        || "Email".equals(annotName) || "Positive".equals(annotName)
                        || "PositiveOrZero".equals(annotName) || "Negative".equals(annotName)
                        || "NegativeOrZero".equals(annotName) || "Past".equals(annotName)
                        || "Future".equals(annotName) || "Digits".equals(annotName)
                        || "DecimalMin".equals(annotName) || "DecimalMax".equals(annotName)) {
                    validationAnnotations++;
                }
            }
        }

        if (validationAnnotations > 0) {
            signals.setValidationAnnotations(validationAnnotations);
        }
    }
}
