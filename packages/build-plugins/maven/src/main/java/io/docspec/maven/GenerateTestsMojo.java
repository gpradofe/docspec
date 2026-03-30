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
import org.apache.maven.project.MavenProject;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Mojo(
        name = "generate-tests",
        defaultPhase = LifecyclePhase.GENERATE_TEST_SOURCES
)
@DocBoundary("Reads intent-graph.json and generates JUnit 5 test class stubs into target/generated-test-sources/docspec-tests/. Each method gets a test class with skeleton tests derived from its intent signals.")
@DocContext(id = "generate-tests-context",
    name = "Generate Tests Mojo Context",
    inputs = {
        @ContextInput(name = "intentGraphPath", source = "config", description = "Path to intent-graph.json file"),
        @ContextInput(name = "testOutputDir", source = "config", description = "Target directory for generated test stubs")
    }
)
public class GenerateTestsMojo extends AbstractMojo {

    @Parameter(defaultValue = "${project}", readonly = true, required = true)
    private MavenProject project;

    @Parameter(property = "docspec.intent-graph.path")
    private File intentGraphPath;

    @Parameter(property = "docspec.tests.output",
            defaultValue = "${project.build.directory}/generated-test-sources/docspec-tests")
    private File testOutputDir;

    @Override
    @DocMethod(since = "3.0.0")
    public void execute() throws MojoExecutionException, MojoFailureException {
        // Locate intent-graph.json
        File intentFile = intentGraphPath;
        if (intentFile == null || !intentFile.exists()) {
            intentFile = new File(project.getBuild().getDirectory(), "intent-graph.json");
        }
        if (!intentFile.exists()) {
            getLog().info("DocSpec: No intent-graph.json found. Run with docspec.dsti.enabled=true first. Skipping.");
            return;
        }

        getLog().info("DocSpec: Generating test stubs from " + intentFile.getAbsolutePath());

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(intentFile);
            JsonNode methods = root.get("methods");
            if (methods == null || !methods.isArray()) {
                getLog().warn("DocSpec: No methods found in intent-graph.json");
                return;
            }

            int generated = 0;
            for (JsonNode methodNode : methods) {
                String qualified = methodNode.has("qualified") ? methodNode.get("qualified").asText() : null;
                if (qualified == null || qualified.isBlank()) continue;

                JsonNode signals = methodNode.get("intentSignals");
                String testSource = generateTestClass(qualified, signals);
                if (testSource != null) {
                    writeTestFile(qualified, testSource);
                    generated++;
                }
            }

            // Add the output directory as a test source root
            project.addTestCompileSourceRoot(testOutputDir.getAbsolutePath());

            getLog().info("DocSpec: Generated " + generated + " test class(es) in " + testOutputDir.getAbsolutePath());
        } catch (IOException e) {
            throw new MojoExecutionException("Failed to read intent-graph.json", e);
        }
    }

    private String generateTestClass(String qualified, JsonNode signals) {
        // Parse qualified name into package and class
        int lastDot = qualified.lastIndexOf('.');
        int methodDot = qualified.lastIndexOf('.', lastDot - 1);
        if (methodDot < 0) return null;

        String classQualified = qualified.substring(0, lastDot);
        String methodName = qualified.substring(lastDot + 1);
        int pkgDot = classQualified.lastIndexOf('.');
        String packageName = pkgDot > 0 ? classQualified.substring(0, pkgDot) : "";
        String className = pkgDot > 0 ? classQualified.substring(pkgDot + 1) : classQualified;
        String testClassName = className + "_" + capitalize(methodName) + "Test";

        // Determine if Mockito is needed (dependencies present)
        boolean useMockito = signals != null && signals.has("dependencies")
                && signals.get("dependencies").isArray() && signals.get("dependencies").size() > 0;

        // Extract verb from nameSemantics for assertion generation
        String verb = null;
        if (signals != null && signals.has("nameSemantics")) {
            JsonNode nameSemantics = signals.get("nameSemantics");
            if (nameSemantics.has("verb")) {
                verb = nameSemantics.get("verb").asText();
            }
        }

        StringBuilder sb = new StringBuilder();
        if (!packageName.isEmpty()) {
            sb.append("package ").append(packageName).append(";\n\n");
        }
        sb.append("import org.junit.jupiter.api.Test;\n");
        sb.append("import org.junit.jupiter.api.Tag;\n");
        sb.append("import org.junit.jupiter.api.DisplayName;\n");
        sb.append("import static org.junit.jupiter.api.Assertions.*;\n");
        if (useMockito) {
            sb.append("import org.junit.jupiter.api.BeforeEach;\n");
            sb.append("import org.mockito.*;\n");
            sb.append("import static org.mockito.Mockito.*;\n");
        }
        sb.append("\n");
        sb.append("/**\n");
        sb.append(" * Auto-generated test stubs for {@link ").append(className).append("#").append(methodName).append("}.\n");
        sb.append(" * Generated by DocSpec DSTI from intent-graph analysis.\n");
        sb.append(" */\n");
        sb.append("@Tag(\"docspec-generated\")\n");
        sb.append("class ").append(testClassName).append(" {\n\n");

        // Mockito setup if dependencies are present
        if (useMockito) {
            for (JsonNode dep : signals.get("dependencies")) {
                String depType = dep.asText();
                String simpleDep = depType.contains(".") ? depType.substring(depType.lastIndexOf('.') + 1) : depType;
                String fieldName = Character.toLowerCase(simpleDep.charAt(0)) + simpleDep.substring(1);
                sb.append("    @Mock private ").append(simpleDep).append(" ").append(fieldName).append(";\n");
            }
            sb.append("    @InjectMocks private ").append(className).append(" instance;\n\n");
            sb.append("    @BeforeEach\n");
            sb.append("    void setUp() {\n");
            sb.append("        MockitoAnnotations.openMocks(this);\n");
            sb.append("    }\n");
        } else {
            sb.append("    // private ").append(className).append(" instance = new ").append(className).append("();\n");
        }

        // Generate naming-based happy path test with real assertions
        sb.append("\n    @Test\n");
        sb.append("    @DisplayName(\"").append(methodName).append(" - happy path\")\n");
        sb.append("    void test_").append(methodName).append("_happyPath() {\n");
        appendVerbBasedAssertions(sb, verb, methodName, className);
        sb.append("    }\n");

        // Generate tests from intent signals
        if (signals != null) {
            // Guard clause tests with real assertions
            if (signals.has("guardClauses") && signals.get("guardClauses").asInt() > 0) {
                int guards = signals.get("guardClauses").asInt();
                for (int i = 1; i <= guards; i++) {
                    sb.append("\n    @Test\n");
                    sb.append("    @DisplayName(\"").append(methodName).append(" - guard clause ").append(i).append(" rejects invalid input\")\n");
                    sb.append("    void test_").append(methodName).append("_guardClause").append(i).append("() {\n");
                    sb.append("        assertThrows(Exception.class, () -> {\n");
                    sb.append("            instance.").append(methodName).append("(/* null/invalid for guard ").append(i).append(" */);\n");
                    sb.append("        }, \"Guard clause ").append(i).append(" should reject invalid input\");\n");
                    sb.append("    }\n");
                }
            }

            // Error handling tests
            if (signals.has("errorHandling")) {
                JsonNode errorHandling = signals.get("errorHandling");
                if (errorHandling.has("caughtTypes") && errorHandling.get("caughtTypes").isArray()) {
                    for (JsonNode caughtType : errorHandling.get("caughtTypes")) {
                        String exType = caughtType.asText();
                        String simpleType = exType.contains(".") ? exType.substring(exType.lastIndexOf('.') + 1) : exType;
                        sb.append("\n    @Test\n");
                        sb.append("    @DisplayName(\"").append(methodName).append(" - handles ").append(simpleType).append("\")\n");
                        sb.append("    void test_").append(methodName).append("_handles").append(simpleType).append("() {\n");
                        sb.append("        // Arrange: configure scenario that triggers ").append(simpleType).append("\n");
                        sb.append("        // Act & Assert: verify graceful handling\n");
                        sb.append("        assertDoesNotThrow(() -> {\n");
                        sb.append("            instance.").append(methodName).append("(/* input that causes ").append(simpleType).append(" */);\n");
                        sb.append("        }, \"Should handle ").append(simpleType).append(" gracefully\");\n");
                        sb.append("    }\n");
                    }
                }
            }

            // Branch coverage tests
            if (signals.has("branches") && signals.get("branches").asInt() > 1) {
                int branches = signals.get("branches").asInt();
                sb.append("\n    @Test\n");
                sb.append("    @DisplayName(\"").append(methodName).append(" - covers all ").append(branches).append(" branches\")\n");
                sb.append("    void test_").append(methodName).append("_branchCoverage() {\n");
                sb.append("        // TODO: Test all ").append(branches).append(" conditional branches\n");
                sb.append("        // Provide different inputs to exercise each branch path\n");
                sb.append("    }\n");
            }
        }

        sb.append("}\n");
        return sb.toString();
    }

    @DocMethod("Appends verb-specific assertion suggestions to the test body based on the method naming semantics")
    private void appendVerbBasedAssertions(StringBuilder sb, String verb, String methodName, String className) {
        if (verb == null) {
            sb.append("        // TODO: Implement happy path test\n");
            return;
        }
        switch (verb) {
            case "validate", "check", "verify" -> {
                sb.append("        // Validation method: should reject null/invalid input\n");
                sb.append("        assertThrows(IllegalArgumentException.class, () -> instance.").append(methodName).append("(null));\n");
            }
            case "find", "get", "load", "fetch" -> {
                sb.append("        // Query method: result should not be null for valid input\n");
                sb.append("        var result = instance.").append(methodName).append("(/* valid input */);\n");
                sb.append("        assertNotNull(result);\n");
                sb.append("        // When not found: assertTrue(result.isEmpty());\n");
            }
            case "create", "build", "generate" -> {
                sb.append("        // Creation method: result should be a new non-null object\n");
                sb.append("        var result = instance.").append(methodName).append("(/* valid input */);\n");
                sb.append("        assertNotNull(result);\n");
                sb.append("        // assertNotEquals(input, result);\n");
            }
            case "delete", "remove" -> {
                sb.append("        // Deletion method: verify item no longer exists after deletion\n");
                sb.append("        instance.").append(methodName).append("(/* target to delete */);\n");
                sb.append("        // Verify item no longer exists after deletion\n");
            }
            case "convert", "transform", "map" -> {
                sb.append("        // Transformation method: result should be non-null and match expected\n");
                sb.append("        var result = instance.").append(methodName).append("(/* input */);\n");
                sb.append("        assertNotNull(result);\n");
                sb.append("        // assertEquals(expected, result);\n");
            }
            case "is", "has", "can" -> {
                sb.append("        // Boolean query: returns boolean\n");
                sb.append("        assertTrue(instance.").append(methodName).append("(/* valid input */));\n");
            }
            default -> {
                sb.append("        // TODO: Implement happy path test for '").append(verb).append("' operation\n");
                sb.append("        var result = instance.").append(methodName).append("(/* valid input */);\n");
                sb.append("        assertNotNull(result);\n");
            }
        }
    }

    private void writeTestFile(String qualified, String source) throws IOException {
        // Convert qualified name to file path
        int lastDot = qualified.lastIndexOf('.');
        int methodDot = qualified.lastIndexOf('.', lastDot - 1);
        String classQualified = qualified.substring(0, lastDot);
        String methodName = qualified.substring(lastDot + 1);
        int pkgDot = classQualified.lastIndexOf('.');
        String packagePath = pkgDot > 0 ? classQualified.substring(0, pkgDot).replace('.', '/') : "";
        String className = pkgDot > 0 ? classQualified.substring(pkgDot + 1) : classQualified;

        Path dir = testOutputDir.toPath().resolve(packagePath);
        Files.createDirectories(dir);
        Path file = dir.resolve(className + "_" + capitalize(methodName) + "Test.java");
        Files.writeString(file, source);
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
