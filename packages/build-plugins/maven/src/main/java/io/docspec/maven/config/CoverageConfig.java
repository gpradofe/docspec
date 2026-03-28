package io.docspec.maven.config;

import java.util.List;

/**
 * Configuration POJO for coverage enforcement settings in the DocSpec Maven plugin.
 * Maps to the {@code <coverage>} element in the plugin configuration.
 */
public class CoverageConfig {

    /**
     * Minimum documentation coverage percentage required to pass the build.
     */
    private int minimumPercent = 80;

    /**
     * Whether to fail the build when coverage is below the minimum threshold.
     */
    private boolean failOnBelowThreshold = true;

    /**
     * Patterns for types or packages to exclude from coverage calculation.
     */
    private List<String> excludes;

    // -- Getters and Setters --

    public int getMinimumPercent() {
        return minimumPercent;
    }

    public void setMinimumPercent(int minimumPercent) {
        this.minimumPercent = minimumPercent;
    }

    public boolean isFailOnBelowThreshold() {
        return failOnBelowThreshold;
    }

    public void setFailOnBelowThreshold(boolean failOnBelowThreshold) {
        this.failOnBelowThreshold = failOnBelowThreshold;
    }

    public List<String> getExcludes() {
        return excludes;
    }

    public void setExcludes(List<String> excludes) {
        this.excludes = excludes;
    }
}
