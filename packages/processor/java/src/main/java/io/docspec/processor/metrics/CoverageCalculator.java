package io.docspec.processor.metrics;

import io.docspec.annotation.*;
import io.docspec.processor.model.*;

import java.util.List;

@DocInvariant(rules = {"coverage >= 0", "coverage <= 100"})
public class CoverageCalculator {

    private int totalClasses;
    private int documentedClasses;
    private int autoDiscoveredClasses;
    private int annotatedClasses;
    private int inferredDescriptions;
    private int totalMethods;
    private int documentedMethods;
    private int totalParams;
    private int documentedParams;

    @DocDeterministic
    @DocMethod(since = "3.0.0")
    @DocBoundary("coverage analysis entry point")
    public void analyze(DocSpecModel model) {
        for (ModuleModel module : model.getModules()) {
            for (MemberModel member : module.getMembers()) {
                totalClasses++;

                boolean hasDescription = member.getDescription() != null && !member.getDescription().isBlank();
                if (hasDescription) {
                    documentedClasses++;
                }

                if ("annotation".equals(member.getDiscoveredFrom())) {
                    annotatedClasses++;
                } else if ("auto".equals(member.getDiscoveredFrom()) || "framework".equals(member.getDiscoveredFrom())) {
                    autoDiscoveredClasses++;
                }

                // Analyze methods and parameters
                for (MethodModel method : member.getMethods()) {
                    totalMethods++;
                    if (method.getDescription() != null && !method.getDescription().isBlank()) {
                        documentedMethods++;
                    }

                    for (MethodParamModel param : method.getParams()) {
                        totalParams++;
                        if (param.getDescription() != null && !param.getDescription().isBlank()) {
                            documentedParams++;
                        }
                    }
                }
            }
        }
    }

    public void incrementInferredDescriptions() {
        inferredDescriptions++;
    }

    @DocMethod(since = "3.0.0")
    public DiscoveryModel toDiscoveryModel(String mode, List<String> frameworks,
                                            List<String> scannedPackages, List<String> excludedPackages) {
        DiscoveryModel discovery = new DiscoveryModel();
        discovery.setMode(mode);
        discovery.setFrameworks(frameworks);
        discovery.setScannedPackages(scannedPackages);
        discovery.setExcludedPackages(excludedPackages);
        discovery.setTotalClasses(totalClasses);
        discovery.setDocumentedClasses(documentedClasses);
        discovery.setAutoDiscoveredClasses(autoDiscoveredClasses);
        discovery.setAnnotatedClasses(annotatedClasses);
        discovery.setInferredDescriptions(inferredDescriptions);
        discovery.setTotalMethods(totalMethods);
        discovery.setDocumentedMethods(documentedMethods);
        discovery.setTotalParams(totalParams);
        discovery.setDocumentedParams(documentedParams);

        if (totalClasses > 0) {
            discovery.setCoveragePercent(
                    Math.round((double) documentedClasses / totalClasses * 1000.0) / 10.0);
        }
        return discovery;
    }

    public int getTotalClasses() { return totalClasses; }
    public int getDocumentedClasses() { return documentedClasses; }
    public double getCoveragePercent() {
        return totalClasses > 0 ? Math.round((double) documentedClasses / totalClasses * 1000.0) / 10.0 : 0;
    }
}
