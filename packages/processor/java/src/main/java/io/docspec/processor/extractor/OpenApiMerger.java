package io.docspec.processor.extractor;

import io.docspec.annotation.*;
import io.docspec.processor.model.DocSpecModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.TypeElement;
import javax.tools.FileObject;
import javax.tools.StandardLocation;
import java.io.InputStream;

/**
 * Scans for OpenAPI specification files (openapi.json, openapi.yaml) on the classpath
 * and merges endpoint descriptions into the DocSpec model.
 */
@DocBoundary("classpath-safe extraction")
public class OpenApiMerger implements DocSpecExtractor {

    private static final String[] OPENAPI_FILES = {
        "openapi.json", "openapi.yaml", "openapi.yml",
        "swagger.json", "swagger.yaml", "swagger.yml"
    };

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        // Available if any OpenAPI file is found on the classpath
        for (String fileName : OPENAPI_FILES) {
            try {
                FileObject fo = processingEnv.getFiler().getResource(
                    StandardLocation.CLASS_OUTPUT, "", fileName);
                if (fo != null) {
                    try (InputStream is = fo.openInputStream()) {
                        if (is != null) return true;
                    }
                }
            } catch (Exception ignored) {
                // File not found, continue
            }
        }
        return false;
    }

    @Override
    public String extractorName() {
        return "OpenAPI Merger";
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        // OpenAPI merging is a global operation, not per-type.
        // This extractor is invoked once during finalization to merge
        // endpoint descriptions from OpenAPI specs into existing members.
        // Per-type extract is a no-op; actual merging happens in finalizeExtraction().
    }

    /**
     * Merge OpenAPI endpoint descriptions into the model.
     * Called during processor finalization, not per-type.
     */
    public void finalizeExtraction(ProcessingEnvironment processingEnv, DocSpecModel model) {
        for (String fileName : OPENAPI_FILES) {
            try {
                FileObject fo = processingEnv.getFiler().getResource(
                    StandardLocation.CLASS_OUTPUT, "", fileName);
                try (InputStream is = fo.openInputStream()) {
                    if (is != null) {
                        mergeOpenApiSpec(is, fileName, model);
                    }
                }
            } catch (Exception ignored) {
                // File not available
            }
        }
    }

    private void mergeOpenApiSpec(InputStream is, String fileName, DocSpecModel model) {
        // TODO: Parse OpenAPI spec and merge endpoint descriptions
        // For now, this is a placeholder that will be fleshed out
        // when a YAML/JSON parser is added to the processor dependencies.
    }
}
