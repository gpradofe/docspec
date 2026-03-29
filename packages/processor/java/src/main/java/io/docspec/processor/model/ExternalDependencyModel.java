package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.docspec.annotation.DocInvariant;

import java.util.ArrayList;
import java.util.List;

@DocInvariant(on = "ExternalDependencyModel", rules = {"name NOT_BLANK"})
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class ExternalDependencyModel {

    private String name;
    private String baseUrl;
    private String auth;
    private List<ExternalDependencyEndpointModel> endpoints = new ArrayList<>();
    private RateLimitModel rateLimit;
    private String sla;
    private String fallback;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getAuth() {
        return auth;
    }

    public void setAuth(String auth) {
        this.auth = auth;
    }

    public List<ExternalDependencyEndpointModel> getEndpoints() {
        return endpoints;
    }

    public void setEndpoints(List<ExternalDependencyEndpointModel> endpoints) {
        this.endpoints = endpoints;
    }

    public RateLimitModel getRateLimit() {
        return rateLimit;
    }

    public void setRateLimit(RateLimitModel rateLimit) {
        this.rateLimit = rateLimit;
    }

    public String getSla() {
        return sla;
    }

    public void setSla(String sla) {
        this.sla = sla;
    }

    public String getFallback() {
        return fallback;
    }

    public void setFallback(String fallback) {
        this.fallback = fallback;
    }
}
