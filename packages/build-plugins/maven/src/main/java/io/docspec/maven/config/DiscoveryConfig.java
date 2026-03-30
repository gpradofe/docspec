package io.docspec.maven.config;

import io.docspec.annotation.DocBoundary;

import java.util.List;

@DocBoundary("Configuration POJO for discovery settings in the DocSpec Maven plugin. Maps to the discovery element in the plugin configuration.")
public class DiscoveryConfig {

    // Discovery mode: "auto", "annotated-only", or "hybrid"
    private String mode = "hybrid";

    // Package patterns to include in discovery
    private List<String> includes;

    // Package patterns to exclude from discovery
    private List<String> excludes;

    // Framework detection toggles
    private FrameworksConfig frameworks = new FrameworksConfig();

    // Whether to infer descriptions from naming conventions when no
    // JavaDoc or annotation description is present
    private boolean inferDescriptions = true;

    // How to group discovered types into modules: "package" or "stereotype"
    private String groupBy = "package";

    // Whether to include @Deprecated members in the spec output
    private boolean includeDeprecated = true;

    // Whether to include protected members in the spec output
    private boolean includeProtected = false;

    // v3 sub-configs
    private DatabaseConfig database;
    private DstiConfig dsti;
    private boolean securityEnabled = true;
    private boolean privacyEnabled = true;
    private boolean observabilityEnabled = true;

    // -- Getters and Setters --

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public List<String> getIncludes() {
        return includes;
    }

    public void setIncludes(List<String> includes) {
        this.includes = includes;
    }

    public List<String> getExcludes() {
        return excludes;
    }

    public void setExcludes(List<String> excludes) {
        this.excludes = excludes;
    }

    public FrameworksConfig getFrameworks() {
        return frameworks;
    }

    public void setFrameworks(FrameworksConfig frameworks) {
        this.frameworks = frameworks;
    }

    public boolean isInferDescriptions() {
        return inferDescriptions;
    }

    public void setInferDescriptions(boolean inferDescriptions) {
        this.inferDescriptions = inferDescriptions;
    }

    public String getGroupBy() {
        return groupBy;
    }

    public void setGroupBy(String groupBy) {
        this.groupBy = groupBy;
    }

    public boolean isIncludeDeprecated() {
        return includeDeprecated;
    }

    public void setIncludeDeprecated(boolean includeDeprecated) {
        this.includeDeprecated = includeDeprecated;
    }

    public boolean isIncludeProtected() {
        return includeProtected;
    }

    public void setIncludeProtected(boolean includeProtected) {
        this.includeProtected = includeProtected;
    }

    public DatabaseConfig getDatabase() { return database; }
    public void setDatabase(DatabaseConfig database) { this.database = database; }

    public DstiConfig getDsti() { return dsti; }
    public void setDsti(DstiConfig dsti) { this.dsti = dsti; }

    public boolean isSecurityEnabled() { return securityEnabled; }
    public void setSecurityEnabled(boolean securityEnabled) { this.securityEnabled = securityEnabled; }

    public boolean isPrivacyEnabled() { return privacyEnabled; }
    public void setPrivacyEnabled(boolean privacyEnabled) { this.privacyEnabled = privacyEnabled; }

    public boolean isObservabilityEnabled() { return observabilityEnabled; }
    public void setObservabilityEnabled(boolean observabilityEnabled) { this.observabilityEnabled = observabilityEnabled; }

    @DocBoundary("Database introspection configuration")
    public static class DatabaseConfig {
        private boolean introspect = false;
        private String connectionUrl = "";

        public boolean isIntrospect() { return introspect; }
        public void setIntrospect(boolean introspect) { this.introspect = introspect; }

        public String getConnectionUrl() { return connectionUrl; }
        public void setConnectionUrl(String connectionUrl) { this.connectionUrl = connectionUrl; }
    }

    @DocBoundary("DSTI configuration for Deep Structural and Textual Intent analysis")
    public static class DstiConfig {
        private boolean enabled = false;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
    }

    @DocBoundary("Framework detection toggles controlling whether the processor detects and extracts metadata from each framework")
    public static class FrameworksConfig {

        private boolean spring = true;
        private boolean jpa = true;
        private boolean jackson = true;

        public boolean isSpring() {
            return spring;
        }

        public void setSpring(boolean spring) {
            this.spring = spring;
        }

        public boolean isJpa() {
            return jpa;
        }

        public void setJpa(boolean jpa) {
            this.jpa = jpa;
        }

        public boolean isJackson() {
            return jackson;
        }

        public void setJackson(boolean jackson) {
            this.jackson = jackson;
        }
    }
}
