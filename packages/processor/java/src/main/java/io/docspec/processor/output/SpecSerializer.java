package io.docspec.processor.output;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import io.docspec.annotation.DocBoundary;
import io.docspec.processor.model.DocSpecModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.tools.Diagnostic;
import javax.tools.FileObject;
import javax.tools.StandardLocation;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;

@DocBoundary("JSON serialization")
public class SpecSerializer {

    private final ObjectMapper mapper;

    public SpecSerializer() {
        this.mapper = new ObjectMapper();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_EMPTY);
    }

    public void serialize(DocSpecModel model, String outputDir, ProcessingEnvironment processingEnv) {
        try {
            String json = mapper.writeValueAsString(model);

            if (outputDir != null && !outputDir.isBlank()) {
                // Write to specified output directory
                Path outputPath = Path.of(outputDir, "docspec.json");
                Files.createDirectories(outputPath.getParent());
                Files.writeString(outputPath, json);
                processingEnv.getMessager().printMessage(Diagnostic.Kind.NOTE,
                        "DocSpec: Generated docspec.json at " + outputPath);
            } else {
                // Write to CLASS_OUTPUT via Filer
                FileObject fileObject = processingEnv.getFiler().createResource(
                        StandardLocation.CLASS_OUTPUT, "", "docspec.json");
                try (Writer writer = fileObject.openWriter()) {
                    writer.write(json);
                }
                processingEnv.getMessager().printMessage(Diagnostic.Kind.NOTE,
                        "DocSpec: Generated docspec.json");
            }
        } catch (IOException e) {
            processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR,
                    "DocSpec: Failed to write docspec.json: " + e.getMessage());
        }
    }

    public void serializeIntentGraph(DocSpecModel model, String outputDir, ProcessingEnvironment processingEnv) {
        if (model.getIntentGraph() == null) return;

        try {
            // Build standalone intent-graph.json
            java.util.Map<String, Object> intentDoc = new java.util.LinkedHashMap<>();
            intentDoc.put("docspec", model.getVersion());
            java.util.Map<String, String> artifactRef = new java.util.LinkedHashMap<>();
            if (model.getArtifact() != null) {
                artifactRef.put("groupId", model.getArtifact().getGroupId());
                artifactRef.put("artifactId", model.getArtifact().getArtifactId());
                artifactRef.put("version", model.getArtifact().getVersion());
            }
            intentDoc.put("artifact", artifactRef);
            intentDoc.put("methods", model.getIntentGraph().getMethods());

            String json = mapper.writeValueAsString(intentDoc);

            if (outputDir != null && !outputDir.isBlank()) {
                Path outputPath = Path.of(outputDir, "intent-graph.json");
                Files.createDirectories(outputPath.getParent());
                Files.writeString(outputPath, json);
                processingEnv.getMessager().printMessage(Diagnostic.Kind.NOTE,
                        "DocSpec: Generated intent-graph.json at " + outputPath);
            } else {
                FileObject fileObject = processingEnv.getFiler().createResource(
                        StandardLocation.CLASS_OUTPUT, "", "intent-graph.json");
                try (Writer writer = fileObject.openWriter()) {
                    writer.write(json);
                }
                processingEnv.getMessager().printMessage(Diagnostic.Kind.NOTE,
                        "DocSpec: Generated intent-graph.json");
            }
        } catch (IOException e) {
            processingEnv.getMessager().printMessage(Diagnostic.Kind.WARNING,
                    "DocSpec: Failed to write intent-graph.json: " + e.getMessage());
        }
    }

    public String toJson(DocSpecModel model) {
        try {
            return mapper.writeValueAsString(model);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize DocSpec model", e);
        }
    }
}
