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
import java.util.ArrayList;
import java.util.List;

@Mojo(name = "check-deprecations", defaultPhase = LifecyclePhase.VERIFY)
@DocBoundary("Reports deprecated members and methods that lack a replacement or migration path. Ensures deprecations are documented with proper guidance.")
public class CheckDeprecationsMojo extends AbstractMojo {

    @Parameter(property = "docspec.spec.file", defaultValue = "${project.build.directory}/docspec.json")
    private File specFile;

    @Parameter(property = "docspec.failOnError", defaultValue = "false")
    private boolean failOnError;

    @Override
    @DocMethod(since = "3.0.0")
    public void execute() throws MojoExecutionException, MojoFailureException {
        getLog().info("DocSpec: Checking deprecations in " + specFile.getAbsolutePath());

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

        List<String> warnings = new ArrayList<>();

        JsonNode modules = spec.get("modules");
        if (modules != null && modules.isArray()) {
            for (JsonNode mod : modules) {
                JsonNode members = mod.get("members");
                if (members == null || !members.isArray()) continue;

                for (JsonNode member : members) {
                    String memberName = member.has("qualified") ? member.get("qualified").asText() : "unknown";

                    // Check member-level deprecation
                    JsonNode deprecated = member.get("deprecated");
                    if (deprecated != null && !deprecated.isNull()) {
                        String notice = deprecated.asText();
                        if (notice.isEmpty() || !notice.toLowerCase().contains("use")) {
                            warnings.add(memberName + " — deprecated without replacement guidance: \"" + notice + "\"");
                        }
                    }

                    // Check method-level deprecation
                    JsonNode methods = member.get("methods");
                    if (methods != null && methods.isArray()) {
                        for (JsonNode method : methods) {
                            JsonNode methodDeprecated = method.get("deprecated");
                            if (methodDeprecated != null && !methodDeprecated.isNull()) {
                                String methodName = method.has("name") ? method.get("name").asText() : "unknown";
                                String notice = methodDeprecated.asText();
                                if (notice.isEmpty() || !notice.toLowerCase().contains("use")) {
                                    warnings.add(memberName + "#" + methodName
                                        + " — deprecated without replacement guidance: \"" + notice + "\"");
                                }
                            }
                        }
                    }
                }
            }
        }

        if (warnings.isEmpty()) {
            getLog().info("DocSpec: All deprecations have replacement guidance.");
        } else {
            getLog().warn("DocSpec: Found " + warnings.size() + " deprecation(s) without replacement guidance:");
            for (String warning : warnings) {
                getLog().warn("  " + warning);
            }
            if (failOnError) {
                throw new MojoFailureException("Found " + warnings.size() + " deprecation(s) without replacement guidance.");
            }
        }
    }
}
