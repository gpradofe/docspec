package io.docspec.maven;

import io.docspec.annotation.DocMethod;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.apache.maven.project.MavenProject;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Aggregates {@code docspec.json} files from all reactor modules into a single
 * {@code docspec-aggregate.json} specification file.
 *
 * <p>This mojo iterates over every module collected by the reactor, looks for
 * a {@code docspec.json} in each module's build output directory, and merges
 * the top-level arrays ({@code modules}, {@code flows}, {@code errors},
 * {@code events}, {@code dataModels}, {@code contexts}, {@code crossRefs},
 * {@code dataStores}, {@code configuration}, {@code externalDependencies},
 * {@code privacy}) into one unified document.</p>
 */
@Mojo(name = "aggregate", defaultPhase = LifecyclePhase.PACKAGE, aggregator = true)
public class AggregateMojo extends AbstractMojo {

    @Parameter(defaultValue = "${project}", readonly = true, required = true)
    private MavenProject project;

    @Parameter(property = "docspec.output.dir", defaultValue = "${project.build.directory}")
    private File outputDirectory;

    @Override
    @DocMethod(since = "3.0.0")
    public void execute() throws MojoExecutionException {
        getLog().info("DocSpec: Starting aggregate specification generation");

        // -----------------------------------------------------------
        // 1. Collect all docspec.json files from reactor modules
        // -----------------------------------------------------------
        List<File> docspecFiles = new ArrayList<>();

        for (MavenProject collectedProject : project.getCollectedProjects()) {
            File docspecFile = new File(collectedProject.getBuild().getDirectory(), "docspec.json");
            if (docspecFile.exists()) {
                getLog().info("Found docspec.json in: " + collectedProject.getArtifactId());
                docspecFiles.add(docspecFile);
            }
        }

        if (docspecFiles.isEmpty()) {
            getLog().warn("No docspec.json files found in reactor modules");
            return;
        }

        getLog().info("Aggregating " + docspecFiles.size() + " docspec.json files");

        // -----------------------------------------------------------
        // 2. Merge them
        // -----------------------------------------------------------
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.enable(SerializationFeature.INDENT_OUTPUT);

            ObjectNode merged = mapper.createObjectNode();
            merged.put("docspec", "3.0.0");

            // Merge arrays from all files
            ArrayNode allModules = mapper.createArrayNode();
            ArrayNode allFlows = mapper.createArrayNode();
            ArrayNode allErrors = mapper.createArrayNode();
            ArrayNode allEvents = mapper.createArrayNode();
            ArrayNode allDataModels = mapper.createArrayNode();
            ArrayNode allContexts = mapper.createArrayNode();
            ArrayNode allCrossRefs = mapper.createArrayNode();
            ArrayNode allDataStores = mapper.createArrayNode();
            ArrayNode allConfiguration = mapper.createArrayNode();
            ArrayNode allExternalDeps = mapper.createArrayNode();
            ArrayNode allPrivacy = mapper.createArrayNode();
            List<String> allFrameworks = new ArrayList<>();

            for (File file : docspecFiles) {
                JsonNode doc = mapper.readTree(file);

                mergeArray(doc, "modules", allModules);
                mergeArray(doc, "flows", allFlows);
                mergeArray(doc, "errors", allErrors);
                mergeArray(doc, "events", allEvents);
                mergeArray(doc, "dataModels", allDataModels);
                mergeArray(doc, "contexts", allContexts);
                mergeArray(doc, "crossRefs", allCrossRefs);
                mergeArray(doc, "dataStores", allDataStores);
                mergeArray(doc, "configuration", allConfiguration);
                mergeArray(doc, "externalDependencies", allExternalDeps);
                mergeArray(doc, "privacy", allPrivacy);

                // Collect frameworks
                JsonNode artifact = doc.get("artifact");
                if (artifact != null && artifact.has("frameworks")) {
                    for (JsonNode fw : artifact.get("frameworks")) {
                        String fwName = fw.asText();
                        if (!allFrameworks.contains(fwName)) {
                            allFrameworks.add(fwName);
                        }
                    }
                }
            }

            // Build aggregate artifact
            ObjectNode artifact = mapper.createObjectNode();
            artifact.put("groupId", project.getGroupId());
            artifact.put("artifactId", project.getArtifactId());
            artifact.put("version", project.getVersion());
            artifact.put("language", "java");
            artifact.put("buildTool", "maven");
            if (!allFrameworks.isEmpty()) {
                ArrayNode fwArray = mapper.createArrayNode();
                allFrameworks.forEach(fwArray::add);
                artifact.set("frameworks", fwArray);
            }
            merged.set("artifact", artifact);

            // Build aggregate project
            ObjectNode projectNode = mapper.createObjectNode();
            projectNode.put("name", project.getName() != null ? project.getName() : project.getArtifactId());
            if (project.getDescription() != null) {
                projectNode.put("description", project.getDescription());
            }
            merged.set("project", projectNode);

            // Set non-empty arrays
            if (allModules.size() > 0) merged.set("modules", allModules);
            if (allFlows.size() > 0) merged.set("flows", allFlows);
            if (allErrors.size() > 0) merged.set("errors", allErrors);
            if (allEvents.size() > 0) merged.set("events", allEvents);
            if (allDataModels.size() > 0) merged.set("dataModels", allDataModels);
            if (allContexts.size() > 0) merged.set("contexts", allContexts);
            if (allCrossRefs.size() > 0) merged.set("crossRefs", allCrossRefs);
            if (allDataStores.size() > 0) merged.set("dataStores", allDataStores);
            if (allConfiguration.size() > 0) merged.set("configuration", allConfiguration);
            if (allExternalDeps.size() > 0) merged.set("externalDependencies", allExternalDeps);
            if (allPrivacy.size() > 0) merged.set("privacy", allPrivacy);

            // Build discovery summary
            ObjectNode discovery = mapper.createObjectNode();
            discovery.put("mode", "aggregate");
            discovery.put("sourceModules", docspecFiles.size());
            merged.set("discovery", discovery);

            // -----------------------------------------------------------
            // 3. Write output
            // -----------------------------------------------------------
            if (!outputDirectory.exists()) {
                outputDirectory.mkdirs();
            }
            File outputFile = new File(outputDirectory, "docspec-aggregate.json");
            mapper.writeValue(outputFile, merged);
            getLog().info("DocSpec: Aggregate spec written to: " + outputFile.getAbsolutePath());

        } catch (IOException e) {
            throw new MojoExecutionException("Failed to aggregate docspec files", e);
        }
    }

    // ---------------------------------------------------------------
    // Helper methods
    // ---------------------------------------------------------------

    /**
     * Merges all elements from the named JSON array field in the given
     * document into the target {@link ArrayNode}.
     */
    private void mergeArray(JsonNode doc, String fieldName, ArrayNode target) {
        JsonNode array = doc.get(fieldName);
        if (array != null && array.isArray()) {
            for (JsonNode element : array) {
                target.add(element);
            }
        }
    }
}
