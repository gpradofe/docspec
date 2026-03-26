package io.docspec.maven;

import io.docspec.annotation.DocMethod;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.MojoFailureException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.Set;

/**
 * Validates the generated {@code docspec.json} against the DocSpec JSON Schema.
 *
 * <p>The schema ({@code docspec.schema.json}) is expected to be bundled inside
 * the {@code docspec-processor-java} JAR on the plugin classpath. Validation
 * uses the <a href="https://github.com/networknt/json-schema-validator">networknt
 * json-schema-validator</a> library.</p>
 *
 * <p>If the specification file does not exist, the mojo fails with a clear
 * error message. If schema validation errors are found, each violation is
 * logged individually and the build is failed.</p>
 */
@Mojo(
        name = "validate",
        defaultPhase = LifecyclePhase.VERIFY
)
public class ValidateMojo extends AbstractMojo {

    /**
     * Path to the DocSpec specification file to validate.
     */
    @Parameter(
            property = "docspec.spec.file",
            defaultValue = "${project.build.directory}/docspec.json"
    )
    private File specFile;

    private static final String SCHEMA_CLASSPATH = "docspec.schema.json";

    @Override
    @DocMethod(since = "3.0.0")
    public void execute() throws MojoExecutionException, MojoFailureException {
        getLog().info("DocSpec: Validating specification at " + specFile.getAbsolutePath());

        // -----------------------------------------------------------
        // 1. Verify the spec file exists
        // -----------------------------------------------------------
        if (!specFile.exists()) {
            throw new MojoFailureException(
                    "DocSpec specification file not found: " + specFile.getAbsolutePath()
                            + ". Run the 'generate' goal first.");
        }
        if (!specFile.isFile()) {
            throw new MojoFailureException(
                    "DocSpec specification path is not a file: " + specFile.getAbsolutePath());
        }

        // -----------------------------------------------------------
        // 2. Load the JSON schema from the classpath
        // -----------------------------------------------------------
        JsonSchema schema = loadSchema();

        // -----------------------------------------------------------
        // 3. Parse the specification file
        // -----------------------------------------------------------
        ObjectMapper mapper = new ObjectMapper();
        JsonNode specNode;
        try {
            specNode = mapper.readTree(specFile);
        } catch (IOException e) {
            throw new MojoExecutionException(
                    "Failed to parse DocSpec specification file: " + specFile.getAbsolutePath(), e);
        }

        // -----------------------------------------------------------
        // 4. Validate and report
        // -----------------------------------------------------------
        Set<ValidationMessage> errors = schema.validate(specNode);

        if (errors.isEmpty()) {
            getLog().info("DocSpec: Specification is valid.");
        } else {
            getLog().error("DocSpec: Specification validation failed with "
                    + errors.size() + " error(s):");
            getLog().error("");

            int index = 1;
            for (ValidationMessage error : errors) {
                getLog().error("  " + index + ") " + error.getMessage());
                if (error.getInstanceLocation() != null) {
                    getLog().error("     at: " + error.getInstanceLocation());
                }
                index++;
            }
            getLog().error("");

            throw new MojoFailureException(
                    "DocSpec specification validation failed with " + errors.size()
                            + " error(s). See messages above for details.");
        }
    }

    /**
     * Loads the DocSpec JSON Schema from the classpath.
     */
    private JsonSchema loadSchema() throws MojoExecutionException {
        InputStream schemaStream = getClass().getClassLoader().getResourceAsStream(SCHEMA_CLASSPATH);
        if (schemaStream == null) {
            throw new MojoExecutionException(
                    "DocSpec JSON Schema not found on classpath: " + SCHEMA_CLASSPATH
                            + ". Ensure docspec-processor-java is on the plugin classpath.");
        }

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode schemaNode = mapper.readTree(schemaStream);

            JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
            return factory.getSchema(schemaNode);
        } catch (IOException e) {
            throw new MojoExecutionException(
                    "Failed to parse DocSpec JSON Schema from classpath", e);
        } finally {
            try {
                schemaStream.close();
            } catch (IOException ignored) {
                // best-effort close
            }
        }
    }
}
