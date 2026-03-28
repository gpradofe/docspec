package io.docspec.gradle

import org.gradle.api.Project
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import javax.inject.Inject

/**
 * DSL extension for configuring DocSpec within a Gradle build.
 *
 * Usage in `build.gradle.kts`:
 * ```kotlin
 * docspec {
 *     groupId.set("com.example")
 *     artifactId.set("my-service")
 *     version.set("1.0.0")
 *     outputDir.set(layout.buildDirectory.dir("docspec").get().asFile.absolutePath)
 *     discoveryMode.set("auto")
 *     inferDescriptions.set(true)
 *     dstiEnabled.set(true)
 *     minimumCoverage.set(50)
 * }
 * ```
 */
abstract class DocSpecExtension @Inject constructor(project: Project) {

    private val objects = project.objects

    /** Maven-style group ID for the artifact. Defaults to the Gradle project group. */
    val groupId: Property<String> = objects.property(String::class.java).convention(
        project.provider { project.group.toString().ifEmpty { "unknown" } }
    )

    /** Artifact ID. Defaults to the Gradle project name. */
    val artifactId: Property<String> = objects.property(String::class.java).convention(
        project.provider { project.name }
    )

    /** Artifact version. Defaults to the Gradle project version. */
    val version: Property<String> = objects.property(String::class.java).convention(
        project.provider { project.version.toString().let { if (it == "unspecified") "0.0.0" else it } }
    )

    /** Output directory for docspec.json. Defaults to `build/docspec`. */
    val outputDir: Property<String> = objects.property(String::class.java).convention(
        project.layout.buildDirectory.dir("docspec").map { it.asFile.absolutePath }.get()
    )

    /**
     * Explicit source directories to scan. If empty, the plugin
     * auto-detects from the Java/Kotlin source sets.
     */
    val sourceDirectories: ListProperty<String> = objects.listProperty(String::class.java).convention(
        emptyList()
    )

    /** Documentation audience: "public", "internal", or "all". */
    val audience: Property<String> = objects.property(String::class.java).convention("public")

    /** Discovery mode: "auto", "annotated", or "all". */
    val discoveryMode: Property<String> = objects.property(String::class.java).convention("auto")

    /** Whether to infer descriptions from method/class names. */
    val inferDescriptions: Property<Boolean> = objects.property(Boolean::class.java).convention(true)

    /** Whether to include deprecated members in the output. */
    val includeDeprecated: Property<Boolean> = objects.property(Boolean::class.java).convention(false)

    /** Whether to enable DSTI intent graph extraction. */
    val dstiEnabled: Property<Boolean> = objects.property(Boolean::class.java).convention(true)

    /** Minimum documentation coverage percentage for the coverage task. */
    val minimumCoverage: Property<Int> = objects.property(Int::class.java).convention(0)

    /** Whether the coverage task should fail the build when below threshold. */
    val failOnBelowThreshold: Property<Boolean> = objects.property(Boolean::class.java).convention(true)
}
