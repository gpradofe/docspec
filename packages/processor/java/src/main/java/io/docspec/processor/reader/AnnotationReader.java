package io.docspec.processor.reader;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.*;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import javax.lang.model.type.TypeMirror;
import java.util.*;

@DocBoundary("documentation metadata reader")
public class AnnotationReader {

    private static final String PKG = "io.docspec.annotation.";
    private static final String DOC_MODULE = PKG + "DocModule";
    private static final String DOC_METHOD = PKG + "DocMethod";
    private static final String DOC_FIELD = PKG + "DocField";
    private static final String DOC_TAGS = PKG + "DocTags";
    private static final String DOC_OPTIONAL = PKG + "DocOptional";
    private static final String DOC_HIDDEN = PKG + "DocHidden";
    private static final String DOC_AUDIENCE = PKG + "DocAudience";
    private static final String DOC_FLOW = PKG + "DocFlow";
    private static final String DOC_USES = PKG + "DocUses";
    private static final String DOC_USES_ALL = PKG + "DocUsesAll";
    private static final String DOC_CONTEXT = PKG + "DocContext";
    private static final String DOC_ERROR = PKG + "DocError";
    private static final String DOC_EVENT = PKG + "DocEvent";
    private static final String DOC_ENDPOINT = PKG + "DocEndpoint";
    private static final String DOC_EXAMPLE = PKG + "DocExample";
    private static final String DOC_EXAMPLES = PKG + "DocExamples";
    private static final String DOC_SPEC_EXAMPLE = PKG + "DocSpecExample";

    // v3 annotation constants
    private static final String DOC_PII = PKG + "DocPII";
    private static final String DOC_SENSITIVE = PKG + "DocSensitive";
    private static final String DOC_INTENTIONAL = PKG + "DocIntentional";
    private static final String DOC_PRESERVES = PKG + "DocPreserves";
    private static final String DOC_ORDERING = PKG + "DocOrdering";
    private static final String DOC_INVARIANT = PKG + "DocInvariant";
    private static final String DOC_MONOTONIC = PKG + "DocMonotonic";
    private static final String DOC_CONSERVATION = PKG + "DocConservation";
    private static final String DOC_IDEMPOTENT = PKG + "DocIdempotent";
    private static final String DOC_DETERMINISTIC = PKG + "DocDeterministic";
    private static final String DOC_STATE_MACHINE = PKG + "DocStateMachine";
    private static final String DOC_BOUNDARY = PKG + "DocBoundary";
    private static final String DOC_COMPARE = PKG + "DocCompare";
    private static final String DOC_RELATION = PKG + "DocRelation";
    private static final String DOC_TEST_STRATEGY = PKG + "DocTestStrategy";
    private static final String DOC_TEST_SKIP = PKG + "DocTestSkip";
    private static final String DOC_PERFORMANCE = PKG + "DocPerformance";
    private static final String DOC_WEBSOCKET = PKG + "DocWebSocket";
    private static final String DOC_COMMAND = PKG + "DocCommand";
    private static final String DOC_ASYNC_API = PKG + "DocAsyncAPI";
    private static final String DOC_GRAPHQL = PKG + "DocGraphQL";
    private static final String DOC_GRPC = PKG + "DocGRPC";

    private final ProcessingEnvironment processingEnv;

    public AnnotationReader(ProcessingEnvironment processingEnv) {
        this.processingEnv = processingEnv;
    }

    public boolean isHidden(Element element) {
        return hasAnnotation(element, DOC_HIDDEN);
    }

    public String getAudience(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_AUDIENCE);
        if (mirror == null) return null;
        return getStringValue(mirror, "value");
    }

    // --- @DocModule ---

    public boolean hasDocModule(TypeElement element) {
        return hasAnnotation(element, DOC_MODULE);
    }

    @DocMethod(since = "3.0.0")
    public ModuleModel readDocModule(TypeElement element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_MODULE);
        if (mirror == null) return null;

        ModuleModel module = new ModuleModel();
        module.setId(getStringValue(mirror, "id"));
        module.setName(getStringValue(mirror, "name"));
        module.setDescription(getStringValue(mirror, "description"));
        module.setSince(getStringValue(mirror, "since"));
        module.setAudience(getStringValue(mirror, "audience"));
        module.setDiscoveredFrom("annotation");
        return module;
    }

    // --- @DocMethod ---

    @DocMethod(since = "3.0.0")
    public void applyDocMethod(ExecutableElement method, MethodModel model) {
        AnnotationMirror mirror = findAnnotation(method, DOC_METHOD);
        if (mirror == null) return;

        String since = getStringValue(mirror, "since");
        String deprecated = getStringValue(mirror, "deprecated");
        if (since != null && !since.isEmpty()) model.setSince(since);
        if (deprecated != null && !deprecated.isEmpty()) model.setDeprecated(deprecated);
    }

    // --- @DocField ---

    @DocMethod(since = "3.0.0")
    public void applyDocField(VariableElement field, FieldModel model) {
        AnnotationMirror mirror = findAnnotation(field, DOC_FIELD);
        if (mirror == null) return;

        String description = getStringValue(mirror, "description");
        String since = getStringValue(mirror, "since");
        if (description != null && !description.isEmpty()) model.setDescription(description);
        if (since != null && !since.isEmpty()) model.setSince(since);
    }

    // --- @DocTags ---

    public List<String> readDocTags(TypeElement element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_TAGS);
        if (mirror == null) return null;
        return getStringArrayValue(mirror, "value");
    }

    // --- @DocOptional ---

    public boolean isOptional(VariableElement param) {
        return hasAnnotation(param, DOC_OPTIONAL);
    }

    // --- @DocFlow ---

    @DocMethod(since = "3.0.0")
    public FlowModel readDocFlow(TypeElement element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_FLOW);
        if (mirror == null) return null;

        FlowModel flow = new FlowModel();
        flow.setId(getStringValue(mirror, "id"));
        flow.setName(getStringValue(mirror, "name"));
        flow.setDescription(getStringValue(mirror, "description"));
        flow.setTrigger(getStringValue(mirror, "trigger"));

        // Read steps
        List<? extends AnnotationValue> stepsValue = getAnnotationArrayValue(mirror, "steps");
        if (stepsValue != null) {
            for (AnnotationValue stepValue : stepsValue) {
                AnnotationMirror stepMirror = (AnnotationMirror) stepValue.getValue();
                FlowStepModel step = new FlowStepModel();
                step.setId(getStringValue(stepMirror, "id"));
                step.setName(getStringValue(stepMirror, "name"));
                step.setActor(getStringValue(stepMirror, "actor"));
                step.setActorQualified(getStringValue(stepMirror, "actorQualified"));
                step.setDescription(getStringValue(stepMirror, "description"));
                step.setType(getStringValue(stepMirror, "type"));
                Boolean ai = getBooleanValue(stepMirror, "ai");
                if (ai != null) step.setAi(ai);
                step.setRetryTarget(getStringValue(stepMirror, "retryTarget"));
                step.setInputs(getStringArrayValue(stepMirror, "inputs"));
                step.setOutputs(getStringArrayValue(stepMirror, "outputs"));
                flow.getSteps().add(step);
            }
        }
        return flow;
    }

    // --- @DocUses ---

    @DocMethod(since = "3.0.0")
    public List<CrossRefModel> readDocUses(Element element) {
        List<CrossRefModel> refs = new ArrayList<>();
        // Single @DocUses
        AnnotationMirror single = findAnnotation(element, DOC_USES);
        if (single != null) {
            refs.add(readSingleDocUses(single, element));
        }
        // @DocUsesAll container
        AnnotationMirror container = findAnnotation(element, DOC_USES_ALL);
        if (container != null) {
            List<? extends AnnotationValue> values = getAnnotationArrayValue(container, "value");
            if (values != null) {
                for (AnnotationValue v : values) {
                    AnnotationMirror m = (AnnotationMirror) v.getValue();
                    refs.add(readSingleDocUses(m, element));
                }
            }
        }
        return refs;
    }

    private CrossRefModel readSingleDocUses(AnnotationMirror mirror, Element element) {
        CrossRefModel ref = new CrossRefModel();
        if (element instanceof TypeElement te) {
            ref.setSourceQualified(te.getQualifiedName().toString());
        } else if (element instanceof ExecutableElement ee) {
            ref.setSourceQualified(
                    ((TypeElement) ee.getEnclosingElement()).getQualifiedName() + "." + ee.getSimpleName());
        }
        ref.setTargetArtifact(getStringValue(mirror, "artifact"));
        ref.setTargetFlow(getStringValue(mirror, "flow"));
        ref.setTargetStep(getStringValue(mirror, "step"));
        ref.setTargetMember(getStringValue(mirror, "member"));
        ref.setDescription(getStringValue(mirror, "description"));
        return ref;
    }

    // --- @DocContext ---

    @DocMethod(since = "3.0.0")
    public ContextModel readDocContext(TypeElement element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_CONTEXT);
        if (mirror == null) return null;

        ContextModel ctx = new ContextModel();
        ctx.setId(getStringValue(mirror, "id"));
        ctx.setName(getStringValue(mirror, "name"));
        ctx.setAttachedTo(element.getQualifiedName().toString());
        ctx.setFlow(getStringValue(mirror, "flow"));

        // Read inputs
        List<? extends AnnotationValue> inputsValue = getAnnotationArrayValue(mirror, "inputs");
        if (inputsValue != null) {
            for (AnnotationValue iv : inputsValue) {
                AnnotationMirror im = (AnnotationMirror) iv.getValue();
                ContextInputModel input = new ContextInputModel();
                input.setName(getStringValue(im, "name"));
                input.setSource(getStringValue(im, "source"));
                input.setDescription(getStringValue(im, "description"));
                input.setItems(getStringArrayValue(im, "items"));
                ctx.getInputs().add(input);
            }
        }

        // Read uses
        List<? extends AnnotationValue> usesValue = getAnnotationArrayValue(mirror, "uses");
        if (usesValue != null) {
            for (AnnotationValue uv : usesValue) {
                AnnotationMirror um = (AnnotationMirror) uv.getValue();
                ContextUsesModel use = new ContextUsesModel();
                use.setArtifact(getStringValue(um, "artifact"));
                use.setWhat(getStringValue(um, "what"));
                use.setWhy(getStringValue(um, "why"));
                ctx.getUses().add(use);
            }
        }
        return ctx;
    }

    // --- @DocError ---

    @DocMethod(since = "3.0.0")
    public ErrorModel readDocError(TypeElement element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_ERROR);
        if (mirror == null) return null;

        ErrorModel error = new ErrorModel();
        error.setCode(getStringValue(mirror, "code"));
        error.setException(element.getQualifiedName().toString());
        error.setDescription(getStringValue(mirror, "description"));
        error.setCauses(getStringArrayValue(mirror, "causes"));
        error.setResolution(getStringValue(mirror, "resolution"));
        error.setSince(getStringValue(mirror, "since"));
        Integer httpStatus = getIntValue(mirror, "httpStatus");
        if (httpStatus != null && httpStatus != -1) {
            error.setHttpStatus(httpStatus);
        }
        return error;
    }

    // --- @DocEvent ---

    @DocMethod(since = "3.0.0")
    public EventModel readDocEvent(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_EVENT);
        if (mirror == null) return null;

        EventModel event = new EventModel();
        event.setName(getStringValue(mirror, "name"));
        event.setDescription(getStringValue(mirror, "description"));
        event.setTrigger(getStringValue(mirror, "trigger"));
        event.setChannel(getStringValue(mirror, "channel"));
        event.setDeliveryGuarantee(getStringValue(mirror, "deliveryGuarantee"));
        event.setRetryPolicy(getStringValue(mirror, "retryPolicy"));
        event.setSince(getStringValue(mirror, "since"));

        // Extract payload fields from the type's fields
        if (element instanceof TypeElement typeElement) {
            EventPayloadModel payload = new EventPayloadModel();
            payload.setType(typeElement.getSimpleName().toString());
            for (Element enclosed : typeElement.getEnclosedElements()) {
                if (enclosed instanceof VariableElement field && enclosed.getKind() == ElementKind.FIELD) {
                    if (!field.getModifiers().contains(Modifier.STATIC)) {
                        EventPayloadFieldModel payloadField = new EventPayloadFieldModel();
                        payloadField.setName(field.getSimpleName().toString());
                        payloadField.setType(simplifyType(field.asType().toString()));
                        payload.getFields().add(payloadField);
                    }
                }
            }
            if (!payload.getFields().isEmpty()) {
                event.setPayload(payload);
            }
        }
        return event;
    }

    // --- @DocEndpoint ---

    @DocMethod(since = "3.0.0")
    public EndpointMappingModel readDocEndpoint(ExecutableElement method) {
        AnnotationMirror mirror = findAnnotation(method, DOC_ENDPOINT);
        if (mirror == null) return null;

        String value = getStringValue(mirror, "value");
        if (value == null || value.isBlank()) return null;

        EndpointMappingModel mapping = new EndpointMappingModel();
        // Parse "POST /v1/curricula/generate"
        String[] parts = value.trim().split("\\s+", 2);
        if (parts.length == 2) {
            mapping.setMethod(parts[0].toUpperCase());
            mapping.setPath(parts[1]);
        } else {
            mapping.setPath(value);
        }
        return mapping;
    }

    // --- @DocExample ---

    @DocMethod(since = "3.0.0")
    public List<ExampleModel> readDocExamples(Element element) {
        List<ExampleModel> examples = new ArrayList<>();

        // Single @DocExample
        AnnotationMirror single = findAnnotation(element, DOC_EXAMPLE);
        if (single != null) {
            examples.add(readSingleExample(single));
        }

        // @DocExamples container
        AnnotationMirror container = findAnnotation(element, DOC_EXAMPLES);
        if (container != null) {
            List<? extends AnnotationValue> values = getAnnotationArrayValue(container, "value");
            if (values != null) {
                for (AnnotationValue v : values) {
                    AnnotationMirror m = (AnnotationMirror) v.getValue();
                    examples.add(readSingleExample(m));
                }
            }
        }
        return examples;
    }

    private ExampleModel readSingleExample(AnnotationMirror mirror) {
        ExampleModel example = new ExampleModel();
        example.setTitle(getStringValue(mirror, "title"));
        example.setLanguage(getStringValue(mirror, "language"));
        example.setCode(getStringValue(mirror, "code"));
        String file = getStringValue(mirror, "file");
        if (file != null && !file.isEmpty()) {
            example.setSourceFile(file);
        }
        return example;
    }

    // --- v3: @DocPII ---

    public boolean hasDocPII(Element element) {
        return hasAnnotation(element, DOC_PII);
    }

    @DocMethod(since = "3.0.0")
    public PrivacyFieldModel readDocPII(VariableElement field, String ownerQualified) {
        AnnotationMirror mirror = findAnnotation(field, DOC_PII);
        if (mirror == null) return null;

        PrivacyFieldModel pf = new PrivacyFieldModel();
        pf.setField(ownerQualified + "." + field.getSimpleName().toString());
        pf.setPiiType(getStringValue(mirror, "value"));
        pf.setRetention(getStringValue(mirror, "retention"));
        pf.setGdprBasis(getStringValue(mirror, "gdprBasis"));
        Boolean enc = getBooleanValue(mirror, "encrypted");
        if (enc != null) pf.setEncrypted(enc);
        Boolean nl = getBooleanValue(mirror, "neverLog");
        if (nl != null) pf.setNeverLog(nl);
        Boolean nr = getBooleanValue(mirror, "neverReturn");
        if (nr != null) pf.setNeverReturn(nr);
        return pf;
    }

    // --- v3: @DocSensitive ---

    public boolean hasDocSensitive(Element element) {
        return hasAnnotation(element, DOC_SENSITIVE);
    }

    @DocMethod(since = "3.0.0")
    public PrivacyFieldModel readDocSensitive(VariableElement field, String ownerQualified) {
        AnnotationMirror mirror = findAnnotation(field, DOC_SENSITIVE);
        if (mirror == null) return null;

        PrivacyFieldModel pf = new PrivacyFieldModel();
        pf.setField(ownerQualified + "." + field.getSimpleName().toString());
        pf.setPiiType("other");
        pf.setNeverLog(true);
        return pf;
    }

    // --- v3: @DocPerformance ---

    @DocMethod(since = "3.0.0")
    public MethodPerformanceModel readDocPerformance(ExecutableElement method) {
        AnnotationMirror mirror = findAnnotation(method, DOC_PERFORMANCE);
        if (mirror == null) return null;

        MethodPerformanceModel perf = new MethodPerformanceModel();
        perf.setExpectedLatency(getStringValue(mirror, "expectedLatency"));
        perf.setBottleneck(getStringValue(mirror, "bottleneck"));
        return perf;
    }

    // --- v3: @DocIntentional ---

    public String readDocIntentional(ExecutableElement method) {
        AnnotationMirror mirror = findAnnotation(method, DOC_INTENTIONAL);
        if (mirror == null) return null;
        return getStringValue(mirror, "value");
    }

    // --- v3: @DocPreserves ---

    public List<String> readDocPreserves(ExecutableElement method) {
        AnnotationMirror mirror = findAnnotation(method, DOC_PRESERVES);
        if (mirror == null) return null;
        return getStringArrayValue(mirror, "fields");
    }

    // --- v3: @DocInvariant ---

    public List<String> readDocInvariant(TypeElement element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_INVARIANT);
        if (mirror == null) return null;
        return getStringArrayValue(mirror, "rules");
    }

    // --- v3: @DocIdempotent ---

    public boolean isIdempotent(ExecutableElement method) {
        return hasAnnotation(method, DOC_IDEMPOTENT);
    }

    // --- v3: @DocDeterministic ---

    public boolean isDeterministic(ExecutableElement method) {
        return hasAnnotation(method, DOC_DETERMINISTIC);
    }

    // --- v3: @DocStateMachine ---

    public boolean hasDocStateMachine(TypeElement element) {
        return hasAnnotation(element, DOC_STATE_MACHINE);
    }

    // --- v3: @DocTestStrategy ---

    public String readDocTestStrategy(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_TEST_STRATEGY);
        if (mirror == null) return null;
        return getStringValue(mirror, "value");
    }

    // --- v3: @DocTestSkip ---

    public boolean hasDocTestSkip(ExecutableElement method) {
        return hasAnnotation(method, DOC_TEST_SKIP);
    }

    // --- v3: @DocBoundary ---

    public String readDocBoundary(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_BOUNDARY);
        if (mirror == null) return null;
        return getStringValue(mirror, "value");
    }

    // --- v3: @DocWebSocket ---

    public String readDocWebSocketPath(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_WEBSOCKET);
        if (mirror == null) return null;
        return getStringValue(mirror, "path");
    }

    // --- v3: @DocCommand ---

    public String readDocCommand(ExecutableElement method) {
        AnnotationMirror mirror = findAnnotation(method, DOC_COMMAND);
        if (mirror == null) return null;
        return getStringValue(mirror, "value");
    }

    // --- v3: @DocGraphQL ---

    public String readDocGraphQLType(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_GRAPHQL);
        if (mirror == null) return null;
        return getStringValue(mirror, "type");
    }

    // --- v3: @DocGRPC ---

    public String readDocGRPCService(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_GRPC);
        if (mirror == null) return null;
        return getStringValue(mirror, "service");
    }

    // --- v3: @DocOrdering ---

    public OrderingModel readDocOrdering(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_ORDERING);
        if (mirror == null) return null;

        OrderingModel ordering = new OrderingModel();
        ordering.setStrategy(getStringValue(mirror, "strategy"));
        ordering.setField(getStringValue(mirror, "field"));
        ordering.setComparator(getStringValue(mirror, "comparator"));
        return ordering;
    }

    // --- v3: @DocMonotonic ---

    public MonotonicModel readDocMonotonic(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_MONOTONIC);
        if (mirror == null) return null;

        MonotonicModel monotonic = new MonotonicModel();
        monotonic.setField(getStringValue(mirror, "field"));
        monotonic.setDirection(getStringValue(mirror, "direction"));
        monotonic.setDescription(getStringValue(mirror, "description"));
        return monotonic;
    }

    // --- v3: @DocConservation ---

    public ConservationModel readDocConservation(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_CONSERVATION);
        if (mirror == null) return null;

        ConservationModel conservation = new ConservationModel();
        conservation.setQuantity(getStringValue(mirror, "quantity"));
        conservation.setScope(getStringValue(mirror, "scope"));
        conservation.setDescription(getStringValue(mirror, "description"));
        return conservation;
    }

    // --- v3: @DocCompare ---

    public CompareModel readDocCompare(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_COMPARE);
        if (mirror == null) return null;

        CompareModel compare = new CompareModel();
        compare.setStrategy(getStringValue(mirror, "strategy"));
        compare.setFields(getStringArrayValue(mirror, "fields"));
        return compare;
    }

    // --- v3: @DocRelation ---

    public RelationModel readDocRelation(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_RELATION);
        if (mirror == null) return null;

        RelationModel relation = new RelationModel();
        relation.setType(getStringValue(mirror, "type"));
        relation.setTarget(getStringValue(mirror, "target"));
        relation.setVia(getStringValue(mirror, "via"));
        relation.setDescription(getStringValue(mirror, "description"));
        return relation;
    }

    // --- v3: @DocAsyncAPI ---

    public String readDocAsyncAPI(Element element) {
        AnnotationMirror mirror = findAnnotation(element, DOC_ASYNC_API);
        if (mirror == null) return null;
        return getStringValue(mirror, "channel");
    }

    // --- Utility methods ---

    private boolean hasAnnotation(Element element, String annotationQualifiedName) {
        return findAnnotation(element, annotationQualifiedName) != null;
    }

    private AnnotationMirror findAnnotation(Element element, String annotationQualifiedName) {
        for (AnnotationMirror mirror : element.getAnnotationMirrors()) {
            TypeElement annotationType = (TypeElement) mirror.getAnnotationType().asElement();
            if (annotationType.getQualifiedName().contentEquals(annotationQualifiedName)) {
                return mirror;
            }
        }
        return null;
    }

    private String getStringValue(AnnotationMirror mirror, String key) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof String s) {
                    return s.isEmpty() ? null : s;
                }
                return value != null ? value.toString() : null;
            }
        }
        return null;
    }

    private Integer getIntValue(AnnotationMirror mirror, String key) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof Integer i) return i;
                if (value instanceof Number n) return n.intValue();
            }
        }
        return null;
    }

    private Boolean getBooleanValue(AnnotationMirror mirror, String key) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof Boolean b) return b;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<String> getStringArrayValue(AnnotationMirror mirror, String key) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof List<?> list) {
                    List<String> result = new ArrayList<>();
                    for (Object item : list) {
                        if (item instanceof AnnotationValue av) {
                            result.add(av.getValue().toString());
                        }
                    }
                    return result.isEmpty() ? null : result;
                }
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<? extends AnnotationValue> getAnnotationArrayValue(AnnotationMirror mirror, String key) {
        for (Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
                processingEnv.getElementUtils().getElementValuesWithDefaults(mirror).entrySet()) {
            if (entry.getKey().getSimpleName().contentEquals(key)) {
                Object value = entry.getValue().getValue();
                if (value instanceof List<?> list) {
                    return (List<? extends AnnotationValue>) list;
                }
            }
        }
        return null;
    }

    private String simplifyType(String fullType) {
        return fullType
                .replaceAll("java\\.lang\\.", "")
                .replaceAll("java\\.util\\.", "");
    }
}
