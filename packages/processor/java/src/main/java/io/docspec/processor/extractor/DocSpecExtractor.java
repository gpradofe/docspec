package io.docspec.processor.extractor;

import io.docspec.annotation.*;
import io.docspec.processor.model.DocSpecModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.TypeElement;

@DocBoundary("Interface for extractors that analyze types and populate the DocSpec model with domain-specific documentation including security, configuration, observability, data stores, external dependencies, and privacy.")
public interface DocSpecExtractor {

    @DocMethod("Checks whether this extractor can operate in the current environment, typically verifying required framework classes are on the classpath")
    boolean isAvailable(ProcessingEnvironment processingEnv);

    @DocMethod("Returns the human-readable name of this extractor for diagnostic messages")
    String extractorName();

    @DocMethod(value = "Analyzes a single type element and populates the model with extracted data",
               params = {
                   @Param(name = "typeElement", value = "The type to analyze"),
                   @Param(name = "processingEnv", value = "The annotation processing environment"),
                   @Param(name = "model", value = "The DocSpec model to populate")
               })
    void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model);
}
