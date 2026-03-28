package io.docspec.maven;

import io.docspec.annotation.DocMethod;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.MojoFailureException;
import org.apache.maven.plugins.annotations.Component;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.apache.maven.project.MavenProject;
import org.apache.maven.project.MavenProjectHelper;

import java.io.File;

/**
 * Attaches the generated {@code docspec.json} as a classified artifact to
 * the Maven project so it is deployed alongside the main JAR.
 *
 * <p>After this mojo runs, the specification file can be resolved from a
 * Maven repository using the configured classifier (default
 * {@code "docspec"}) and type {@code "json"}. For example:</p>
 *
 * <pre>
 *   com.example:my-service:1.0.0:json:docspec
 * </pre>
 */
@Mojo(
        name = "publish",
        defaultPhase = LifecyclePhase.DEPLOY
)
public class PublishMojo extends AbstractMojo {

    @Parameter(defaultValue = "${project}", readonly = true, required = true)
    private MavenProject project;

    /**
     * Path to the DocSpec specification file to attach.
     */
    @Parameter(
            property = "docspec.spec.file",
            defaultValue = "${project.build.directory}/docspec.json"
    )
    private File specFile;

    /**
     * Maven classifier used when attaching the specification artifact.
     */
    @Parameter(
            property = "docspec.classifier",
            defaultValue = "docspec"
    )
    private String classifier;

    /**
     * Maven project helper used to attach the artifact.
     */
    @Component
    private MavenProjectHelper projectHelper;

    @Override
    @DocMethod(since = "3.0.0")
    public void execute() throws MojoExecutionException, MojoFailureException {
        getLog().info("DocSpec: Publishing specification as classified artifact");

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
        // 2. Attach the artifact
        // -----------------------------------------------------------
        getLog().info("DocSpec: Attaching " + specFile.getName()
                + " as " + project.getGroupId()
                + ":" + project.getArtifactId()
                + ":" + project.getVersion()
                + ":json:" + classifier);

        projectHelper.attachArtifact(project, "json", classifier, specFile);

        getLog().info("DocSpec: Specification artifact attached successfully. "
                + "It will be deployed with the project artifacts.");
    }
}
