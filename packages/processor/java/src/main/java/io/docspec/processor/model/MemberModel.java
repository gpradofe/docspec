package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class MemberModel {

    private String kind;
    private String name;
    private String qualified;
    private String description;
    private String since;
    private String deprecated;
    private String visibility;
    private String audience;
    private String discoveredFrom;
    private List<String> tags = new ArrayList<>();
    private List<String> modifiers = new ArrayList<>();
    private List<String> typeParams = new ArrayList<>();
    @JsonProperty("implements")
    private List<String> implementsList = new ArrayList<>();

    @JsonProperty("extends")
    private String extendsType;

    private List<ConstructorModel> constructors = new ArrayList<>();
    private List<MethodModel> methods = new ArrayList<>();
    private List<FieldModel> fields = new ArrayList<>();
    private List<String> values = new ArrayList<>();
    private List<ExampleModel> examples = new ArrayList<>();
    private ReferencedByModel referencedBy;
    private String kindCategory;
    private List<MemberDependencyModel> dependencies = new ArrayList<>();
    private OrderingModel ordering;
    private MonotonicModel monotonic;
    private ConservationModel conservation;
    private List<CompareModel> comparisons;
    private List<RelationModel> relations;

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getQualified() {
        return qualified;
    }

    public void setQualified(String qualified) {
        this.qualified = qualified;
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

    public String getAudience() {
        return audience;
    }

    public void setAudience(String audience) {
        this.audience = audience;
    }

    public String getDiscoveredFrom() {
        return discoveredFrom;
    }

    public void setDiscoveredFrom(String discoveredFrom) {
        this.discoveredFrom = discoveredFrom;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public List<String> getModifiers() {
        return modifiers;
    }

    public void setModifiers(List<String> modifiers) {
        this.modifiers = modifiers;
    }

    public List<String> getTypeParams() {
        return typeParams;
    }

    public void setTypeParams(List<String> typeParams) {
        this.typeParams = typeParams;
    }

    public List<String> getImplementsList() {
        return implementsList;
    }

    public void setImplementsList(List<String> implementsList) {
        this.implementsList = implementsList;
    }

    public String getExtendsType() {
        return extendsType;
    }

    public void setExtendsType(String extendsType) {
        this.extendsType = extendsType;
    }

    public List<ConstructorModel> getConstructors() {
        return constructors;
    }

    public void setConstructors(List<ConstructorModel> constructors) {
        this.constructors = constructors;
    }

    public List<MethodModel> getMethods() {
        return methods;
    }

    public void setMethods(List<MethodModel> methods) {
        this.methods = methods;
    }

    public List<FieldModel> getFields() {
        return fields;
    }

    public void setFields(List<FieldModel> fields) {
        this.fields = fields;
    }

    public List<String> getValues() {
        return values;
    }

    public void setValues(List<String> values) {
        this.values = values;
    }

    public List<ExampleModel> getExamples() {
        return examples;
    }

    public void setExamples(List<ExampleModel> examples) {
        this.examples = examples;
    }

    public ReferencedByModel getReferencedBy() {
        return referencedBy;
    }

    public void setReferencedBy(ReferencedByModel referencedBy) {
        this.referencedBy = referencedBy;
    }

    public String getKindCategory() {
        return kindCategory;
    }

    public void setKindCategory(String kindCategory) {
        this.kindCategory = kindCategory;
    }

    public List<MemberDependencyModel> getDependencies() {
        return dependencies;
    }

    public void setDependencies(List<MemberDependencyModel> dependencies) {
        this.dependencies = dependencies;
    }

    public OrderingModel getOrdering() {
        return ordering;
    }

    public void setOrdering(OrderingModel ordering) {
        this.ordering = ordering;
    }

    public MonotonicModel getMonotonic() {
        return monotonic;
    }

    public void setMonotonic(MonotonicModel monotonic) {
        this.monotonic = monotonic;
    }

    public ConservationModel getConservation() {
        return conservation;
    }

    public void setConservation(ConservationModel conservation) {
        this.conservation = conservation;
    }

    public List<CompareModel> getComparisons() {
        return comparisons;
    }

    public void setComparisons(List<CompareModel> comparisons) {
        this.comparisons = comparisons;
    }

    public List<RelationModel> getRelations() {
        return relations;
    }

    public void setRelations(List<RelationModel> relations) {
        this.relations = relations;
    }
}
