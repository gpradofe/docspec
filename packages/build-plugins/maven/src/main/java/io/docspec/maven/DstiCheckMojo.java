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

/**
 * Checks that all methods meet a minimum Intent Signal Density (ISD) threshold.
 * Fails the build if any public method's ISD score falls below the configured threshold.
 */
@Mojo(name = "dsti-check", defaultPhase = LifecyclePhase.VERIFY)
@DocBoundary("Maven plugin entry point")
@DocError(code = "DOCSPEC_DSTI_001",
    description = "One or more methods have an ISD score below the configured minimum threshold.",
    causes = {"Method body lacks structural signals (branches, loops, error handling)", "Method name does not follow naming conventions recognized by NamingAnalyzer", "DSTI was not enabled during generation"},
    resolution = "Enrich method implementations or add DocSpec semantic annotations (@DocIntentional, @DocPreserves) to improve ISD scores."
)
public class DstiCheckMojo extends AbstractMojo {

    @Parameter(property = "docspec.spec.file", defaultValue = "${project.build.directory}/docspec.json")
    private File specFile;

    @Parameter(property = "docspec.intent-graph.file", defaultValue = "${project.build.directory}/intent-graph.json")
    private File intentGraphFile;

    @Parameter(property = "docspec.dsti.threshold", defaultValue = "0.3")
    private double threshold;

    @Parameter(property = "docspec.failOnError", defaultValue = "true")
    private boolean failOnError;

    @Override
    @DocMethod(since = "3.0.0")
    public void execute() throws MojoExecutionException, MojoFailureException {
        getLog().info("DocSpec: Checking DSTI scores (threshold: " + threshold + ")");

        // Try intent-graph.json first, fall back to docspec.json
        File targetFile = intentGraphFile.exists() ? intentGraphFile : specFile;

        if (!targetFile.exists()) {
            throw new MojoFailureException("Neither intent-graph.json nor docspec.json found. Run 'generate' first.");
        }

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root;
        try {
            root = mapper.readTree(targetFile);
        } catch (IOException e) {
            throw new MojoExecutionException("Failed to parse " + targetFile.getName(), e);
        }

        // Get intent graph methods
        JsonNode methods;
        if (root.has("methods")) {
            methods = root.get("methods");
        } else if (root.has("intentGraph") && root.get("intentGraph").has("methods")) {
            methods = root.get("intentGraph").get("methods");
        } else {
            getLog().info("DocSpec: No intent graph data found — skipping DSTI check.");
            return;
        }

        if (!methods.isArray()) return;

        List<String> violations = new ArrayList<>();
        int checked = 0;

        for (JsonNode method : methods) {
            String qualified = method.has("qualified") ? method.get("qualified").asText() : "unknown";
            JsonNode signals = method.get("intentSignals");
            if (signals == null) continue;

            JsonNode isdNode = signals.get("intentDensityScore");
            if (isdNode == null) continue;

            double isd = isdNode.asDouble();
            checked++;

            if (isd < threshold) {
                violations.add(String.format("  %s — ISD %.3f (below %.3f)", qualified, isd, threshold));
            }
        }

        getLog().info("DocSpec: Checked " + checked + " method(s) for DSTI compliance.");

        if (violations.isEmpty()) {
            getLog().info("DocSpec: All methods meet the ISD threshold.");
        } else {
            getLog().error("DocSpec: " + violations.size() + " method(s) below ISD threshold:");
            for (String v : violations) {
                getLog().error(v);
            }
            if (failOnError) {
                throw new MojoFailureException(violations.size() + " method(s) below ISD threshold " + threshold);
            }
        }
    }
}
