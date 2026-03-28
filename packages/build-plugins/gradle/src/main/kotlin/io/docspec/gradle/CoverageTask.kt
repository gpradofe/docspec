package io.docspec.gradle

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction
import java.io.File

/**
 * Gradle task that reads the generated `docspec.json` and checks
 * documentation coverage against a configurable minimum threshold.
 *
 * Prints a detailed coverage report including type counts, method counts,
 * framework detection results, and the overall coverage percentage.
 */
abstract class CoverageTask : DefaultTask() {

    @get:Input
    abstract val specFile: Property<File>

    @get:Input
    abstract val minimumCoverage: Property<Int>

    @get:Input
    abstract val failOnBelowThreshold: Property<Boolean>

    @TaskAction
    fun checkCoverage() {
        val file = specFile.get()
        val minimum = minimumCoverage.get()

        logger.lifecycle("")
        logger.lifecycle("\u001B[36m========================================\u001B[0m")
        logger.lifecycle("\u001B[36m  DocSpec Documentation Coverage Report\u001B[0m")
        logger.lifecycle("\u001B[36m========================================\u001B[0m")
        logger.lifecycle("")

        // 1. Verify the spec file exists
        if (!file.exists()) {
            throw GradleException(
                "DocSpec specification file not found: ${file.absolutePath}\n" +
                "  Run the 'docspecGenerate' task first."
            )
        }

        // 2. Parse the specification
        val mapper = ObjectMapper()
        val root: JsonNode = try {
            mapper.readTree(file)
        } catch (e: Exception) {
            throw GradleException(
                "Failed to parse DocSpec specification: ${file.absolutePath}\n  ${e.message}"
            )
        }

        val discoveryNode = root.path("discovery")
        if (discoveryNode.isMissingNode) {
            throw GradleException(
                "DocSpec specification does not contain a 'discovery' section.\n" +
                "  Ensure the specification was generated with a compatible processor version."
            )
        }

        val coveragePercentNode = discoveryNode.path("coveragePercent")
        if (coveragePercentNode.isMissingNode || !coveragePercentNode.isNumber) {
            throw GradleException(
                "DocSpec specification does not contain 'discovery.coveragePercent'.\n" +
                "  Ensure the specification was generated with a compatible processor version."
            )
        }

        val actualCoverage = coveragePercentNode.intValue()

        // 3. Print detailed coverage report
        printReport(discoveryNode, actualCoverage, minimum)

        // 4. Count modules and members for summary
        val modules = root.path("modules")
        val moduleCount = if (modules.isArray) modules.size() else 0
        var totalMembers = 0
        var documentedMembers = 0
        if (modules.isArray) {
            for (module in modules) {
                val members = module.path("members")
                if (members.isArray) {
                    for (member in members) {
                        totalMembers++
                        val desc = member.path("description")
                        if (!desc.isMissingNode && desc.isTextual && desc.asText().isNotBlank()) {
                            documentedMembers++
                        }
                    }
                }
            }
        }

        logger.lifecycle("  Modules:             $moduleCount")
        logger.lifecycle("  Total members:       $totalMembers")
        logger.lifecycle("  Documented members:  $documentedMembers")
        logger.lifecycle("")

        // 5. Discovery metadata
        val modeNode = discoveryNode.path("mode")
        if (!modeNode.isMissingNode) {
            logger.lifecycle("  Discovery mode:      ${modeNode.asText()}")
        }

        val totalTypesNode = discoveryNode.path("totalTypes")
        if (!totalTypesNode.isMissingNode) {
            logger.lifecycle("  Total types:         ${totalTypesNode.intValue()}")
        }

        val documentedTypesNode = discoveryNode.path("documentedTypes")
        if (!documentedTypesNode.isMissingNode) {
            logger.lifecycle("  Documented types:    ${documentedTypesNode.intValue()}")
        }

        val totalMethodsNode = discoveryNode.path("totalMethods")
        if (!totalMethodsNode.isMissingNode) {
            logger.lifecycle("  Total methods:       ${totalMethodsNode.intValue()}")
        }

        val documentedMethodsNode = discoveryNode.path("documentedMethods")
        if (!documentedMethodsNode.isMissingNode) {
            logger.lifecycle("  Documented methods:  ${documentedMethodsNode.intValue()}")
        }

        val inferredNode = discoveryNode.path("inferredDescriptions")
        if (!inferredNode.isMissingNode) {
            logger.lifecycle("  Inferred desc.:      ${inferredNode.intValue()}")
        }

        val frameworksNode = discoveryNode.path("detectedFrameworks")
        if (frameworksNode.isArray && frameworksNode.size() > 0) {
            val fwList = (0 until frameworksNode.size()).joinToString(", ") { frameworksNode[it].asText() }
            logger.lifecycle("  Frameworks:          $fwList")
        }

        logger.lifecycle("")

        // 6. Enforce threshold
        if (actualCoverage >= minimum) {
            logger.lifecycle("\u001B[32m  Coverage check PASSED ($actualCoverage% >= $minimum%)\u001B[0m")
        } else {
            val message = "Coverage check FAILED ($actualCoverage% < $minimum%)"
            if (failOnBelowThreshold.get()) {
                logger.error("\u001B[31m  $message\u001B[0m")
                logger.lifecycle("")
                logger.lifecycle("\u001B[36m========================================\u001B[0m")
                logger.lifecycle("")
                throw GradleException(
                    "Documentation coverage is $actualCoverage% which is below the required " +
                    "minimum of $minimum%."
                )
            } else {
                logger.warn("\u001B[33m  $message\u001B[0m")
                logger.warn("\u001B[33m  Build will not fail because failOnBelowThreshold is false.\u001B[0m")
            }
        }

        logger.lifecycle("")
        logger.lifecycle("\u001B[36m========================================\u001B[0m")
        logger.lifecycle("")
    }

    /**
     * Prints the coverage bar visualization.
     */
    private fun printReport(discoveryNode: JsonNode, actual: Int, minimum: Int) {
        val barLength = 40
        val filledLength = (actual * barLength) / 100
        val thresholdPos = (minimum * barLength) / 100

        val bar = StringBuilder("  [")
        for (i in 0 until barLength) {
            when {
                i < filledLength && actual >= minimum -> bar.append("\u001B[32m#\u001B[0m")
                i < filledLength -> bar.append("\u001B[31m#\u001B[0m")
                i == thresholdPos -> bar.append("\u001B[33m|\u001B[0m")
                else -> bar.append("\u001B[90m-\u001B[0m")
            }
        }
        bar.append("] $actual%")
        if (minimum > 0) {
            bar.append("  (min: $minimum%)")
        }

        logger.lifecycle(bar.toString())
        logger.lifecycle("")
    }
}
