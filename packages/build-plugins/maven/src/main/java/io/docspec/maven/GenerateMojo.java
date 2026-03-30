package io.docspec.maven;

import io.docspec.annotation.*;
import io.docspec.maven.config.DiscoveryConfig;
import org.apache.maven.artifact.Artifact;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.MojoFailureException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.apache.maven.plugins.annotations.ResolutionScope;
import org.apache.maven.project.MavenProject;

import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;
import java.io.File;
import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Mojo(
        name = "generate",
        defaultPhase = LifecyclePhase.COMPILE,
        requiresDependencyResolution = ResolutionScope.COMPILE
)
@DocContext(id = "generate-context",
    name = "Generate Mojo Context",
    flow = "processing-pipeline",
    inputs = {
        @ContextInput(name = "sourceRoots", source = "project.compileSourceRoots", description = "Java source directories to scan"),
        @ContextInput(name = "classpath", source = "project.artifacts", description = "Compile classpath for framework detection"),
        @ContextInput(name = "outputDir", source = "config", description = "Target directory for docspec.json output")
    },
    uses = {
        @ContextUses(artifact = "io.docspec:docspec-processor-java", what = "DocSpecProcessor", why = "Annotation processor that generates the docspec.json specification")
    }
)
@DocBoundary("Runs the DocSpec annotation processor against the project source code to generate docspec.json. Programmatically invokes javac with -proc:only so only annotation processing is performed. All discovery and framework settings are forwarded as -A compiler options.")
@DocError(code = "DOCSPEC_GEN_001",
    description = "Source compilation or annotation processing failed during docspec:generate.",
    causes = {"No JDK available (running with a JRE)", "Source files contain compilation errors", "Annotation processor threw an exception", "File manager could not be initialized"},
    resolution = "Ensure Maven runs with a JDK, source code compiles, and all dependencies are resolved."
)
@DocUses(artifact = "io.docspec:docspec-processor-java",
    description = "Programmatically invokes DocSpecProcessor via javac -proc:only for annotation processing")
public class GenerateMojo extends AbstractMojo {

    @Parameter(defaultValue = "${project}", readonly = true, required = true)
    private MavenProject project;

    @Parameter(property = "docspec.discovery")
    private DiscoveryConfig discovery;

    @Parameter(property = "docspec.output.dir", defaultValue = "${project.build.directory}")
    private File outputDir;

    @Parameter(property = "docspec.classifier", defaultValue = "docspec")
    private String classifier;

    @Parameter(property = "docspec.audience", defaultValue = "public")
    private String audience;

    @Parameter(property = "docspec.openapi.path")
    private String openApiPath;

    @Override
    @DocMethod(since = "3.0.0")
    @DocBoundary("Maven generate goal entry point")
    public void execute() throws MojoExecutionException, MojoFailureException {
        getLog().info("DocSpec: Starting specification generation");

        // -----------------------------------------------------------
        // 1. Obtain the system Java compiler
        // -----------------------------------------------------------
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            throw new MojoExecutionException(
                    "No Java compiler available. Ensure you are running Maven with a JDK (not a JRE).");
        }

        // -----------------------------------------------------------
        // 2. Collect source files from compile source roots
        // -----------------------------------------------------------
        List<File> sourceFiles = collectSourceFiles();
        if (sourceFiles.isEmpty()) {
            getLog().warn("DocSpec: No Java source files found in compile source roots. Skipping.");
            return;
        }
        getLog().info("DocSpec: Found " + sourceFiles.size() + " source file(s)");

        // -----------------------------------------------------------
        // 3. Build the compile classpath
        // -----------------------------------------------------------
        String classpath = buildClasspath();
        getLog().debug("DocSpec: Compile classpath: " + classpath);

        // -----------------------------------------------------------
        // 4. Build processor (-A) options from configuration
        // -----------------------------------------------------------
        List<String> processorOptions = buildProcessorOptions();
        for (String opt : processorOptions) {
            getLog().debug("DocSpec: Processor option: " + opt);
        }

        // -----------------------------------------------------------
        // 5. Assemble compiler options
        // -----------------------------------------------------------
        List<String> options = new ArrayList<>();
        options.add("-proc:only");

        if (!classpath.isEmpty()) {
            options.add("-classpath");
            options.add(classpath);
        }

        // Add source roots to the source path so the processor sees all types
        String sourcePath = project.getCompileSourceRoots().stream()
                .collect(Collectors.joining(File.pathSeparator));
        if (!sourcePath.isEmpty()) {
            options.add("-sourcepath");
            options.add(sourcePath);
        }

        options.addAll(processorOptions);

        // -----------------------------------------------------------
        // 6. Run the compiler task
        // -----------------------------------------------------------
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        try (StandardJavaFileManager fileManager = compiler.getStandardFileManager(diagnostics, null, null)) {
            Iterable<? extends JavaFileObject> compilationUnits =
                    fileManager.getJavaFileObjectsFromFiles(sourceFiles);

            JavaCompiler.CompilationTask task = compiler.getTask(
                    null,           // writer (null = System.err)
                    fileManager,
                    diagnostics,
                    options,
                    null,           // classes to process (null = all)
                    compilationUnits
            );

            // Use the DocSpecProcessor explicitly
            task.setProcessors(List.of(new io.docspec.processor.DocSpecProcessor()));

            boolean success = task.call();

            // Log diagnostics
            diagnostics.getDiagnostics().forEach(d -> {
                switch (d.getKind()) {
                    case ERROR -> getLog().error("DocSpec: " + d.getMessage(null));
                    case WARNING, MANDATORY_WARNING -> getLog().warn("DocSpec: " + d.getMessage(null));
                    case NOTE -> getLog().info("DocSpec: " + d.getMessage(null));
                    default -> getLog().debug("DocSpec: " + d.getMessage(null));
                }
            });

            if (!success) {
                throw new MojoFailureException(
                        "DocSpec annotation processing failed. See compiler diagnostics above.");
            }

            File specFile = new File(outputDir, "docspec.json");
            if (specFile.exists()) {
                getLog().info("DocSpec: Specification generated at " + specFile.getAbsolutePath());
            } else {
                getLog().warn("DocSpec: Processing succeeded but docspec.json was not created. "
                        + "The processor may not have found any documentable types.");
            }
        } catch (IOException e) {
            throw new MojoExecutionException("Failed to initialize the Java file manager", e);
        }
    }

    // ---------------------------------------------------------------
    // Helper methods
    // ---------------------------------------------------------------

    @DocMethod("Recursively collects all .java files from the project compile source roots")
    private List<File> collectSourceFiles() throws MojoExecutionException {
        List<File> sourceFiles = new ArrayList<>();
        for (String root : project.getCompileSourceRoots()) {
            Path rootPath = Path.of(root);
            if (!Files.isDirectory(rootPath)) {
                getLog().debug("DocSpec: Source root does not exist, skipping: " + root);
                continue;
            }
            try {
                Files.walkFileTree(rootPath, new SimpleFileVisitor<>() {
                    @Override
                    public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                        if (file.toString().endsWith(".java")) {
                            sourceFiles.add(file.toFile());
                        }
                        return FileVisitResult.CONTINUE;
                    }
                });
            } catch (IOException e) {
                throw new MojoExecutionException(
                        "Failed to walk source root: " + root, e);
            }
        }
        return sourceFiles;
    }

    @DocMethod("Builds the compile classpath string from the project resolved artifacts and output directory")
    private String buildClasspath() {
        List<String> classpathEntries = new ArrayList<>();

        // Add the project's own compiled classes
        String outputDirectory = project.getBuild().getOutputDirectory();
        if (outputDirectory != null && new File(outputDirectory).exists()) {
            classpathEntries.add(outputDirectory);
        }

        // Add all compile-scope artifacts
        if (project.getArtifacts() != null) {
            for (Artifact artifact : project.getArtifacts()) {
                if (artifact.getFile() != null) {
                    classpathEntries.add(artifact.getFile().getAbsolutePath());
                }
            }
        }

        return String.join(File.pathSeparator, classpathEntries);
    }

    @DocMethod("Builds the list of -A processor options from the plugin configuration matching keys expected by ProcessorConfig")
    private List<String> buildProcessorOptions() {
        List<String> opts = new ArrayList<>();

        // Always pass output directory and artifact coordinates
        opts.add("-Adocspec.output.dir=" + outputDir.getAbsolutePath());
        opts.add("-Adocspec.artifact.groupId=" + project.getGroupId());
        opts.add("-Adocspec.artifact.artifactId=" + project.getArtifactId());
        opts.add("-Adocspec.artifact.version=" + project.getVersion());
        opts.add("-Adocspec.audience=" + audience);

        // Pass project metadata for the project object
        if (project.getName() != null && !project.getName().isBlank()) {
            opts.add("-Adocspec.project.name=" + project.getName());
        }
        if (project.getDescription() != null && !project.getDescription().isBlank()) {
            opts.add("-Adocspec.project.description=" + project.getDescription());
        }

        if (openApiPath != null && !openApiPath.isBlank()) {
            opts.add("-Adocspec.openapi.path=" + openApiPath);
        }

        // Discovery configuration
        if (discovery != null) {
            opts.add("-Adocspec.discovery.mode=" + discovery.getMode());
            opts.add("-Adocspec.discovery.inferDescriptions=" + discovery.isInferDescriptions());
            opts.add("-Adocspec.discovery.groupBy=" + discovery.getGroupBy());
            opts.add("-Adocspec.discovery.includeDeprecated=" + discovery.isIncludeDeprecated());
            opts.add("-Adocspec.discovery.includeProtected=" + discovery.isIncludeProtected());

            if (discovery.getIncludes() != null && !discovery.getIncludes().isEmpty()) {
                opts.add("-Adocspec.discovery.include=" + String.join(",", discovery.getIncludes()));
            }
            if (discovery.getExcludes() != null && !discovery.getExcludes().isEmpty()) {
                opts.add("-Adocspec.discovery.exclude=" + String.join(",", discovery.getExcludes()));
            }

            if (discovery.getFrameworks() != null) {
                DiscoveryConfig.FrameworksConfig fw = discovery.getFrameworks();
                opts.add("-Adocspec.discovery.frameworks.spring=" + fw.isSpring());
                opts.add("-Adocspec.discovery.frameworks.jpa=" + fw.isJpa());
                opts.add("-Adocspec.discovery.frameworks.jackson=" + fw.isJackson());
            }

            // v3 config options
            opts.add("-Adocspec.security.enabled=" + discovery.isSecurityEnabled());
            opts.add("-Adocspec.privacy.enabled=" + discovery.isPrivacyEnabled());
            opts.add("-Adocspec.observability.enabled=" + discovery.isObservabilityEnabled());

            if (discovery.getDatabase() != null) {
                DiscoveryConfig.DatabaseConfig db = discovery.getDatabase();
                opts.add("-Adocspec.database.introspect=" + db.isIntrospect());
                if (db.getConnectionUrl() != null && !db.getConnectionUrl().isBlank()) {
                    opts.add("-Adocspec.database.connectionUrl=" + db.getConnectionUrl());
                }
            }

            if (discovery.getDsti() != null) {
                opts.add("-Adocspec.dsti.enabled=" + discovery.getDsti().isEnabled());
            }
        }

        return opts;
    }
}
