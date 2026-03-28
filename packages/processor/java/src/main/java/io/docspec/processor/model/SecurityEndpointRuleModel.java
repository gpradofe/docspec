package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class SecurityEndpointRuleModel {

    private String path;
    private List<String> rules = new ArrayList<>();

    @JsonProperty("public")
    private boolean isPublic;

    private RateLimitModel rateLimit;

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public List<String> getRules() {
        return rules;
    }

    public void setRules(List<String> rules) {
        this.rules = rules;
    }

    public boolean isPublic() {
        return isPublic;
    }

    public void setPublic(boolean isPublic) {
        this.isPublic = isPublic;
    }

    public RateLimitModel getRateLimit() {
        return rateLimit;
    }

    public void setRateLimit(RateLimitModel rateLimit) {
        this.rateLimit = rateLimit;
    }
}
