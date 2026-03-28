package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class SecurityModel {

    private String authMechanism;
    private List<SecurityEndpointRuleModel> endpoints = new ArrayList<>();
    private List<String> roles = new ArrayList<>();
    private List<String> scopes = new ArrayList<>();

    public String getAuthMechanism() {
        return authMechanism;
    }

    public void setAuthMechanism(String authMechanism) {
        this.authMechanism = authMechanism;
    }

    public List<SecurityEndpointRuleModel> getEndpoints() {
        return endpoints;
    }

    public void setEndpoints(List<SecurityEndpointRuleModel> endpoints) {
        this.endpoints = endpoints;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public List<String> getScopes() {
        return scopes;
    }

    public void setScopes(List<String> scopes) {
        this.scopes = scopes;
    }
}
