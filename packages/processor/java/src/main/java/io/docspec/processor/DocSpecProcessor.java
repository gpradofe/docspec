package io.docspec.processor;

import io.docspec.annotation.*;
import io.docspec.processor.config.DiscoveryMode;
import io.docspec.processor.config.ProcessorConfig;
import io.docspec.processor.dsti.IntentGraphExtractor;
import io.docspec.processor.extractor.DocSpecExtractor;
import io.docspec.processor.extractor.*;
import io.docspec.processor.framework.*;
import io.docspec.processor.metrics.CoverageCalculator;
import io.docspec.processor.model.*;
import io.docspec.processor.output.SpecSerializer;
import io.docspec.processor.reader.AnnotationReader;
import io.docspec.processor.reader.DescriptionInferrer;
import io.docspec.processor.reader.JavaDocReader;
import io.docspec.processor.scanner.AutoDiscoveryScanner;

import javax.annotation.processing.*;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.*;
import javax.tools.Diagnostic;
import java.util.*;

@DocBoundary("annotation processor entry point")
@DocFlow(id = "processing-pipeline",
    name = "DocSpec Processing Pipeline",
    description = "The 7-phase annotation processing pipeline that produces docspec.json with documentation and DSTI intent data. Triggered by mvn docspec:generate.",
    trigger = "mvn docspec:generate",
    steps = {
        @Step(id = "1-discovery", name = "Auto-Discovery", actor = "AutoDiscoveryScanner",
              actorQualified = "io.docspec.processor.scanner.AutoDiscoveryScanner", type = "process",
              description = "Scans all public classes, detects Spring Boot/JPA/Jackson frameworks on classpath",
              outputs = {"discoveredTypes"}),
        @Step(id = "2-read-metadata", name = "Read Metadata", actor = "AnnotationReader",
              actorQualified = "io.docspec.processor.reader.AnnotationReader", type = "process",
              description = "Reads @DocModule, @DocFlow, @DocMethod, JavaDoc comments. Infers descriptions from method names.",
              inputs = {"discoveredTypes"}, outputs = {"memberModels", "moduleModels"}),
        @Step(id = "3-extract-system", name = "Extract System Info", actor = "DocSpecExtractor",
              actorQualified = "io.docspec.processor.extractor.DocSpecExtractor", type = "process",
              description = "Runs 7 extractors: Security, Config, Observability, DataStore, ExternalDeps, Privacy, ErrorsEvents",
              inputs = {"discoveredTypes"}, outputs = {"securityModel", "configModel", "observabilityModel", "dataStoreModel"}),
        @Step(id = "4-dsti", name = "DSTI Intent Extraction", actor = "IntentGraphExtractor",
              actorQualified = "io.docspec.processor.dsti.IntentGraphExtractor", type = "ai", ai = true,
              description = "Runs 13 independent intent channels on every public method. Cross-verifies signals. Computes ISD scores.",
              inputs = {"discoveredTypes"}, outputs = {"intentGraph"}),
        @Step(id = "5-cross-ref", name = "Cross-Reference Resolution", actor = "DocSpecProcessor",
              actorQualified = "io.docspec.processor.DocSpecProcessor", type = "process",
              description = "Resolves @DocUses, builds error.thrownBy, dataModel.usedBy, member.referencedBy mappings",
              inputs = {"memberModels", "moduleModels"}, outputs = {"crossRefs", "referencedBy"}),
        @Step(id = "6-coverage", name = "Coverage Calculation", actor = "CoverageCalculator",
              actorQualified = "io.docspec.processor.metrics.CoverageCalculator", type = "process",
              description = "Computes documentation coverage: % of classes documented, % of methods with descriptions",
              inputs = {"memberModels"}, outputs = {"discoveryModel"}),
        @Step(id = "7-serialize", name = "Serialize Output", actor = "SpecSerializer",
              actorQualified = "io.docspec.processor.output.SpecSerializer", type = "storage",
              description = "Serializes the complete DocSpec model to target/docspec.json via Jackson ObjectMapper",
              inputs = {"docSpecModel"}, outputs = {"docspec.json", "intent-graph.json"})
    }
)
@DocError(code = "DOCSPEC_PROC_001",
    description = "Annotation processing failed due to an unrecoverable error during type analysis or model building.",
    causes = {"A type element could not be resolved during processing", "Extractor threw an uncaught exception", "Processing environment is misconfigured"},
    resolution = "Check compiler diagnostics for the root cause. Ensure all dependencies are on the classpath."
)
@DocEvent(name = "docspec.processing.started",
    description = "Emitted when the DocSpec annotation processor begins its first processing round.",
    trigger = "javac invocation with DocSpecProcessor on the annotation processor path",
    channel = "compiler-diagnostics",
    since = "3.0"
)
@DocUses(artifact = "io.docspec:docspec-annotations-java",
    description = "Reads all 42 DocSpec annotations from source code to build the documentation model")
@DocUses(artifact = "com.fasterxml.jackson.core:jackson-databind",
    description = "Serializes the DocSpec model and intent graph to JSON output files")
@SupportedAnnotationTypes("*")
@SupportedSourceVersion(SourceVersion.RELEASE_17)
@SupportedOptions({
        "docspec.discovery.mode",
        "docspec.discovery.include",
        "docspec.discovery.exclude",
        "docspec.discovery.inferDescriptions",
        "docspec.discovery.frameworks.spring",
        "docspec.discovery.frameworks.jpa",
        "docspec.discovery.frameworks.jackson",
        "docspec.discovery.groupBy",
        "docspec.discovery.includeDeprecated",
        "docspec.discovery.includeProtected",
        "docspec.openapi.path",
        "docspec.output.dir",
        "docspec.artifact.groupId",
        "docspec.artifact.artifactId",
        "docspec.artifact.version",
        "docspec.audience",
        "docspec.project.name",
        "docspec.project.description",
        "docspec.security.enabled",
        "docspec.database.introspect",
        "docspec.database.connectionUrl",
        "docspec.dsti.enabled",
        "docspec.privacy.enabled",
        "docspec.observability.enabled"
})
public class DocSpecProcessor extends AbstractProcessor {

    private ProcessorConfig config;
    private AutoDiscoveryScanner scanner;
    private AnnotationReader annotationReader;
    private JavaDocReader javaDocReader;
    private DescriptionInferrer descriptionInferrer;
    private SpringFrameworkDetector springDetector;
    private JpaEntityExtractor jpaExtractor;
    private JacksonShapeExtractor jacksonExtractor;
    private CoverageCalculator coverageCalculator;
    private SpecSerializer serializer;

    // v3 extractors
    private final List<DocSpecExtractor> extractors = new ArrayList<>();

    private final DocSpecModel model = new DocSpecModel();
    private final Map<String, ModuleModel> moduleMap = new LinkedHashMap<>();
    private final List<String> detectedFrameworks = new ArrayList<>();
    private boolean processed = false;

    @Override
    public synchronized void init(ProcessingEnvironment processingEnv) {
        super.init(processingEnv);
        this.config = ProcessorConfig.from(processingEnv.getOptions());
        this.scanner = new AutoDiscoveryScanner(processingEnv, config);
        this.annotationReader = new AnnotationReader(processingEnv);
        this.javaDocReader = new JavaDocReader(processingEnv);
        this.descriptionInferrer = new DescriptionInferrer();
        this.coverageCalculator = new CoverageCalculator();
        this.serializer = new SpecSerializer();

        // Initialize framework detectors (without compile dependencies)
        this.springDetector = new SpringFrameworkDetector();
        this.jpaExtractor = new JpaEntityExtractor();
        this.jacksonExtractor = new JacksonShapeExtractor();

        // Detect available frameworks
        if (config.isDetectSpring() && springDetector.isAvailable(processingEnv)) {
            detectedFrameworks.add("spring-boot");
        }
        if (config.isDetectJpa() && jpaExtractor.isAvailable(processingEnv)) {
            detectedFrameworks.add("jpa");
        }
        if (config.isDetectJackson() && jacksonExtractor.isAvailable(processingEnv)) {
            detectedFrameworks.add("jackson");
        }

        if (!detectedFrameworks.isEmpty()) {
            note("Detected frameworks: " + detectedFrameworks);
        }

        // Initialize v3 extractors
        initExtractors(processingEnv);
    }

    private void initExtractors(ProcessingEnvironment processingEnv) {
        // Step 6: Data store extraction
        DataStoreExtractor dataStoreExtractor = new DataStoreExtractor();
        if (dataStoreExtractor.isAvailable(processingEnv)) {
            extractors.add(dataStoreExtractor);
        }

        // Step 8: Security extraction
        if (config.isSecurityEnabled()) {
            SecurityExtractor securityExtractor = new SecurityExtractor();
            if (securityExtractor.isAvailable(processingEnv)) {
                extractors.add(securityExtractor);
            }
        }

        // Step 9: Configuration extraction
        ConfigurationExtractor configExtractor = new ConfigurationExtractor();
        if (configExtractor.isAvailable(processingEnv)) {
            extractors.add(configExtractor);
        }

        // Step 10: Observability extraction
        if (config.isObservabilityEnabled()) {
            ObservabilityExtractor observabilityExtractor = new ObservabilityExtractor();
            if (observabilityExtractor.isAvailable(processingEnv)) {
                extractors.add(observabilityExtractor);
            }
        }

        // Step 16: External dependency extraction
        ExternalDependencyExtractor externalDepExtractor = new ExternalDependencyExtractor();
        if (externalDepExtractor.isAvailable(processingEnv)) {
            extractors.add(externalDepExtractor);
        }

        // Step 17: Privacy extraction
        if (config.isPrivacyEnabled()) {
            PrivacyExtractor privacyExtractor = new PrivacyExtractor();
            if (privacyExtractor.isAvailable(processingEnv)) {
                extractors.add(privacyExtractor);
            }
        }

        // Step 15: DSTI / Intent graph (opt-in)
        if (config.isDstiEnabled()) {
            IntentGraphExtractor dstiExtractor = new IntentGraphExtractor(true);
            if (dstiExtractor.isAvailable(processingEnv)) {
                extractors.add(dstiExtractor);
            }
        }

        if (!extractors.isEmpty()) {
            note("Active v3 extractors: " + extractors.stream()
                    .map(DocSpecExtractor::extractorName).toList());
        }
    }

    @Override
    @DocBoundary("annotation processor entry point")
    @DocPerformance(expectedLatency = "< 5s for projects with < 500 types",
                    bottleneck = "DSTI intent extraction across all methods when Trees API is available")
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        if (roundEnv.processingOver()) {
            if (processed) {
                // Final round: compute coverage and serialize
                finalizeSpec();
            }
            return false;
        }

        if (processed) return false;
        processed = true;

        // Step 1: Auto-discovery scan
        List<TypeElement> discoveredTypes = scanner.scan(roundEnv.getRootElements());
        note("Discovered " + discoveredTypes.size() + " types");

        for (TypeElement typeElement : discoveredTypes) {
            processType(typeElement);
        }

        return false; // Don't claim annotations
    }

    private void processType(TypeElement typeElement) {
        // Check @DocHidden
        if (annotationReader.isHidden(typeElement)) {
            return;
        }

        // Step 2-3: Framework detection
        FrameworkDetector.FrameworkInfo frameworkInfo = detectFramework(typeElement);
        if (frameworkInfo.exclude()) {
            return; // @Configuration etc. excluded by default
        }

        // Step 4: JPA entity extraction
        if (jpaExtractor.isAvailable(processingEnv) && jpaExtractor.isEntity(typeElement)) {
            DataModelInfo dataModel = jpaExtractor.extractDataModel(typeElement, processingEnv);

            // Step 5: Jackson shape extraction
            if (jacksonExtractor.isAvailable(processingEnv)) {
                JsonShapeModel shape = jacksonExtractor.extractJsonShape(typeElement, processingEnv);
                if (shape != null) {
                    dataModel.setJsonShape(shape);
                }
            }

            // JavaDoc description for entity
            String desc = javaDocReader.getDescription(typeElement);
            if (desc != null) {
                dataModel.setDescription(desc);
            } else if (config.isInferDescriptions()) {
                dataModel.setDescription(descriptionInferrer.inferClassDescription(
                        typeElement.getSimpleName().toString()));
                coverageCalculator.incrementInferredDescriptions();
            }

            model.getDataModels().add(dataModel);
        }

        // v3: Run all extractors on each type
        for (DocSpecExtractor extractor : extractors) {
            try {
                extractor.extract(typeElement, processingEnv, model);
            } catch (Exception e) {
                note("Warning: " + extractor.extractorName() + " failed on "
                        + typeElement.getQualifiedName() + ": " + e.getMessage());
            }
        }

        // Step 7: Read @DocModule
        ModuleModel module;
        if (annotationReader.hasDocModule(typeElement)) {
            module = annotationReader.readDocModule(typeElement);
            moduleMap.putIfAbsent(module.getId(), module);
            module = moduleMap.get(module.getId());
        } else {
            // Auto-group by framework stereotype or package
            String moduleGroup = determineModuleGroup(typeElement, frameworkInfo);
            moduleMap.putIfAbsent(moduleGroup, createAutoModule(moduleGroup, frameworkInfo));
            module = moduleMap.get(moduleGroup);
        }

        // Build member model
        MemberModel member = scanner.toMemberModel(typeElement);

        // Update discoveredFrom based on framework or annotation
        if (annotationReader.hasDocModule(typeElement)) {
            member.setDiscoveredFrom("annotation");
        } else if (frameworkInfo.isDetected()) {
            member.setDiscoveredFrom("framework");
        } else {
            member.setDiscoveredFrom("auto");
        }

        // Step 7: Read @DocTags
        List<String> tags = annotationReader.readDocTags(typeElement);
        if (tags != null) member.setTags(tags);

        // Step 7: Read @DocAudience
        String audience = annotationReader.getAudience(typeElement);
        if (audience != null) member.setAudience(audience);

        // Step 8: JavaDoc reader
        String classDoc = javaDocReader.getDescription(typeElement);
        if (classDoc != null) {
            member.setDescription(classDoc);
        }

        // Step 9: Description inference
        if (member.getDescription() == null && config.isInferDescriptions()) {
            member.setDescription(descriptionInferrer.inferClassDescription(
                    typeElement.getSimpleName().toString()));
            coverageCalculator.incrementInferredDescriptions();
        }

        // Process methods
        for (MethodModel methodModel : member.getMethods()) {
            processMethod(typeElement, methodModel);
        }

        // Process fields for @DocField and v3 privacy annotations
        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (enclosed instanceof VariableElement field && enclosed.getKind() == ElementKind.FIELD) {
                FieldModel fieldModel = findFieldModel(member, field.getSimpleName().toString());
                if (fieldModel != null) {
                    annotationReader.applyDocField(field, fieldModel);
                    // Field description inference
                    if (fieldModel.getDescription() == null && config.isInferDescriptions()) {
                        fieldModel.setDescription(
                                descriptionInferrer.inferFieldDescription(field.getSimpleName().toString()));
                        coverageCalculator.incrementInferredDescriptions();
                    }
                }
            }
        }

        // Read examples from annotations
        List<ExampleModel> examples = annotationReader.readDocExamples(typeElement);
        if (!examples.isEmpty()) {
            member.setExamples(examples);
        }

        // Step 11: Inline JavaDoc examples
        String inlineExample = javaDocReader.getInlineExample(typeElement);
        if (inlineExample != null) {
            ExampleModel example = new ExampleModel();
            example.setLanguage("java");
            example.setCode(inlineExample);
            member.getExamples().add(example);
        }

        // Step 12: @DocError
        ErrorModel error = annotationReader.readDocError(typeElement);
        if (error != null) {
            model.getErrors().add(error);
        }

        // Step 13: @DocEvent
        EventModel event = annotationReader.readDocEvent(typeElement);
        if (event != null) {
            model.getEvents().add(event);
        }

        // Step 14: @DocFlow
        FlowModel flow = annotationReader.readDocFlow(typeElement);
        if (flow != null) {
            model.getFlows().add(flow);
        }

        // Step 15: @DocContext
        ContextModel context = annotationReader.readDocContext(typeElement);
        if (context != null) {
            model.getContexts().add(context);
        }

        // Step 6: @Scheduled → auto-create context entries for scheduled jobs
        if (detectedFrameworks.contains("spring-boot")) {
            for (Element enclosed : typeElement.getEnclosedElements()) {
                if (enclosed instanceof ExecutableElement method) {
                    if (springDetector.isScheduledMethod(method)) {
                        String scheduleInfo = springDetector.getScheduleInfo(method);
                        ContextModel scheduledContext = new ContextModel();
                        scheduledContext.setId(typeElement.getSimpleName().toString().toLowerCase()
                                + "-" + method.getSimpleName().toString().toLowerCase());
                        scheduledContext.setName(member.getName() + "." + method.getSimpleName());
                        scheduledContext.setAttachedTo(typeElement.getQualifiedName().toString());
                        scheduledContext.setFlow(scheduleInfo);
                        model.getContexts().add(scheduledContext);
                    }
                }
            }
        }

        // Step 16: @DocUses cross-references
        List<CrossRefModel> crossRefs = annotationReader.readDocUses(typeElement);
        model.getCrossRefs().addAll(crossRefs);

        // Also check methods for @DocUses
        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (enclosed instanceof ExecutableElement method) {
                List<CrossRefModel> methodRefs = annotationReader.readDocUses(method);
                model.getCrossRefs().addAll(methodRefs);
            }
        }

        // v3: @DocOrdering
        OrderingModel ordering = annotationReader.readDocOrdering(typeElement);
        if (ordering != null) member.setOrdering(ordering);

        // v3: @DocMonotonic
        MonotonicModel monotonic = annotationReader.readDocMonotonic(typeElement);
        if (monotonic != null) member.setMonotonic(monotonic);

        // v3: @DocConservation
        ConservationModel conservation = annotationReader.readDocConservation(typeElement);
        if (conservation != null) member.setConservation(conservation);

        // v3: @DocCompare
        List<CompareModel> comparisons = new ArrayList<>();
        CompareModel compare = annotationReader.readDocCompare(typeElement);
        if (compare != null) comparisons.add(compare);
        if (!comparisons.isEmpty()) member.setComparisons(comparisons);

        // v3: @DocRelation
        List<RelationModel> relations = new ArrayList<>();
        RelationModel relation = annotationReader.readDocRelation(typeElement);
        if (relation != null) relations.add(relation);
        if (!relations.isEmpty()) member.setRelations(relations);

        module.getMembers().add(member);
    }

    private void processMethod(TypeElement ownerType, MethodModel methodModel) {
        // Find the ExecutableElement for this method
        ExecutableElement methodElement = findMethodElement(ownerType, methodModel.getName());
        if (methodElement == null) return;

        // Step 7: Read @DocMethod
        annotationReader.applyDocMethod(methodElement, methodModel);

        // Spring method annotations (@Transactional, @Cacheable)
        if (detectedFrameworks.contains("spring-boot")) {
            springDetector.applyMethodAnnotations(methodElement, methodModel);
        }

        // Step 7: Read @DocOptional on parameters
        List<? extends VariableElement> params = methodElement.getParameters();
        for (int i = 0; i < params.size() && i < methodModel.getParams().size(); i++) {
            if (annotationReader.isOptional(params.get(i))) {
                methodModel.getParams().get(i).setRequired(false);
            }
        }

        // Step 7: @DocEndpoint (takes precedence over auto-detected Spring mappings)
        EndpointMappingModel endpoint = annotationReader.readDocEndpoint(methodElement);
        if (endpoint != null) {
            methodModel.setEndpointMapping(endpoint);
        } else if (detectedFrameworks.contains("spring-boot") && methodModel.getEndpointMapping() == null) {
            // Auto-detect from Spring @GetMapping/@PostMapping/etc.
            String basePath = springDetector.getClassBasePath(ownerType);
            EndpointMappingModel springEndpoint = springDetector.extractEndpointMapping(methodElement, basePath);
            if (springEndpoint != null) {
                methodModel.setEndpointMapping(springEndpoint);
            }
        }

        // v3: @DocPerformance
        MethodPerformanceModel perf = annotationReader.readDocPerformance(methodElement);
        if (perf != null) {
            methodModel.setPerformance(perf);
        }

        // v3: @DocAsyncAPI
        String asyncApi = annotationReader.readDocAsyncAPI(methodElement);
        if (asyncApi != null) {
            methodModel.getTags().add("asyncapi:" + asyncApi);
        }

        // Step 8: JavaDoc for method
        String methodDoc = javaDocReader.getDescription(methodElement);
        if (methodDoc != null) {
            methodModel.setDescription(methodDoc);
        }

        // JavaDoc @param descriptions
        Map<String, String> paramDescs = javaDocReader.getParamDescriptions(methodElement);
        for (MethodParamModel param : methodModel.getParams()) {
            String paramDesc = paramDescs.get(param.getName());
            if (paramDesc != null) {
                param.setDescription(paramDesc);
            }
        }

        // JavaDoc @return
        String returnDesc = javaDocReader.getReturnDescription(methodElement);
        if (returnDesc != null && methodModel.getReturns() != null) {
            methodModel.getReturns().setDescription(returnDesc);
        }

        // JavaDoc @throws
        Map<String, String> throwsDescs = javaDocReader.getThrowsDescriptions(methodElement);
        for (MethodModel.ThrowsModel throwsModel : methodModel.getThrowsList()) {
            String throwsDesc = throwsDescs.get(throwsModel.getType());
            if (throwsDesc != null) {
                throwsModel.setDescription(throwsDesc);
            }
        }

        // Step 9: Description inference
        if (methodModel.getDescription() == null && config.isInferDescriptions()) {
            List<String> paramNames = methodModel.getParams().stream()
                    .map(MethodParamModel::getName).toList();
            List<String> paramTypes = methodModel.getParams().stream()
                    .map(MethodParamModel::getType).toList();
            methodModel.setDescription(
                    descriptionInferrer.inferMethodDescription(methodModel.getName(), paramNames, paramTypes));
            coverageCalculator.incrementInferredDescriptions();
        }

        // Method-level examples
        List<ExampleModel> methodExamples = annotationReader.readDocExamples(methodElement);
        if (!methodExamples.isEmpty()) {
            methodModel.setExamples(methodExamples);
        }

        // Inline JavaDoc example
        String inlineExample = javaDocReader.getInlineExample(methodElement);
        if (inlineExample != null) {
            ExampleModel example = new ExampleModel();
            example.setLanguage("java");
            example.setCode(inlineExample);
            methodModel.getExamples().add(example);
        }
    }

    @DocMethod(since = "3.0.0")
    private void finalizeSpec() {
        // Set artifact info
        ArtifactModel artifact = new ArtifactModel();
        artifact.setGroupId(config.getArtifactGroupId());
        artifact.setArtifactId(config.getArtifactId());
        artifact.setVersion(config.getArtifactVersion());
        artifact.setLanguage("java");
        artifact.setBuildTool("maven");
        artifact.setFrameworks(detectedFrameworks.isEmpty() ? null : new ArrayList<>(detectedFrameworks));
        model.setArtifact(artifact);

        // Set project info (Step 3: populate project object)
        ProjectModel project = new ProjectModel();
        if (config.getProjectName() != null && !config.getProjectName().isEmpty()) {
            project.setName(config.getProjectName());
        } else if (!config.getArtifactId().isEmpty()) {
            project.setName(formatModuleName(config.getArtifactId()));
        }
        if (config.getProjectDescription() != null && !config.getProjectDescription().isEmpty()) {
            project.setDescription(config.getProjectDescription());
        }
        model.setProject(project);

        // Collect modules
        model.setModules(new ArrayList<>(moduleMap.values()));

        // v3 Step 21: Assign kindCategory on Members
        assignKindCategories();

        // Build cross-references (Step 2)
        buildCrossReferences();

        // Step 17: Coverage calculation
        coverageCalculator.analyze(model);
        model.setDiscovery(coverageCalculator.toDiscoveryModel(
                config.getDiscoveryMode().name().toLowerCase().replace("_", "-"),
                detectedFrameworks.isEmpty() ? null : detectedFrameworks,
                config.getIncludePackages().isEmpty() ? null : config.getIncludePackages(),
                config.getExcludePackages().isEmpty() ? null : config.getExcludePackages()
        ));

        // Step 10: OpenAPI merge
        mergeOpenApiIfPresent();

        // Step 18: Serialize
        serializer.serialize(model, config.getOutputDir(), processingEnv);

        // v3: Serialize intent graph if DSTI enabled
        if (config.isDstiEnabled() && model.getIntentGraph() != null
                && model.getIntentGraph().getMethods() != null
                && !model.getIntentGraph().getMethods().isEmpty()) {
            serializer.serializeIntentGraph(model, config.getOutputDir(), processingEnv);
        }

        note("DocSpec v3 generation complete. Coverage: " + coverageCalculator.getCoveragePercent() + "%");
    }

    /**
     * v3 Step 21: Assign kindCategory to Members based on naming, annotations, and framework info.
     */
    private void assignKindCategories() {
        for (ModuleModel module : model.getModules()) {
            for (MemberModel member : module.getMembers()) {
                if (member.getKindCategory() != null) continue;

                String name = member.getName();
                String qualified = member.getQualified() != null ? member.getQualified() : "";

                // Infer from naming conventions and interfaces
                if (name.endsWith("Controller") || name.endsWith("Resource") || name.endsWith("Endpoint")) {
                    member.setKindCategory("controller");
                } else if (name.endsWith("Service") || name.endsWith("ServiceImpl") || name.endsWith("UseCase")) {
                    member.setKindCategory("service");
                } else if (name.endsWith("Repository") || name.endsWith("Dao") || name.endsWith("Store")) {
                    member.setKindCategory("repository");
                } else if (name.endsWith("Entity") || (member.getImplementsList() != null &&
                        member.getImplementsList().stream().anyMatch(i -> i.contains("Serializable")))) {
                    // Also check if it's a known data model
                    boolean isEntity = model.getDataModels() != null && model.getDataModels().stream()
                            .anyMatch(dm -> qualified.equals(dm.getQualified()));
                    if (isEntity) member.setKindCategory("entity");
                } else if (name.endsWith("Dto") || name.endsWith("DTO") || name.endsWith("Request")
                        || name.endsWith("Response") || name.endsWith("Payload")) {
                    member.setKindCategory("dto");
                } else if (name.endsWith("Config") || name.endsWith("Configuration") || name.endsWith("Properties")) {
                    member.setKindCategory("config");
                } else if (name.endsWith("Event") || name.endsWith("Message")) {
                    member.setKindCategory("event");
                } else if (name.endsWith("Exception") || name.endsWith("Error")) {
                    member.setKindCategory("exception");
                } else if (name.endsWith("Utils") || name.endsWith("Util") || name.endsWith("Helper")
                        || name.endsWith("Utilities")) {
                    member.setKindCategory("utility");
                }
                // else: leave null (omitted in JSON via NON_EMPTY)
            }
        }
    }

    /**
     * Post-processing pass that builds reverse cross-references:
     * - Error.thrownBy / Error.endpoints
     * - DataModel.usedBy (repositories, endpoints)
     * - Member.referencedBy (flows, contexts, endpoints)
     * - Module.framework
     */
    private void buildCrossReferences() {
        // Build lookup maps for efficient cross-referencing
        Map<String, MemberModel> memberByQualified = new LinkedHashMap<>();
        Map<String, ModuleModel> moduleByMemberId = new LinkedHashMap<>();

        for (ModuleModel module : model.getModules()) {
            // Set module framework from detected frameworks
            if (module.getFramework() == null && module.getDiscoveredFrom() != null
                    && "framework".equals(module.getDiscoveredFrom()) && !detectedFrameworks.isEmpty()) {
                module.setFramework(detectedFrameworks.get(0));
            }

            for (MemberModel member : module.getMembers()) {
                if (member.getQualified() != null) {
                    memberByQualified.put(member.getQualified(), member);
                    moduleByMemberId.put(member.getQualified(), module);
                }
            }
        }

        // --- Error.thrownBy and Error.endpoints ---
        if (model.getErrors() != null) {
            for (ErrorModel error : model.getErrors()) {
                List<String> thrownBy = new ArrayList<>();
                List<String> endpoints = new ArrayList<>();

                for (ModuleModel module : model.getModules()) {
                    for (MemberModel member : module.getMembers()) {
                        for (MethodModel method : member.getMethods()) {
                            boolean throwsError = method.getThrowsList().stream()
                                    .anyMatch(t -> t.getType() != null && (
                                            t.getType().equals(error.getException())
                                                    || (error.getException() != null
                                                    && error.getException().endsWith("." + t.getType()))));
                            if (throwsError) {
                                thrownBy.add(member.getName() + "." + method.getName());
                                if (method.getEndpointMapping() != null) {
                                    String ep = (method.getEndpointMapping().getMethod() != null
                                            ? method.getEndpointMapping().getMethod() + " " : "")
                                            + method.getEndpointMapping().getPath();
                                    endpoints.add(ep);
                                }
                            }
                        }
                    }
                }

                if (!thrownBy.isEmpty()) error.setThrownBy(thrownBy);
                if (!endpoints.isEmpty()) error.setEndpoints(endpoints);
            }
        }

        // --- DataModel.usedBy ---
        if (model.getDataModels() != null) {
            for (DataModelInfo dataModel : model.getDataModels()) {
                String entityName = dataModel.getName();
                String entityQualified = dataModel.getQualified();
                List<String> usedByEndpoints = new ArrayList<>();
                List<String> usedByRepositories = new ArrayList<>();

                for (ModuleModel module : model.getModules()) {
                    for (MemberModel member : module.getMembers()) {
                        // Check if this is a repository for this entity
                        if (member.getImplementsList() != null) {
                            for (String iface : member.getImplementsList()) {
                                if (iface.contains("Repository") || iface.contains("Dao")) {
                                    // Check if qualified name or type params reference the entity
                                    if (member.getTypeParams() != null &&
                                            member.getTypeParams().stream().anyMatch(tp ->
                                                    tp.equals(entityName) || tp.equals(entityQualified))) {
                                        usedByRepositories.add(member.getQualified());
                                    } else if (member.getName().contains(entityName)) {
                                        usedByRepositories.add(member.getQualified());
                                    }
                                }
                            }
                        }

                        // Check methods for endpoint usage of this entity
                        for (MethodModel method : member.getMethods()) {
                            if (method.getEndpointMapping() != null) {
                                boolean usesEntity = methodReferencesType(method, entityName);
                                if (usesEntity) {
                                    String ep = (method.getEndpointMapping().getMethod() != null
                                            ? method.getEndpointMapping().getMethod() + " " : "")
                                            + method.getEndpointMapping().getPath();
                                    usedByEndpoints.add(ep);
                                }
                            }
                        }
                    }
                }

                if (!usedByEndpoints.isEmpty() || !usedByRepositories.isEmpty()) {
                    DataModelInfo.DataModelUsedByModel usedBy = new DataModelInfo.DataModelUsedByModel();
                    if (!usedByEndpoints.isEmpty()) usedBy.setEndpoints(usedByEndpoints);
                    if (!usedByRepositories.isEmpty()) usedBy.setRepositories(usedByRepositories);
                    dataModel.setUsedBy(usedBy);
                }
            }
        }

        // --- Member.referencedBy ---
        for (ModuleModel module : model.getModules()) {
            for (MemberModel member : module.getMembers()) {
                List<String> refByFlows = new ArrayList<>();
                List<String> refByContexts = new ArrayList<>();
                List<String> refByEndpoints = new ArrayList<>();

                // Check flows for references to this member
                if (model.getFlows() != null) {
                    for (FlowModel flow : model.getFlows()) {
                        for (FlowStepModel step : flow.getSteps()) {
                            if ((step.getActorQualified() != null && step.getActorQualified().equals(member.getQualified()))
                                    || (step.getActor() != null && step.getActor().equals(member.getName()))) {
                                refByFlows.add(flow.getId() + "." + step.getId());
                            }
                        }
                    }
                }

                // Check contexts for references to this member
                if (model.getContexts() != null) {
                    for (ContextModel ctx : model.getContexts()) {
                        if (member.getQualified() != null && member.getQualified().equals(ctx.getAttachedTo())) {
                            refByContexts.add(ctx.getId());
                        }
                    }
                }

                // Collect endpoint references from this member's own methods
                for (MethodModel method : member.getMethods()) {
                    if (method.getEndpointMapping() != null) {
                        String ep = (method.getEndpointMapping().getMethod() != null
                                ? method.getEndpointMapping().getMethod() + " " : "")
                                + method.getEndpointMapping().getPath();
                        refByEndpoints.add(ep);
                    }
                }

                if (!refByFlows.isEmpty() || !refByContexts.isEmpty() || !refByEndpoints.isEmpty()) {
                    ReferencedByModel refBy = new ReferencedByModel();
                    if (!refByFlows.isEmpty()) refBy.setFlows(refByFlows);
                    if (!refByContexts.isEmpty()) refBy.setContexts(refByContexts);
                    if (!refByEndpoints.isEmpty()) refBy.setEndpoints(refByEndpoints);
                    member.setReferencedBy(refBy);
                }
            }
        }
    }

    private boolean methodReferencesType(MethodModel method, String typeName) {
        // Check if any param or return type references the given type
        for (MethodParamModel param : method.getParams()) {
            if (param.getType() != null && param.getType().contains(typeName)) {
                return true;
            }
        }
        if (method.getReturns() != null && method.getReturns().getType() != null
                && method.getReturns().getType().contains(typeName)) {
            return true;
        }
        return false;
    }

    /**
     * Step 10: OpenAPI merge. Scans for openapi.json in the output directory
     * and merges endpoint descriptions into discovered controller methods.
     */
    private void mergeOpenApiIfPresent() {
        // Determine OpenAPI file path
        java.io.File openApiFile = null;

        if (config.getOpenApiPath() != null && !config.getOpenApiPath().isEmpty()) {
            openApiFile = new java.io.File(config.getOpenApiPath());
        } else if (!config.getOutputDir().isEmpty()) {
            // Auto-detect in target directory
            java.io.File dir = new java.io.File(config.getOutputDir());
            java.io.File jsonFile = new java.io.File(dir, "openapi.json");
            java.io.File yamlFile = new java.io.File(dir, "openapi.yaml");
            if (jsonFile.exists()) openApiFile = jsonFile;
            else if (yamlFile.exists()) openApiFile = yamlFile;
        }

        if (openApiFile == null || !openApiFile.exists()) {
            return; // No OpenAPI spec found — this is normal
        }

        // Only parse JSON for now (YAML would need a YAML parser)
        if (!openApiFile.getName().endsWith(".json")) {
            note("OpenAPI YAML detected at " + openApiFile.getAbsolutePath()
                    + " — only JSON format is currently supported for auto-merge");
            return;
        }

        note("Merging OpenAPI spec from: " + openApiFile.getAbsolutePath());

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(openApiFile);
            com.fasterxml.jackson.databind.JsonNode paths = root.get("paths");
            if (paths == null || !paths.isObject()) return;

            // Build a map of "METHOD path" → description from OpenAPI
            Map<String, String> endpointDescriptions = new LinkedHashMap<>();
            var pathIterator = paths.fields();
            while (pathIterator.hasNext()) {
                var pathEntry = pathIterator.next();
                String pathKey = pathEntry.getKey();
                com.fasterxml.jackson.databind.JsonNode methods = pathEntry.getValue();
                var methodIterator = methods.fields();
                while (methodIterator.hasNext()) {
                    var methodEntry = methodIterator.next();
                    String httpMethod = methodEntry.getKey().toUpperCase();
                    if (httpMethod.equals("PARAMETERS") || httpMethod.equals("SUMMARY")
                            || httpMethod.equals("DESCRIPTION")) continue;
                    com.fasterxml.jackson.databind.JsonNode operation = methodEntry.getValue();
                    String summary = operation.has("summary")
                            ? operation.get("summary").asText() : null;
                    String description = operation.has("description")
                            ? operation.get("description").asText() : null;
                    String desc = summary != null ? summary : description;
                    if (desc != null) {
                        endpointDescriptions.put(httpMethod + " " + pathKey, desc);
                    }
                }
            }

            if (endpointDescriptions.isEmpty()) return;

            // Merge: for each discovered method with an endpoint mapping,
            // apply OpenAPI description if the method has no description yet
            int merged = 0;
            for (ModuleModel module : model.getModules()) {
                for (MemberModel member : module.getMembers()) {
                    for (MethodModel method : member.getMethods()) {
                        if (method.getEndpointMapping() != null) {
                            String key = method.getEndpointMapping().getMethod() + " "
                                    + method.getEndpointMapping().getPath();
                            String openApiDesc = endpointDescriptions.get(key);
                            if (openApiDesc != null) {
                                // OpenAPI description takes precedence over inferred descriptions
                                if (method.getDescription() == null
                                        || method.getDescription().startsWith("Handles ")
                                        || method.getDescription().startsWith("Creates ")
                                        || method.getDescription().startsWith("Returns ")
                                        || method.getDescription().startsWith("Finds ")) {
                                    method.setDescription(openApiDesc);
                                    merged++;
                                }
                            }
                        }
                    }
                }
            }
            if (merged > 0) {
                note("Merged " + merged + " endpoint description(s) from OpenAPI spec");
            }
        } catch (Exception e) {
            note("Warning: Failed to parse OpenAPI spec: " + e.getMessage());
        }
    }

    private FrameworkDetector.FrameworkInfo detectFramework(TypeElement typeElement) {
        if (detectedFrameworks.contains("spring-boot")) {
            FrameworkDetector.FrameworkInfo info = springDetector.detect(typeElement, processingEnv);
            if (info.isDetected() || info.exclude()) return info;
        }
        if (detectedFrameworks.contains("jpa")) {
            FrameworkDetector.FrameworkInfo info = jpaExtractor.detect(typeElement, processingEnv);
            if (info.isDetected()) return info;
        }
        return FrameworkDetector.FrameworkInfo.NONE;
    }

    private String determineModuleGroup(TypeElement typeElement, FrameworkDetector.FrameworkInfo frameworkInfo) {
        if (frameworkInfo.moduleGroup() != null) {
            return frameworkInfo.moduleGroup().toLowerCase().replace(" ", "-");
        }
        // Group by top-level package
        String qualified = typeElement.getQualifiedName().toString();
        int lastDot = qualified.lastIndexOf('.');
        if (lastDot > 0) {
            String pkg = qualified.substring(0, lastDot);
            int secondLastDot = pkg.lastIndexOf('.');
            if (secondLastDot > 0) {
                return pkg.substring(secondLastDot + 1);
            }
            return pkg;
        }
        return "default";
    }

    private ModuleModel createAutoModule(String id, FrameworkDetector.FrameworkInfo frameworkInfo) {
        ModuleModel module = new ModuleModel();
        module.setId(id);
        module.setName(formatModuleName(id));
        module.setDiscoveredFrom(frameworkInfo.isDetected() ? "framework" : "auto");
        if (frameworkInfo.stereotype() != null) {
            module.setStereotype(frameworkInfo.stereotype());
        }
        return module;
    }

    private String formatModuleName(String id) {
        // kebab-case or lowercase to Title Case
        String[] parts = id.split("[-_]");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (!sb.isEmpty()) sb.append(" ");
            sb.append(Character.toUpperCase(part.charAt(0)));
            if (part.length() > 1) sb.append(part.substring(1));
        }
        return sb.toString();
    }

    private ExecutableElement findMethodElement(TypeElement typeElement, String methodName) {
        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (enclosed instanceof ExecutableElement method
                    && method.getKind() == ElementKind.METHOD
                    && method.getSimpleName().contentEquals(methodName)) {
                return method;
            }
        }
        return null;
    }

    private FieldModel findFieldModel(MemberModel member, String fieldName) {
        for (FieldModel field : member.getFields()) {
            if (field.getName().equals(fieldName)) return field;
        }
        return null;
    }

    private void note(String message) {
        processingEnv.getMessager().printMessage(Diagnostic.Kind.NOTE, "DocSpec: " + message);
    }
}
