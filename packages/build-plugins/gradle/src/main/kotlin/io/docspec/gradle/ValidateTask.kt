package io.docspec.gradle

import com.fasterxml.jackson.databind.ObjectMapper
import com.networknt.schema.JsonSchemaFactory
import com.networknt.schema.SpecVersion
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction
import java.io.File

/**
 * Gradle task that validates a generated `docspec.json` file against the
 * DocSpec v3.0.0 JSON Schema.
 *
 * The schema is loaded from the `docspec-processor-java` JAR on the
 * classpath (at `docspec.schema.json`). Each validation error is printed
 * with its JSON pointer path before the build is failed.
 */
abstract class ValidateTask : DefaultTask() {

    @get:Input
    abstract val specFile: Property<File>

    @TaskAction
    fun validate() {
        logger.lifecycle("")
        logger.lifecycle("\u001B[36m========================================\u001B[0m")
        logger.lifecycle("\u001B[36m  DocSpec: Validating Specification\u001B[0m")
        logger.lifecycle("\u001B[36m========================================\u001B[0m")
        logger.lifecycle("")

        val file = specFile.get()

        // 1. Verify the spec file exists
        if (!file.exists()) {
            throw GradleException(
                "DocSpec specification file not found: ${file.absolutePath}\n" +
                "  Run the 'docspecGenerate' task first."
            )
        }
        if (!file.isFile) {
            throw GradleException(
                "DocSpec specification path is not a file: ${file.absolutePath}"
            )
        }

        logger.lifecycle("  File: ${file.absolutePath}")
        logger.lifecycle("  Size: ${file.length() / 1024} KB")
        logger.lifecycle("")

        // 2. Load the JSON schema from the classpath
        val schemaStream = javaClass.classLoader.getResourceAsStream("docspec.schema.json")
            ?: throw GradleException(
                "DocSpec JSON Schema not found on classpath.\n" +
                "  Ensure docspec-processor-java is a dependency of the docspec plugin."
            )

        val mapper = ObjectMapper()
        val schemaNode = schemaStream.use { mapper.readTree(it) }
        val factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012)
        val schema = factory.getSchema(schemaNode)

        // 3. Parse the specification file
        val specNode = try {
            mapper.readTree(file)
        } catch (e: Exception) {
            throw GradleException(
                "Failed to parse DocSpec specification file: ${file.absolutePath}\n  ${e.message}"
            )
        }

        // 4. Validate
        val errors = schema.validate(specNode)

        if (errors.isEmpty()) {
            // Check version field
            val versionNode = specNode.path("docspec")
            val specVersion = if (versionNode.isTextual) versionNode.asText() else "unknown"

            logger.lifecycle("\u001B[32m  Validation PASSED\u001B[0m")
            logger.lifecycle("  DocSpec version: $specVersion")
            logger.lifecycle("  Schema: JSON Schema Draft 2020-12")
            logger.lifecycle("")

            // Additional structural checks
            val modules = specNode.path("modules")
            val moduleCount = if (modules.isArray) modules.size() else 0
            logger.lifecycle("  Modules validated: $moduleCount")

            val hasIntentGraph = specNode.has("intentGraph") && !specNode.path("intentGraph").isNull
            val hasSecurity = specNode.has("security") && !specNode.path("security").isNull
            val hasObservability = specNode.has("observability") && !specNode.path("observability").isNull

            logger.lifecycle("  Intent graph:      ${if (hasIntentGraph) "present" else "absent"}")
            logger.lifecycle("  Security model:    ${if (hasSecurity) "present" else "absent"}")
            logger.lifecycle("  Observability:     ${if (hasObservability) "present" else "absent"}")
        } else {
            logger.error("\u001B[31m  Validation FAILED with ${errors.size} error(s):\u001B[0m")
            logger.error("")

            var index = 1
            for (error in errors) {
                logger.error("\u001B[31m  $index) ${error.message}\u001B[0m")
                val location = error.instanceLocation
                if (location != null) {
                    logger.error("\u001B[31m     at: $location\u001B[0m")
                }
                index++
            }
            logger.error("")

            throw GradleException(
                "DocSpec specification validation failed with ${errors.size} error(s). " +
                "See messages above for details."
            )
        }

        logger.lifecycle("")
        logger.lifecycle("\u001B[36m========================================\u001B[0m")
        logger.lifecycle("")
    }
}
