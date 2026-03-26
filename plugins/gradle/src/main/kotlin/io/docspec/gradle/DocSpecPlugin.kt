package io.docspec.gradle

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.plugins.JavaPlugin
import org.gradle.api.tasks.SourceSetContainer

/**
 * Gradle plugin entry point for DocSpec.
 *
 * Applies as `id("io.docspec")` and registers:
 * - A `docspec` DSL extension for configuration
 * - `docspecGenerate` task to produce docspec.json
 * - `docspecValidate` task to validate against the JSON schema
 * - `docspecCoverage` task to check documentation coverage
 *
 * All tasks depend on `compileJava` so that compiled classes and the
 * annotation processor classpath are available.
 */
class DocSpecPlugin : Plugin<Project> {

    override fun apply(project: Project) {
        // Register the DSL extension: docspec { ... }
        val extension = project.extensions.create(
            "docspec",
            DocSpecExtension::class.java,
            project
        )

        // Wire tasks after the project has been evaluated so that
        // user configuration in the docspec { } block is resolved.
        project.afterEvaluate {
            val javaPluginApplied = project.plugins.hasPlugin(JavaPlugin::class.java)

            // Register docspecGenerate
            val generateTask = project.tasks.register("docspecGenerate", GenerateTask::class.java) { task ->
                task.group = TASK_GROUP
                task.description = "Generate docspec.json from project source code"

                task.sourceDirectories.set(resolveSourceDirs(project, extension))
                task.outputDirectory.set(extension.outputDir.get())
                task.groupId.set(extension.groupId.get())
                task.artifactId.set(extension.artifactId.get())
                task.version.set(extension.version.get())
                task.audience.set(extension.audience.get())
                task.discoveryMode.set(extension.discoveryMode.get())
                task.inferDescriptions.set(extension.inferDescriptions.get())
                task.includeDeprecated.set(extension.includeDeprecated.get())
                task.dstiEnabled.set(extension.dstiEnabled.get())
                task.classpath.setFrom(resolveClasspath(project))

                if (javaPluginApplied) {
                    task.dependsOn("compileJava")
                }
            }

            // Register docspecValidate
            val validateTask = project.tasks.register("docspecValidate", ValidateTask::class.java) { task ->
                task.group = TASK_GROUP
                task.description = "Validate docspec.json against the DocSpec v3 JSON Schema"

                task.specFile.set(
                    project.file("${extension.outputDir.get()}/docspec.json")
                )
            }

            // Register docspecCoverage
            project.tasks.register("docspecCoverage", CoverageTask::class.java) { task ->
                task.group = TASK_GROUP
                task.description = "Check documentation coverage against minimum threshold"

                task.specFile.set(
                    project.file("${extension.outputDir.get()}/docspec.json")
                )
                task.minimumCoverage.set(extension.minimumCoverage.get())
                task.failOnBelowThreshold.set(extension.failOnBelowThreshold.get())
            }
        }
    }

    /**
     * Resolves the source directories to process. If the user configured
     * explicit directories, those are used. Otherwise, falls back to the
     * main source set's Java directories.
     */
    private fun resolveSourceDirs(project: Project, extension: DocSpecExtension): List<String> {
        val configured = extension.sourceDirectories.get()
        if (configured.isNotEmpty()) {
            return configured
        }

        // Fall back to the Java plugin's main source set
        val sourceSets = project.extensions.findByType(SourceSetContainer::class.java)
        if (sourceSets != null) {
            val mainSourceSet = sourceSets.findByName("main")
            if (mainSourceSet != null) {
                return mainSourceSet.java.srcDirs.map { it.absolutePath }
            }
        }

        // Last resort: conventional directory
        return listOf(project.file("src/main/java").absolutePath)
    }

    /**
     * Resolves the compile classpath including project classes and
     * all compile-scope dependencies.
     */
    private fun resolveClasspath(project: Project): Set<java.io.File> {
        val files = mutableSetOf<java.io.File>()

        // Add compiled classes output
        val sourceSets = project.extensions.findByType(SourceSetContainer::class.java)
        if (sourceSets != null) {
            val mainSourceSet = sourceSets.findByName("main")
            if (mainSourceSet != null) {
                files.addAll(mainSourceSet.output.classesDirs.files)
            }
        }

        // Add compile classpath dependencies
        val compileConfig = project.configurations.findByName("compileClasspath")
        if (compileConfig != null) {
            files.addAll(compileConfig.resolve())
        }

        return files
    }

    companion object {
        const val TASK_GROUP = "docspec"
    }
}
