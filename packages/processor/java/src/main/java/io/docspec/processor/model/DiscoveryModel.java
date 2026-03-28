package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class DiscoveryModel {

    private String mode;
    private List<String> frameworks = new ArrayList<>();
    private List<String> scannedPackages = new ArrayList<>();
    private List<String> excludedPackages = new ArrayList<>();
    private int totalClasses;
    private int documentedClasses;
    private int autoDiscoveredClasses;
    private int annotatedClasses;
    private int inferredDescriptions;
    private int totalMethods;
    private int documentedMethods;
    private int totalParams;
    private int documentedParams;
    private double coveragePercent;

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public List<String> getFrameworks() {
        return frameworks;
    }

    public void setFrameworks(List<String> frameworks) {
        this.frameworks = frameworks;
    }

    public List<String> getScannedPackages() {
        return scannedPackages;
    }

    public void setScannedPackages(List<String> scannedPackages) {
        this.scannedPackages = scannedPackages;
    }

    public List<String> getExcludedPackages() {
        return excludedPackages;
    }

    public void setExcludedPackages(List<String> excludedPackages) {
        this.excludedPackages = excludedPackages;
    }

    public int getTotalClasses() {
        return totalClasses;
    }

    public void setTotalClasses(int totalClasses) {
        this.totalClasses = totalClasses;
    }

    public int getDocumentedClasses() {
        return documentedClasses;
    }

    public void setDocumentedClasses(int documentedClasses) {
        this.documentedClasses = documentedClasses;
    }

    public int getAutoDiscoveredClasses() {
        return autoDiscoveredClasses;
    }

    public void setAutoDiscoveredClasses(int autoDiscoveredClasses) {
        this.autoDiscoveredClasses = autoDiscoveredClasses;
    }

    public int getAnnotatedClasses() {
        return annotatedClasses;
    }

    public void setAnnotatedClasses(int annotatedClasses) {
        this.annotatedClasses = annotatedClasses;
    }

    public int getInferredDescriptions() {
        return inferredDescriptions;
    }

    public void setInferredDescriptions(int inferredDescriptions) {
        this.inferredDescriptions = inferredDescriptions;
    }

    public int getTotalMethods() {
        return totalMethods;
    }

    public void setTotalMethods(int totalMethods) {
        this.totalMethods = totalMethods;
    }

    public int getDocumentedMethods() {
        return documentedMethods;
    }

    public void setDocumentedMethods(int documentedMethods) {
        this.documentedMethods = documentedMethods;
    }

    public int getTotalParams() {
        return totalParams;
    }

    public void setTotalParams(int totalParams) {
        this.totalParams = totalParams;
    }

    public int getDocumentedParams() {
        return documentedParams;
    }

    public void setDocumentedParams(int documentedParams) {
        this.documentedParams = documentedParams;
    }

    public double getCoveragePercent() {
        return coveragePercent;
    }

    public void setCoveragePercent(double coveragePercent) {
        this.coveragePercent = coveragePercent;
    }
}
