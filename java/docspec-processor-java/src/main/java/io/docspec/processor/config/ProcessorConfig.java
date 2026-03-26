package io.docspec.processor.config;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class ProcessorConfig {

    private DiscoveryMode discoveryMode = DiscoveryMode.HYBRID;
    private List<String> includePackages = Collections.emptyList();
    private List<String> excludePackages = Collections.emptyList();
    private boolean inferDescriptions = true;
    private boolean detectSpring = true;
    private boolean detectJpa = true;
    private boolean detectJackson = true;
    private String groupBy = "package";
    private String openApiPath = "";
    private String outputDir = "";
    private String artifactGroupId = "";
    private String artifactId = "";
    private String artifactVersion = "";
    private String audience = "public";
    private String projectName = "";
    private String projectDescription = "";
    private boolean includeDeprecated = true;
    private boolean includeProtected = false;

    // v3 extractor flags
    private boolean securityEnabled = true;
    private boolean databaseIntrospect = false;
    private String databaseConnectionUrl = "";
    private boolean dstiEnabled = true;
    private boolean privacyEnabled = true;
    private boolean observabilityEnabled = true;

    public static ProcessorConfig from(Map<String, String> options) {
        ProcessorConfig config = new ProcessorConfig();

        config.discoveryMode = DiscoveryMode.fromString(
                options.getOrDefault("docspec.discovery.mode", "hybrid"));

        String include = options.getOrDefault("docspec.discovery.include", "");
        if (!include.isBlank()) {
            config.includePackages = Arrays.asList(include.split(","));
        }

        String exclude = options.getOrDefault("docspec.discovery.exclude", "");
        if (!exclude.isBlank()) {
            config.excludePackages = Arrays.asList(exclude.split(","));
        }

        config.inferDescriptions = Boolean.parseBoolean(
                options.getOrDefault("docspec.discovery.inferDescriptions", "true"));
        config.detectSpring = Boolean.parseBoolean(
                options.getOrDefault("docspec.discovery.frameworks.spring", "true"));
        config.detectJpa = Boolean.parseBoolean(
                options.getOrDefault("docspec.discovery.frameworks.jpa", "true"));
        config.detectJackson = Boolean.parseBoolean(
                options.getOrDefault("docspec.discovery.frameworks.jackson", "true"));
        config.groupBy = options.getOrDefault("docspec.discovery.groupBy", "package");
        config.openApiPath = options.getOrDefault("docspec.openapi.path", "");
        config.outputDir = options.getOrDefault("docspec.output.dir", "");
        config.artifactGroupId = options.getOrDefault("docspec.artifact.groupId", "");
        config.artifactId = options.getOrDefault("docspec.artifact.artifactId", "");
        config.artifactVersion = options.getOrDefault("docspec.artifact.version", "");
        config.audience = options.getOrDefault("docspec.audience", "public");
        config.projectName = options.getOrDefault("docspec.project.name", "");
        config.projectDescription = options.getOrDefault("docspec.project.description", "");
        config.includeDeprecated = Boolean.parseBoolean(
                options.getOrDefault("docspec.discovery.includeDeprecated", "true"));
        config.includeProtected = Boolean.parseBoolean(
                options.getOrDefault("docspec.discovery.includeProtected", "false"));

        // v3 extractor flags
        config.securityEnabled = Boolean.parseBoolean(
                options.getOrDefault("docspec.security.enabled", "true"));
        config.databaseIntrospect = Boolean.parseBoolean(
                options.getOrDefault("docspec.database.introspect", "false"));
        config.databaseConnectionUrl = options.getOrDefault("docspec.database.connectionUrl", "");
        config.dstiEnabled = Boolean.parseBoolean(
                options.getOrDefault("docspec.dsti.enabled", "true"));
        config.privacyEnabled = Boolean.parseBoolean(
                options.getOrDefault("docspec.privacy.enabled", "true"));
        config.observabilityEnabled = Boolean.parseBoolean(
                options.getOrDefault("docspec.observability.enabled", "true"));

        return config;
    }

    public DiscoveryMode getDiscoveryMode() { return discoveryMode; }
    public List<String> getIncludePackages() { return includePackages; }
    public List<String> getExcludePackages() { return excludePackages; }
    public boolean isInferDescriptions() { return inferDescriptions; }
    public boolean isDetectSpring() { return detectSpring; }
    public boolean isDetectJpa() { return detectJpa; }
    public boolean isDetectJackson() { return detectJackson; }
    public String getGroupBy() { return groupBy; }
    public String getOpenApiPath() { return openApiPath; }
    public String getOutputDir() { return outputDir; }
    public String getArtifactGroupId() { return artifactGroupId; }
    public String getArtifactId() { return artifactId; }
    public String getArtifactVersion() { return artifactVersion; }
    public String getAudience() { return audience; }
    public String getProjectName() { return projectName; }
    public String getProjectDescription() { return projectDescription; }
    public boolean isIncludeDeprecated() { return includeDeprecated; }
    public boolean isIncludeProtected() { return includeProtected; }
    public boolean isSecurityEnabled() { return securityEnabled; }
    public boolean isDatabaseIntrospect() { return databaseIntrospect; }
    public String getDatabaseConnectionUrl() { return databaseConnectionUrl; }
    public boolean isDstiEnabled() { return dstiEnabled; }
    public boolean isPrivacyEnabled() { return privacyEnabled; }
    public boolean isObservabilityEnabled() { return observabilityEnabled; }
}
