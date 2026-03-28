package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
@JsonPropertyOrder({"docspec", "artifact", "project", "modules", "flows", "contexts",
        "crossRefs", "errors", "events", "dataModels", "dataStores", "configuration",
        "security", "externalDependencies", "observability", "privacy", "intentGraph", "discovery"})
public class DocSpecModel {

    @JsonProperty("docspec")
    private String version = "3.0.0";

    private ArtifactModel artifact;
    private ProjectModel project;
    private List<ModuleModel> modules = new ArrayList<>();
    private List<FlowModel> flows = new ArrayList<>();
    private List<ContextModel> contexts = new ArrayList<>();
    private List<CrossRefModel> crossRefs = new ArrayList<>();
    private List<ErrorModel> errors = new ArrayList<>();
    private List<EventModel> events = new ArrayList<>();
    private List<DataModelInfo> dataModels = new ArrayList<>();
    private List<DataStoreModel> dataStores = new ArrayList<>();
    private List<ConfigurationPropertyModel> configuration = new ArrayList<>();
    private SecurityModel security;
    private List<ExternalDependencyModel> externalDependencies = new ArrayList<>();
    private ObservabilityModel observability;
    private List<PrivacyFieldModel> privacy = new ArrayList<>();
    private IntentGraphModel intentGraph;
    private DiscoveryModel discovery;

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public ArtifactModel getArtifact() { return artifact; }
    public void setArtifact(ArtifactModel artifact) { this.artifact = artifact; }

    public ProjectModel getProject() { return project; }
    public void setProject(ProjectModel project) { this.project = project; }

    public List<ModuleModel> getModules() { return modules; }
    public void setModules(List<ModuleModel> modules) { this.modules = modules; }

    public List<FlowModel> getFlows() { return flows; }
    public void setFlows(List<FlowModel> flows) { this.flows = flows; }

    public List<ContextModel> getContexts() { return contexts; }
    public void setContexts(List<ContextModel> contexts) { this.contexts = contexts; }

    public List<CrossRefModel> getCrossRefs() { return crossRefs; }
    public void setCrossRefs(List<CrossRefModel> crossRefs) { this.crossRefs = crossRefs; }

    public List<ErrorModel> getErrors() { return errors; }
    public void setErrors(List<ErrorModel> errors) { this.errors = errors; }

    public List<EventModel> getEvents() { return events; }
    public void setEvents(List<EventModel> events) { this.events = events; }

    public List<DataModelInfo> getDataModels() { return dataModels; }
    public void setDataModels(List<DataModelInfo> dataModels) { this.dataModels = dataModels; }

    public List<DataStoreModel> getDataStores() { return dataStores; }
    public void setDataStores(List<DataStoreModel> dataStores) { this.dataStores = dataStores; }

    public List<ConfigurationPropertyModel> getConfiguration() { return configuration; }
    public void setConfiguration(List<ConfigurationPropertyModel> configuration) { this.configuration = configuration; }

    public SecurityModel getSecurity() { return security; }
    public void setSecurity(SecurityModel security) { this.security = security; }

    public List<ExternalDependencyModel> getExternalDependencies() { return externalDependencies; }
    public void setExternalDependencies(List<ExternalDependencyModel> externalDependencies) { this.externalDependencies = externalDependencies; }

    public ObservabilityModel getObservability() { return observability; }
    public void setObservability(ObservabilityModel observability) { this.observability = observability; }

    public List<PrivacyFieldModel> getPrivacy() { return privacy; }
    public void setPrivacy(List<PrivacyFieldModel> privacy) { this.privacy = privacy; }

    public IntentGraphModel getIntentGraph() { return intentGraph; }
    public void setIntentGraph(IntentGraphModel intentGraph) { this.intentGraph = intentGraph; }

    public DiscoveryModel getDiscovery() { return discovery; }
    public void setDiscovery(DiscoveryModel discovery) { this.discovery = discovery; }
}
