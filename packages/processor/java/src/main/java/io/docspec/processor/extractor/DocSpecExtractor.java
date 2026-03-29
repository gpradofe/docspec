package io.docspec.processor.extractor;

import io.docspec.annotation.DocBoundary;
import io.docspec.processor.model.DocSpecModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.TypeElement;

/**
 * Interface for extractors that analyze types and populate the DocSpec model
 * with domain-specific documentation (security, configuration, observability, etc.).
 */
@DocBoundary("extractor interface boundary")
public interface DocSpecExtractor {

    /**
     * Checks whether this extractor can operate in the current environment.
     * Typically verifies that required framework classes are on the classpath.
     */
    boolean isAvailable(ProcessingEnvironment processingEnv);

    /**
     * Returns the human-readable name of this extractor for diagnostic messages.
     */
    String extractorName();

    /**
     * Analyzes a single type element and populates the model with extracted data.
     *
     * @param typeElement    the type to analyze
     * @param processingEnv  the annotation processing environment
     * @param model          the DocSpec model to populate
     */
    void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model);
}
