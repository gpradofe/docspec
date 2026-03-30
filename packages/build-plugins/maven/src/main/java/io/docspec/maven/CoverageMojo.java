package io.docspec.maven;

import io.docspec.annotation.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.docspec.maven.config.CoverageConfig;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.MojoFailureException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.File;
import java.io.IOException;

@Mojo(
        name = "coverage",
        defaultPhase = LifecyclePhase.VERIFY
)
@DocContext(id = "coverage-context",
    name = "Coverage Mojo Context",
    inputs = {
        @ContextInput(name = "specFile", source = "config", description = "Path to the docspec.json file to analyze"),
        @ContextInput(name = "minimumPercent", source = "config", description = "Minimum coverage percentage threshold (default 0)")
    }
)
@DocBoundary("Reads the generated docspec.json and enforces a minimum documentation coverage threshold. Compares discovery.coveragePercent against the configured minimum and optionally fails the build.")
@DocError(code = "DOCSPEC_COV_001",
    description = "Documentation coverage is below the configured minimum threshold.",
    causes = {"Too many classes lack descriptions", "Methods are missing JavaDoc or @DocMethod annotations", "Description inference is disabled"},
    resolution = "Add JavaDoc comments or DocSpec annotations to increase coverage above the threshold."
)
public class CoverageMojo extends AbstractMojo {

    // Path to the DocSpec specification file
    @Parameter(
            property = "docspec.spec.file",
            defaultValue = "${project.build.directory}/docspec.json"
    )
    private File specFile;

    // Coverage enforcement configuration
    @Parameter(property = "docspec.coverage")
    private CoverageConfig coverage;

    @Override
    @DocMethod(since = "3.0.0")
    @DocBoundary("Maven coverage goal entry point")
    public void execute() throws MojoExecutionException, MojoFailureException {
        // Apply defaults if no config was provided
        if (coverage == null) {
            coverage = new CoverageConfig();
        }

        getLog().info("DocSpec: Checking documentation coverage");
        getLog().info("DocSpec: Minimum required: " + coverage.getMinimumPercent() + "%");

        // -----------------------------------------------------------
        // 1. Verify the spec file exists
        // -----------------------------------------------------------
        if (!specFile.exists()) {
            throw new MojoFailureException(
                    "DocSpec specification file not found: " + specFile.getAbsolutePath()
                            + ". Run the 'generate' goal first.");
        }

        // -----------------------------------------------------------
        // 2. Parse the specification and extract coverage data
        // -----------------------------------------------------------
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root;
        try {
            root = mapper.readTree(specFile);
        } catch (IOException e) {
            throw new MojoExecutionException(
                    "Failed to parse DocSpec specification file: " + specFile.getAbsolutePath(), e);
        }

        JsonNode discoveryNode = root.path("discovery");
        if (discoveryNode.isMissingNode()) {
            throw new MojoFailureException(
                    "DocSpec specification does not contain a 'discovery' section. "
                            + "Ensure the specification was generated with a compatible processor version.");
        }

        JsonNode coveragePercentNode = discoveryNode.path("coveragePercent");
        if (coveragePercentNode.isMissingNode() || !coveragePercentNode.isNumber()) {
            throw new MojoFailureException(
                    "DocSpec specification does not contain 'discovery.coveragePercent'. "
                            + "Ensure the specification was generated with a compatible processor version.");
        }

        int actualCoverage = coveragePercentNode.intValue();

        // -----------------------------------------------------------
        // 3. Extract and display detailed coverage stats
        // -----------------------------------------------------------
        printCoverageReport(discoveryNode, actualCoverage);

        // -----------------------------------------------------------
        // 4. Enforce threshold
        // -----------------------------------------------------------
        if (actualCoverage >= coverage.getMinimumPercent()) {
            getLog().info("DocSpec: Coverage check PASSED ("
                    + actualCoverage + "% >= " + coverage.getMinimumPercent() + "%)");
        } else {
            String message = "DocSpec: Coverage check FAILED ("
                    + actualCoverage + "% < " + coverage.getMinimumPercent() + "%)";

            if (coverage.isFailOnBelowThreshold()) {
                getLog().error(message);
                throw new MojoFailureException(
                        "Documentation coverage is " + actualCoverage
                                + "% which is below the required minimum of "
                                + coverage.getMinimumPercent() + "%.");
            } else {
                getLog().warn(message);
                getLog().warn("DocSpec: Build will not fail because failOnBelowThreshold is false.");
            }
        }
    }

    @DocMethod("Prints a detailed coverage report extracted from the discovery node")
    private void printCoverageReport(JsonNode discoveryNode, int coveragePercent) {
        getLog().info("");
        getLog().info("========================================");
        getLog().info("  DocSpec Documentation Coverage Report");
        getLog().info("========================================");
        getLog().info("");

        // Discovery mode
        JsonNode modeNode = discoveryNode.path("mode");
        if (!modeNode.isMissingNode()) {
            getLog().info("  Discovery mode:    " + modeNode.asText());
        }

        // Total types
        JsonNode totalTypesNode = discoveryNode.path("totalTypes");
        if (!totalTypesNode.isMissingNode()) {
            getLog().info("  Total types:       " + totalTypesNode.intValue());
        }

        // Documented types
        JsonNode documentedNode = discoveryNode.path("documentedTypes");
        if (!documentedNode.isMissingNode()) {
            getLog().info("  Documented types:  " + documentedNode.intValue());
        }

        // Total methods
        JsonNode totalMethodsNode = discoveryNode.path("totalMethods");
        if (!totalMethodsNode.isMissingNode()) {
            getLog().info("  Total methods:     " + totalMethodsNode.intValue());
        }

        // Documented methods
        JsonNode documentedMethodsNode = discoveryNode.path("documentedMethods");
        if (!documentedMethodsNode.isMissingNode()) {
            getLog().info("  Documented methods:" + documentedMethodsNode.intValue());
        }

        // Inferred descriptions
        JsonNode inferredNode = discoveryNode.path("inferredDescriptions");
        if (!inferredNode.isMissingNode()) {
            getLog().info("  Inferred desc.:    " + inferredNode.intValue());
        }

        // Detected frameworks
        JsonNode frameworksNode = discoveryNode.path("detectedFrameworks");
        if (frameworksNode.isArray() && !frameworksNode.isEmpty()) {
            StringBuilder fwList = new StringBuilder();
            for (JsonNode fw : frameworksNode) {
                if (!fwList.isEmpty()) fwList.append(", ");
                fwList.append(fw.asText());
            }
            getLog().info("  Frameworks:        " + fwList);
        }

        getLog().info("");
        getLog().info("  Coverage:          " + coveragePercent + "%"
                + "  (minimum: " + coverage.getMinimumPercent() + "%)");
        getLog().info("");
        getLog().info("========================================");
        getLog().info("");
    }
}
