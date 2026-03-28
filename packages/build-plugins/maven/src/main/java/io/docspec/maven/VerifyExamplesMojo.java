package io.docspec.maven;

import io.docspec.annotation.DocMethod;
import org.apache.maven.artifact.Artifact;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.MojoFailureException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.apache.maven.plugins.annotations.ResolutionScope;
import org.apache.maven.project.MavenProject;

import javax.tools.Diagnostic;
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

/**
 * Verifies that example source files annotated with {@code @DocSpecExample}
 * compile successfully against the project's test classpath.
 *
 * <p>This is a Phase 1 implementation that performs compilation verification
 * only. Future phases may also extract example source code and attach it to
 * the corresponding documented elements in the specification.</p>
 *
 * <p>Example files are expected to live under the configured examples
 * directory (default: {@code src/test/examples}) and contain methods
 * annotated with {@link io.docspec.annotation.DocSpecExample}.</p>
 */
@Mojo(
        name = "verify-examples",
        defaultPhase = LifecyclePhase.TEST,
        requiresDependencyResolution = ResolutionScope.TEST
)
public class VerifyExamplesMojo extends AbstractMojo {

    @Parameter(defaultValue = "${project}", readonly = true, required = true)
    private MavenProject project;

    /**
     * Directory containing example source files annotated with
     * {@code @DocSpecExample}.
     */
    @Parameter(
            property = "docspec.examples.dir",
            defaultValue = "${project.basedir}/src/test/examples"
    )
    private File examplesDir;

    @Override
    @DocMethod(since = "3.0.0")
    public void execute() throws MojoExecutionException, MojoFailureException {
        getLog().info("DocSpec: Verifying example files");

        // -----------------------------------------------------------
        // 1. Check that the examples directory exists
        // -----------------------------------------------------------
        if (!examplesDir.exists() || !examplesDir.isDirectory()) {
            getLog().info("DocSpec: Examples directory not found: " + examplesDir.getAbsolutePath()
                    + ". Skipping example verification.");
            return;
        }

        // -----------------------------------------------------------
        // 2. Collect Java source files from the examples directory
        // -----------------------------------------------------------
        List<File> exampleFiles = collectExampleFiles();
        if (exampleFiles.isEmpty()) {
            getLog().info("DocSpec: No Java example files found in " + examplesDir.getAbsolutePath()
                    + ". Skipping.");
            return;
        }
        getLog().info("DocSpec: Found " + exampleFiles.size() + " example file(s) to verify");

        // -----------------------------------------------------------
        // 3. Obtain the system Java compiler
        // -----------------------------------------------------------
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            throw new MojoExecutionException(
                    "No Java compiler available. Ensure you are running Maven with a JDK (not a JRE).");
        }

        // -----------------------------------------------------------
        // 4. Build the test classpath
        // -----------------------------------------------------------
        String classpath = buildTestClasspath();
        getLog().debug("DocSpec: Test classpath: " + classpath);

        // -----------------------------------------------------------
        // 5. Compile the example files (verification only)
        // -----------------------------------------------------------
        List<String> options = new ArrayList<>();

        if (!classpath.isEmpty()) {
            options.add("-classpath");
            options.add(classpath);
        }

        // Add the test source roots so examples can reference test helpers
        String sourcePath = buildSourcePath();
        if (!sourcePath.isEmpty()) {
            options.add("-sourcepath");
            options.add(sourcePath);
        }

        // Output to a temporary directory so we don't pollute the build output
        File tempOutputDir = new File(project.getBuild().getDirectory(), "docspec-examples-verify");
        if (!tempOutputDir.exists() && !tempOutputDir.mkdirs()) {
            throw new MojoExecutionException(
                    "Failed to create temporary output directory: " + tempOutputDir.getAbsolutePath());
        }
        options.add("-d");
        options.add(tempOutputDir.getAbsolutePath());

        // Disable annotation processing for the example compilation
        options.add("-proc:none");

        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        try (StandardJavaFileManager fileManager = compiler.getStandardFileManager(diagnostics, null, null)) {
            Iterable<? extends JavaFileObject> compilationUnits =
                    fileManager.getJavaFileObjectsFromFiles(exampleFiles);

            JavaCompiler.CompilationTask task = compiler.getTask(
                    null,
                    fileManager,
                    diagnostics,
                    options,
                    null,
                    compilationUnits
            );

            boolean success = task.call();

            // Log all diagnostics
            List<String> errors = new ArrayList<>();
            for (Diagnostic<? extends JavaFileObject> d : diagnostics.getDiagnostics()) {
                String location = "";
                if (d.getSource() != null) {
                    location = d.getSource().getName()
                            + ":" + d.getLineNumber()
                            + ": ";
                }
                String message = location + d.getMessage(null);

                switch (d.getKind()) {
                    case ERROR -> {
                        getLog().error("DocSpec: " + message);
                        errors.add(message);
                    }
                    case WARNING, MANDATORY_WARNING -> getLog().warn("DocSpec: " + message);
                    case NOTE -> getLog().info("DocSpec: " + message);
                    default -> getLog().debug("DocSpec: " + message);
                }
            }

            if (!success) {
                getLog().error("");
                getLog().error("DocSpec: Example verification FAILED");
                getLog().error("DocSpec: " + errors.size() + " compilation error(s) in example files:");
                for (String err : errors) {
                    getLog().error("  - " + err);
                }
                throw new MojoFailureException(
                        "DocSpec example verification failed: " + errors.size()
                                + " example file(s) failed to compile. "
                                + "Ensure all @DocSpecExample methods compile against the test classpath.");
            }

            getLog().info("DocSpec: All " + exampleFiles.size()
                    + " example file(s) compiled successfully.");
        } catch (IOException e) {
            throw new MojoExecutionException(
                    "Failed to initialize the Java file manager for example verification", e);
        }
    }

    // ---------------------------------------------------------------
    // Helper methods
    // ---------------------------------------------------------------

    /**
     * Recursively collects all {@code .java} files from the examples directory.
     */
    private List<File> collectExampleFiles() throws MojoExecutionException {
        List<File> files = new ArrayList<>();
        Path root = examplesDir.toPath();
        try {
            Files.walkFileTree(root, new SimpleFileVisitor<>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                    if (file.toString().endsWith(".java")) {
                        files.add(file.toFile());
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            throw new MojoExecutionException(
                    "Failed to scan examples directory: " + examplesDir.getAbsolutePath(), e);
        }
        return files;
    }

    /**
     * Builds the test classpath including compiled classes, test classes,
     * and all resolved artifacts (including test-scoped ones).
     */
    private String buildTestClasspath() {
        List<String> entries = new ArrayList<>();

        // Project compiled classes
        String outputDir = project.getBuild().getOutputDirectory();
        if (outputDir != null && new File(outputDir).exists()) {
            entries.add(outputDir);
        }

        // Project test compiled classes
        String testOutputDir = project.getBuild().getTestOutputDirectory();
        if (testOutputDir != null && new File(testOutputDir).exists()) {
            entries.add(testOutputDir);
        }

        // All artifacts (compile + test scope)
        if (project.getArtifacts() != null) {
            for (Artifact artifact : project.getArtifacts()) {
                if (artifact.getFile() != null) {
                    entries.add(artifact.getFile().getAbsolutePath());
                }
            }
        }

        return String.join(File.pathSeparator, entries);
    }

    /**
     * Builds the source path from project source roots, test source roots,
     * and the examples directory itself.
     */
    private String buildSourcePath() {
        List<String> roots = new ArrayList<>();

        // Main source roots
        if (project.getCompileSourceRoots() != null) {
            roots.addAll(project.getCompileSourceRoots());
        }

        // Test source roots
        if (project.getTestCompileSourceRoots() != null) {
            roots.addAll(project.getTestCompileSourceRoots());
        }

        // The examples directory itself
        roots.add(examplesDir.getAbsolutePath());

        return roots.stream()
                .filter(r -> new File(r).exists())
                .collect(Collectors.joining(File.pathSeparator));
    }
}
