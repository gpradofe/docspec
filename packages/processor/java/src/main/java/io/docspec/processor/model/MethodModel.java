package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.docspec.annotation.DocInvariant;

import java.util.ArrayList;
import java.util.List;

@DocInvariant(on = "MethodModel", rules = {"name NOT_BLANK", "params NOT_NULL"})
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class MethodModel {

    private String name;
    private String description;
    private String since;
    private String deprecated;
    private String visibility;
    private List<String> modifiers = new ArrayList<>();
    private List<String> tags = new ArrayList<>();
    private List<MethodParamModel> params = new ArrayList<>();
    private ReturnModel returns;

    @JsonProperty("throws")
    private List<ThrowsModel> throwsList = new ArrayList<>();

    private List<ExampleModel> examples = new ArrayList<>();
    private EndpointMappingModel endpointMapping;
    private List<MethodErrorConditionModel> errorConditions = new ArrayList<>();
    private MethodPerformanceModel performance;
    private AsyncModel async;
    private String asyncApi;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSince() {
        return since;
    }

    public void setSince(String since) {
        this.since = since;
    }

    public String getDeprecated() {
        return deprecated;
    }

    public void setDeprecated(String deprecated) {
        this.deprecated = deprecated;
    }

    public String getVisibility() {
        return visibility;
    }

    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }

    public List<String> getModifiers() {
        return modifiers;
    }

    public void setModifiers(List<String> modifiers) {
        this.modifiers = modifiers;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public List<MethodParamModel> getParams() {
        return params;
    }

    public void setParams(List<MethodParamModel> params) {
        this.params = params;
    }

    public ReturnModel getReturns() {
        return returns;
    }

    public void setReturns(ReturnModel returns) {
        this.returns = returns;
    }

    public List<ThrowsModel> getThrowsList() {
        return throwsList;
    }

    public void setThrowsList(List<ThrowsModel> throwsList) {
        this.throwsList = throwsList;
    }

    public List<ExampleModel> getExamples() {
        return examples;
    }

    public void setExamples(List<ExampleModel> examples) {
        this.examples = examples;
    }

    public EndpointMappingModel getEndpointMapping() {
        return endpointMapping;
    }

    public void setEndpointMapping(EndpointMappingModel endpointMapping) {
        this.endpointMapping = endpointMapping;
    }

    public List<MethodErrorConditionModel> getErrorConditions() {
        return errorConditions;
    }

    public void setErrorConditions(List<MethodErrorConditionModel> errorConditions) {
        this.errorConditions = errorConditions;
    }

    public MethodPerformanceModel getPerformance() {
        return performance;
    }

    public void setPerformance(MethodPerformanceModel performance) {
        this.performance = performance;
    }

    public AsyncModel getAsync() {
        return async;
    }

    public void setAsync(AsyncModel async) {
        this.async = async;
    }

    public String getAsyncApi() {
        return asyncApi;
    }

    public void setAsyncApi(String asyncApi) {
        this.asyncApi = asyncApi;
    }

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class AsyncModel {

        private String mechanism;
        private String returnWrapper;

        public String getMechanism() {
            return mechanism;
        }

        public void setMechanism(String mechanism) {
            this.mechanism = mechanism;
        }

        public String getReturnWrapper() {
            return returnWrapper;
        }

        public void setReturnWrapper(String returnWrapper) {
            this.returnWrapper = returnWrapper;
        }
    }

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class ReturnModel {

        private String type;
        private String description;

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }
    }

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    public static class ThrowsModel {

        private String type;
        private String description;

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }
    }
}
