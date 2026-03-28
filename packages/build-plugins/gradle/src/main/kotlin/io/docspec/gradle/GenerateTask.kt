package io.docspec.gradle

import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Classpath
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.TaskAction
import java.io.File
import java.nio.file.FileVisitResult
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.SimpleFileVisitor
import java.nio.file.attribute.BasicFileAttributes
import javax.tools.DiagnosticCollector
import javax.tools.JavaFileObject
import javax.tools.ToolProvider

/**
 * Gradle task that generates `docspec.json` by running the DocSpec
 * annotation processor against the project's Java source files.
 *
 * This mirrors the behavior of the Maven `GenerateMojo`: it invokes
 * `javac -proc:only` programmatically through the ToolProvider API,
 * passing all configuration as `-A` processor options.
 */
abstract class GenerateTask : DefaultTask() {

    @get:Input
    abstract val sourceDirectories: ListProperty<String>

    @get:Input
    abstract val groupId: Property<String>

    @get:Input
    abstract val artifactId: Property<String>

    @get:Input
    abstract val version: Property<String>

    @get:Input
    abstract val audience: Property<String>

    @get:Input
    abstract val discoveryMode: Property<String>

    @get:Input
    abstract val inferDescriptions: Property<Boolean>

    @get:Input
    abstract val includeDeprecated: Property<Boolean>

    @get:Input
    abstract val dstiEnabled: Property<Boolean>

    @get:OutputDirectory
    abstract val outputDirectory: Property<String>

    @get:Classpath
    abstract val classpath: ConfigurableFileCollection

    @TaskAction
    fun generate() {
        val outputDir = File(outputDirectory.get())
        outputDir.mkdirs()

        logger.lifecycle("")
        logger.lifecycle("\u001B[36m========================================\u001B[0m")
        logger.lifecycle("\u001B[36m  DocSpec: Generating Specification\u001B[0m")
        logger.lifecycle("\u001B[36m========================================\u001B[0m")
        logger.lifecycle("")

        // 1. Obtain the system Java compiler
        val compiler = ToolProvider.getSystemJavaCompiler()
            ?: throw GradleException(
                "No Java compiler available. Ensure Gradle is running with a JDK (not a JRE)."
            )

        // 2. Collect source files
        val sourceFiles = collectSourceFiles()
        if (sourceFiles.isEmpty()) {
            logger.warn("\u001B[33mDocSpec: No Java source files found. Skipping generation.\u001B[0m")
            return
        }
        logger.lifecycle("  Source files found: ${sourceFiles.size}")

        // 3. Build the compile classpath string
        val classpathString = classpath.files
            .filter { it.exists() }
            .joinToString(File.pathSeparator) { it.absolutePath }

        // 4. Build processor options
        val processorOptions = buildProcessorOptions(outputDir)
        processorOptions.forEach { opt ->
            logger.debug("  Processor option: $opt")
        }

        // 5. Assemble compiler options
        val options = mutableListOf<String>()
        options.add("-proc:only")

        if (classpathString.isNotEmpty()) {
            options.add("-classpath")
            options.add(classpathString)
        }

        val sourcePath = sourceDirectories.get().joinToString(File.pathSeparator)
        if (sourcePath.isNotEmpty()) {
            options.add("-sourcepath")
            options.add(sourcePath)
        }

        options.addAll(processorOptions)

        // 6. Run the compiler task
        val diagnostics = DiagnosticCollector<JavaFileObject>()
        compiler.getStandardFileManager(diagnostics, null, null).use { fileManager ->
            val compilationUnits = fileManager.getJavaFileObjectsFromFiles(sourceFiles)

            val task = compiler.getTask(
                null,
                fileManager,
                diagnostics,
                options,
                null,
                compilationUnits
            )

            // Load and set the DocSpecProcessor explicitly
            val processorClass = Class.forName("io.docspec.processor.DocSpecProcessor")
            val processor = processorClass.getDeclaredConstructor().newInstance() as javax.annotation.processing.Processor
            task.setProcessors(listOf(processor))

            val success = task.call()

            // Log diagnostics with colored output
            for (d in diagnostics.diagnostics) {
                when (d.kind) {
                    javax.tools.Diagnostic.Kind.ERROR ->
                        logger.error("\u001B[31m  ERROR: ${d.getMessage(null)}\u001B[0m")
                    javax.tools.Diagnostic.Kind.WARNING,
                    javax.tools.Diagnostic.Kind.MANDATORY_WARNING ->
                        logger.warn("\u001B[33m  WARN:  ${d.getMessage(null)}\u001B[0m")
                    javax.tools.Diagnostic.Kind.NOTE ->
                        logger.info("  NOTE:  ${d.getMessage(null)}")
                    else ->
                        logger.debug("  ${d.getMessage(null)}")
                }
            }

            if (!success) {
                throw GradleException(
                    "DocSpec annotation processing failed. See compiler diagnostics above."
                )
            }

            val specFile = File(outputDir, "docspec.json")
            if (specFile.exists()) {
                val sizeKb = specFile.length() / 1024
                logger.lifecycle("")
                logger.lifecycle("\u001B[32m  Generated: ${specFile.absolutePath} (${sizeKb} KB)\u001B[0m")

                // Print a quick summary by reading module count from the JSON
                printSummary(specFile)
            } else {
                logger.warn("\u001B[33m  Processing succeeded but docspec.json was not created.\u001B[0m")
                logger.warn("\u001B[33m  The processor may not have found any documentable types.\u001B[0m")
            }
        }

        logger.lifecycle("")
        logger.lifecycle("\u001B[36m========================================\u001B[0m")
        logger.lifecycle("")
    }

    /**
     * Recursively collects all `.java` files from the configured source directories.
     */
    private fun collectSourceFiles(): List<File> {
        val files = mutableListOf<File>()
        for (dirPath in sourceDirectories.get()) {
            val dir = Path.of(dirPath)
            if (!Files.isDirectory(dir)) {
                logger.debug("  Source directory does not exist, skipping: $dirPath")
                continue
            }
            Files.walkFileTree(dir, object : SimpleFileVisitor<Path>() {
                override fun visitFile(file: Path, attrs: BasicFileAttributes): FileVisitResult {
                    if (file.toString().endsWith(".java")) {
                        files.add(file.toFile())
                    }
                    return FileVisitResult.CONTINUE
                }
            })
        }
        return files
    }

    /**
     * Builds the list of `-A` processor options matching the keys expected
     * by the DocSpec annotation processor.
     */
    private fun buildProcessorOptions(outputDir: File): List<String> {
        val opts = mutableListOf<String>()

        opts.add("-Adocspec.output.dir=${outputDir.absolutePath}")
        opts.add("-Adocspec.artifact.groupId=${groupId.get()}")
        opts.add("-Adocspec.artifact.artifactId=${artifactId.get()}")
        opts.add("-Adocspec.artifact.version=${version.get()}")
        opts.add("-Adocspec.audience=${audience.get()}")
        opts.add("-Adocspec.discovery.mode=${discoveryMode.get()}")
        opts.add("-Adocspec.discovery.inferDescriptions=${inferDescriptions.get()}")
        opts.add("-Adocspec.discovery.includeDeprecated=${includeDeprecated.get()}")
        opts.add("-Adocspec.dsti.enabled=${dstiEnabled.get()}")

        return opts
    }

    /**
     * Reads the generated docspec.json and prints a summary of what was discovered.
     */
    private fun printSummary(specFile: File) {
        try {
            val mapper = com.fasterxml.jackson.databind.ObjectMapper()
            val root = mapper.readTree(specFile)

            val modules = root.path("modules")
            val moduleCount = if (modules.isArray) modules.size() else 0
            var memberCount = 0
            if (modules.isArray) {
                for (module in modules) {
                    val members = module.path("members")
                    if (members.isArray) memberCount += members.size()
                }
            }

            val intentMethods = root.path("intentGraph").path("methods")
            val intentCount = if (intentMethods.isArray) intentMethods.size() else 0

            val coverageNode = root.path("discovery").path("coveragePercent")
            val coverage = if (coverageNode.isNumber) "${coverageNode.intValue()}%" else "N/A"

            logger.lifecycle("")
            logger.lifecycle("  Modules:        $moduleCount")
            logger.lifecycle("  Members:        $memberCount")
            logger.lifecycle("  Intent methods: $intentCount")
            logger.lifecycle("  Coverage:       $coverage")
        } catch (e: Exception) {
            logger.debug("Could not parse summary from docspec.json: ${e.message}")
        }
    }
}
