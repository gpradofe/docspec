package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.docspec.annotation.DocInvariant;

import java.util.ArrayList;
import java.util.List;

@DocInvariant(on = "IntentSignalsModel", rules = {"intentDensityScore >= 0.0", "intentDensityScore <= 10.0"})
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class IntentSignalsModel {

    private NameSemanticsModel nameSemantics;
    private Integer guardClauses;
    private Integer branches;
    private DataFlowModel dataFlow;
    private LoopPropertiesModel loopProperties;
    private ErrorHandlingModel errorHandling;
    private List<String> constants = new ArrayList<>();
    private int nullChecks;
    private int assertions;
    private int logStatements;
    private int validationAnnotations;
    private List<String> dependencies = new ArrayList<>();
    private Double intentDensityScore;

    public NameSemanticsModel getNameSemantics() {
        return nameSemantics;
    }

    public void setNameSemantics(NameSemanticsModel nameSemantics) {
        this.nameSemantics = nameSemantics;
    }

    public Integer getGuardClauses() {
        return guardClauses;
    }

    public void setGuardClauses(Integer guardClauses) {
        this.guardClauses = guardClauses;
    }

    public Integer getBranches() {
        return branches;
    }

    public void setBranches(Integer branches) {
        this.branches = branches;
    }

    public DataFlowModel getDataFlow() {
        return dataFlow;
    }

    public void setDataFlow(DataFlowModel dataFlow) {
        this.dataFlow = dataFlow;
    }

    public LoopPropertiesModel getLoopProperties() {
        return loopProperties;
    }

    public void setLoopProperties(LoopPropertiesModel loopProperties) {
        this.loopProperties = loopProperties;
    }

    public ErrorHandlingModel getErrorHandling() {
        return errorHandling;
    }

    public void setErrorHandling(ErrorHandlingModel errorHandling) {
        this.errorHandling = errorHandling;
    }

    public List<String> getConstants() {
        return constants;
    }

    public void setConstants(List<String> constants) {
        this.constants = constants;
    }

    public int getNullChecks() {
        return nullChecks;
    }

    public void setNullChecks(int nullChecks) {
        this.nullChecks = nullChecks;
    }

    public int getAssertions() {
        return assertions;
    }

    public void setAssertions(int assertions) {
        this.assertions = assertions;
    }

    public int getLogStatements() {
        return logStatements;
    }

    public void setLogStatements(int logStatements) {
        this.logStatements = logStatements;
    }

    public int getValidationAnnotations() {
        return validationAnnotations;
    }

    public void setValidationAnnotations(int validationAnnotations) {
        this.validationAnnotations = validationAnnotations;
    }

    public List<String> getDependencies() {
        return dependencies;
    }

    public void setDependencies(List<String> dependencies) {
        this.dependencies = dependencies;
    }

    public Double getIntentDensityScore() {
        return intentDensityScore;
    }

    public void setIntentDensityScore(Double intentDensityScore) {
        this.intentDensityScore = intentDensityScore;
    }

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class NameSemanticsModel {

        private String verb;
        private String object;
        private String intent;

        public String getVerb() {
            return verb;
        }

        public void setVerb(String verb) {
            this.verb = verb;
        }

        public String getObject() {
            return object;
        }

        public void setObject(String object) {
            this.object = object;
        }

        public String getIntent() {
            return intent;
        }

        public void setIntent(String intent) {
            this.intent = intent;
        }
    }

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class DataFlowModel {

        private List<String> reads = new ArrayList<>();
        private List<String> writes = new ArrayList<>();

        public List<String> getReads() {
            return reads;
        }

        public void setReads(List<String> reads) {
            this.reads = reads;
        }

        public List<String> getWrites() {
            return writes;
        }

        public void setWrites(List<String> writes) {
            this.writes = writes;
        }
    }

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class LoopPropertiesModel {

        private Boolean hasStreams;
        private Boolean hasEnhancedFor;
        private List<String> streamOps = new ArrayList<>();

        public Boolean getHasStreams() {
            return hasStreams;
        }

        public void setHasStreams(Boolean hasStreams) {
            this.hasStreams = hasStreams;
        }

        public Boolean getHasEnhancedFor() {
            return hasEnhancedFor;
        }

        public void setHasEnhancedFor(Boolean hasEnhancedFor) {
            this.hasEnhancedFor = hasEnhancedFor;
        }

        public List<String> getStreamOps() {
            return streamOps;
        }

        public void setStreamOps(List<String> streamOps) {
            this.streamOps = streamOps;
        }
    }

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class ErrorHandlingModel {

        private Integer catchBlocks;
        private List<String> caughtTypes = new ArrayList<>();

        public Integer getCatchBlocks() {
            return catchBlocks;
        }

        public void setCatchBlocks(Integer catchBlocks) {
            this.catchBlocks = catchBlocks;
        }

        public List<String> getCaughtTypes() {
            return caughtTypes;
        }

        public void setCaughtTypes(List<String> caughtTypes) {
            this.caughtTypes = caughtTypes;
        }
    }
}
