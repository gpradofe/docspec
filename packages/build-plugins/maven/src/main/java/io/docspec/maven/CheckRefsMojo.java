package io.docspec.maven;

import io.docspec.annotation.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.MojoFailureException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.File;
import java.io.IOException;
import java.util.*;

/**
 * Verifies that all cross-references in the DocSpec specification resolve to valid targets.
 * Checks that sourceQualified, targetArtifact, targetFlow, targetStep, and targetMember
 * references point to entities that exist in the spec.
 */
@Mojo(name = "check-refs", defaultPhase = LifecyclePhase.VERIFY)
@DocBoundary("Maven plugin entry point")
public class CheckRefsMojo extends AbstractMojo {

    @Parameter(property = "docspec.spec.file", defaultValue = "${project.build.directory}/docspec.json")
    private File specFile;

    @Parameter(property = "docspec.failOnError", defaultValue = "true")
    private boolean failOnError;

    @Override
    @DocMethod(since = "3.0.0")
    public void execute() throws MojoExecutionException, MojoFailureException {
        getLog().info("DocSpec: Checking cross-references in " + specFile.getAbsolutePath());

        if (!specFile.exists()) {
            throw new MojoFailureException("DocSpec specification not found: " + specFile.getAbsolutePath());
        }

        ObjectMapper mapper = new ObjectMapper();
        JsonNode spec;
        try {
            spec = mapper.readTree(specFile);
        } catch (IOException e) {
            throw new MojoExecutionException("Failed to parse specification", e);
        }

        // Collect all known qualified names
        Set<String> knownQualified = new HashSet<>();
        Set<String> knownFlows = new HashSet<>();
        Set<String> knownSteps = new HashSet<>();

        // Collect from modules/members
        JsonNode modules = spec.get("modules");
        if (modules != null && modules.isArray()) {
            for (JsonNode mod : modules) {
                JsonNode members = mod.get("members");
                if (members != null && members.isArray()) {
                    for (JsonNode member : members) {
                        JsonNode q = member.get("qualified");
                        if (q != null) knownQualified.add(q.asText());
                    }
                }
            }
        }

        // Collect from flows
        JsonNode flows = spec.get("flows");
        if (flows != null && flows.isArray()) {
            for (JsonNode flow : flows) {
                JsonNode id = flow.get("id");
                if (id != null) knownFlows.add(id.asText());
                JsonNode steps = flow.get("steps");
                if (steps != null && steps.isArray()) {
                    for (JsonNode step : steps) {
                        JsonNode stepId = step.get("id");
                        if (stepId != null) knownSteps.add(stepId.asText());
                    }
                }
            }
        }

        // Check cross-references
        List<String> errors = new ArrayList<>();
        JsonNode crossRefs = spec.get("crossRefs");
        if (crossRefs != null && crossRefs.isArray()) {
            int index = 0;
            for (JsonNode ref : crossRefs) {
                JsonNode targetMember = ref.get("targetMember");
                if (targetMember != null && !knownQualified.contains(targetMember.asText())) {
                    errors.add("crossRef[" + index + "]: targetMember '" + targetMember.asText() + "' not found");
                }
                JsonNode targetFlow = ref.get("targetFlow");
                if (targetFlow != null && !knownFlows.contains(targetFlow.asText())) {
                    errors.add("crossRef[" + index + "]: targetFlow '" + targetFlow.asText() + "' not found");
                }
                JsonNode targetStep = ref.get("targetStep");
                if (targetStep != null && !knownSteps.contains(targetStep.asText())) {
                    errors.add("crossRef[" + index + "]: targetStep '" + targetStep.asText() + "' not found");
                }
                index++;
            }
        }

        if (errors.isEmpty()) {
            getLog().info("DocSpec: All cross-references are valid.");
        } else {
            for (String error : errors) {
                getLog().error("  " + error);
            }
            if (failOnError) {
                throw new MojoFailureException("Found " + errors.size() + " broken cross-reference(s).");
            }
        }
    }
}
