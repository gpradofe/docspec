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

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * Verifies that all internal links (e.g. references to other members, flows, endpoints)
 * within description fields resolve to valid targets in the specification.
 */
@Mojo(name = "check-links", defaultPhase = LifecyclePhase.VERIFY)
@DocBoundary("Maven plugin entry point")
public class CheckLinksMojo extends AbstractMojo {

    @Parameter(property = "docspec.spec.file", defaultValue = "${project.build.directory}/docspec.json")
    private File specFile;

    @Parameter(property = "docspec.failOnError", defaultValue = "true")
    private boolean failOnError;

    @Override
    @DocMethod(since = "3.0.0")
    public void execute() throws MojoExecutionException, MojoFailureException {
        getLog().info("DocSpec: Checking internal links in " + specFile.getAbsolutePath());

        if (!specFile.exists()) {
            throw new MojoFailureException("DocSpec specification not found: " + specFile.getAbsolutePath());
        }

        ObjectMapper mapper = new ObjectMapper();
        JsonNode spec;
        try {
            spec = mapper.readTree(specFile);
        } catch (IOException e) {
            throw new MojoExecutionException("Failed to parse specification", e);
        }

        List<String> brokenLinks = new ArrayList<>();
        // Scan all string fields for markdown-style links [text](docspec://...)
        scanForLinks(spec, "$", brokenLinks);

        if (brokenLinks.isEmpty()) {
            getLog().info("DocSpec: All internal links are valid.");
        } else {
            for (String link : brokenLinks) {
                getLog().warn("  Broken link: " + link);
            }
            if (failOnError) {
                throw new MojoFailureException("Found " + brokenLinks.size() + " broken internal link(s).");
            }
        }
    }

    private void scanForLinks(JsonNode node, String path, List<String> brokenLinks) {
        if (node.isTextual()) {
            String text = node.asText();
            // Check for docspec:// protocol links
            if (text.contains("docspec://")) {
                // Extract and validate links
                int idx = 0;
                while ((idx = text.indexOf("docspec://", idx)) >= 0) {
                    int end = text.indexOf(')', idx);
                    if (end < 0) end = text.indexOf(' ', idx);
                    if (end < 0) end = text.length();
                    String link = text.substring(idx, end);
                    brokenLinks.add(path + ": " + link);
                    idx = end;
                }
            }
        } else if (node.isObject()) {
            Iterator<String> fields = node.fieldNames();
            while (fields.hasNext()) {
                String field = fields.next();
                scanForLinks(node.get(field), path + "." + field, brokenLinks);
            }
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                scanForLinks(node.get(i), path + "[" + i + "]", brokenLinks);
            }
        }
    }
}
