package io.docspec.processor.dsti;

import io.docspec.annotation.*;
import io.docspec.processor.dsti.channel.*;
import io.docspec.processor.extractor.DocSpecExtractor;
import io.docspec.processor.model.DocSpecModel;
import io.docspec.processor.model.IntentGraphModel;
import io.docspec.processor.model.IntentMethodModel;
import io.docspec.processor.model.IntentSignalsModel;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Orchestrates DSTI (Documentation Semantic & Temporal Intelligence) analysis.
 * For each method in a type, iterates through 13 independent {@link IntentChannel}
 * implementations and merges their signals, then calculates the ISD score.
 *
 * <p>Each channel is self-contained and can be enabled/disabled individually
 * for ablation studies. The orchestrator resolves the Trees API once and passes
 * it to all channels that require AST access.</p>
 *
 * <p>This extractor is only active when the DSTI config flag is enabled. It optionally
 * uses {@code com.sun.source.util.Trees} for deeper AST analysis, but gracefully
 * degrades if that API is unavailable.</p>
 */
@DocBoundary("DSTI intent graph extraction boundary")
@DocFlow(id = "dsti-analysis",
    name = "DSTI Intent Analysis Pipeline",
    description = "Analyzes every public method across 13 independent intent channels, cross-verifies signals, and computes an ISD score. Each channel is self-contained for ablation.",
    trigger = "DocSpecProcessor invokes extract() on a discovered type",
    steps = {
        @Step(id = "resolve-trees", name = "Resolve Trees API", actor = "IntentGraphExtractor", type = "process",
              description = "Obtains com.sun.source.util.Trees via reflection for AST-level analysis; gracefully degrades if unavailable"),
        @Step(id = "ch1-naming", name = "Channel 1: Name Semantics", actor = "NamingChannel", type = "process",
              description = "Extracts verb, object, and intent category from method name via NamingAnalyzer"),
        @Step(id = "ch2-guards", name = "Channel 2: Guard Clauses", actor = "GuardClauseChannel", type = "process",
              description = "Counts if-throw guard patterns and @DocIntentional/@DocPreserves annotation-based guards"),
        @Step(id = "ch3-branches", name = "Channel 3: Branch Structure", actor = "BranchStructureChannel", type = "process",
              description = "Counts if-statements (branching complexity) from the AST"),
        @Step(id = "ch4-gap", name = "Channel 4: Name-Behavior Gap", actor = "NameBehaviorGapChannel", type = "process",
              description = "Cross-references naming intent with guard/branch signals to detect naming inconsistencies"),
        @Step(id = "ch5-return", name = "Channel 5: Return Type", actor = "ReturnTypeChannel", type = "process",
              description = "Analyzes return type for Optional, Collection, reactive, void, or scalar signals"),
        @Step(id = "ch6-assignment", name = "Channel 6: Assignment Patterns", actor = "AssignmentPatternChannel", type = "process",
              description = "Detects builder patterns, constructor calls, and data flow writes"),
        @Step(id = "ch7-loops", name = "Channel 7: Loop Patterns", actor = "LoopPatternChannel", type = "process",
              description = "Detects .stream(), enhanced-for loops, and specific stream operations (filter, map, flatMap)"),
        @Step(id = "ch8-errors", name = "Channel 8: Error Handling", actor = "ErrorHandlingChannel", type = "process",
              description = "Counts try/catch blocks and extracts caught exception types"),
        @Step(id = "ch9-constants", name = "Channel 9: Constants", actor = "AssignmentChainChannel", type = "process",
              description = "Scans for UPPER_CASE constant references in the method body"),
        @Step(id = "ch10-nulls", name = "Channel 10: Null Checks", actor = "ExceptionMessageChannel", type = "process",
              description = "Counts null check patterns: != null, == null, Objects.requireNonNull, Optional.ofNullable"),
        @Step(id = "ch11-assertions", name = "Channel 11: Assertions", actor = "ConstantChannel", type = "process",
              description = "Detects assert statements and assertion-style method calls (check*, require*, verify*)"),
        @Step(id = "ch12-logging", name = "Channel 12: Logging", actor = "LoggingChannel", type = "process",
              description = "Detects logger method calls (log, debug, info, warn, error, trace)"),
        @Step(id = "ch13-validation", name = "Channel 13: Validation Annotations", actor = "EqualityChannel", type = "process",
              description = "Counts Bean Validation annotations on parameters (@NotNull, @Valid, @Min, @Max, @Size, etc.)"),
        @Step(id = "cross-verify", name = "Cross-Verification", actor = "IntentGraphExtractor", type = "process",
              description = "Collects injected field types as dependency signals for cross-cutting analysis"),
        @Step(id = "isd-score", name = "ISD Score Calculation", actor = "IntentDensityCalculator", type = "process",
              description = "Computes weighted ISD score (0.0-1.0) from all 13 channel signals")
    }
)
@DocUses(artifact = "io.docspec:docspec-processor-java", member = "NamingAnalyzer",
    description = "Delegates method name parsing to NamingAnalyzer for verb/object/intent extraction")
@DocUses(artifact = "io.docspec:docspec-processor-java", member = "IntentDensityCalculator",
    description = "Computes the weighted ISD score from merged channel signals")
public class IntentGraphExtractor implements DocSpecExtractor {

    private final boolean dstiEnabled;
    private final NamingAnalyzer namingAnalyzer;
    private final IntentDensityCalculator densityCalculator;
    private final List<IntentChannel> channels;

    public IntentGraphExtractor(boolean dstiEnabled) {
        this.dstiEnabled = dstiEnabled;
        this.namingAnalyzer = new NamingAnalyzer();
        this.densityCalculator = new IntentDensityCalculator();
        this.channels = List.of(
                new NamingChannel(namingAnalyzer),
                new GuardClauseChannel(),
                new BranchStructureChannel(),
                new NameBehaviorGapChannel(),
                new ReturnTypeChannel(),
                new AssignmentPatternChannel(),
                new LoopPatternChannel(),
                new ErrorHandlingChannel(),
                new AssignmentChainChannel(),
                new ExceptionMessageChannel(),
                new ConstantChannel(),
                new LoggingChannel(),
                new EqualityChannel()
        );
    }

    @Override
    @DocMethod(since = "3.0.0")
    public boolean isAvailable(ProcessingEnvironment processingEnv) {
        return dstiEnabled;
    }

    @Override
    public String extractorName() {
        return "intent-graph";
    }

    /**
     * Returns the immutable list of all 13 DSTI channels used by this extractor.
     * Useful for ablation studies and channel-level diagnostics.
     *
     * @return the list of intent channels
     */
    public List<IntentChannel> getChannels() {
        return channels;
    }

    @Override
    @DocMethod(since = "3.0.0")
    @DocBoundary("DSTI extraction entry point")
    @DocExample(title = "Extract intent signals for a type",
        language = "java",
        code = "IntentGraphExtractor extractor = new IntentGraphExtractor(true);\nextractor.extract(typeElement, processingEnv, model);\n// model.getIntentGraph().getMethods() now contains ISD-scored intent signals")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        String ownerQualified = typeElement.getQualifiedName().toString();
        List<IntentMethodModel> methods = new ArrayList<>();

        // Resolve Trees API once for all channels
        Object trees = resolveTrees(processingEnv);

        for (Element enclosed : typeElement.getEnclosedElements()) {
            if (!(enclosed instanceof ExecutableElement method)) {
                continue;
            }
            // Skip constructors and static initializers
            if (method.getKind() != ElementKind.METHOD) {
                continue;
            }

            String methodName = method.getSimpleName().toString();
            String qualified = ownerQualified + "." + methodName;

            IntentSignalsModel signals = new IntentSignalsModel();

            // Resolve methodTree once for all channels that need it
            Object methodTree = resolveMethodTree(trees, method);

            // Run all 13 channels
            for (IntentChannel channel : channels) {
                if (!channel.requiresTrees() || methodTree != null) {
                    try {
                        channel.extract(method, typeElement, trees, methodTree, processingEnv, signals);
                    } catch (Exception ignored) {
                        // Graceful degradation per channel
                    }
                }
            }

            // Dependencies: collect injected field types (cross-cutting, not a signal channel)
            List<String> dependencies = extractDependencies(typeElement);
            if (!dependencies.isEmpty()) {
                signals.setDependencies(dependencies);
            }

            // ISD score
            double score = densityCalculator.calculate(signals);
            signals.setIntentDensityScore(score);

            IntentMethodModel intentMethod = new IntentMethodModel();
            intentMethod.setQualified(qualified);
            intentMethod.setIntentSignals(signals);
            methods.add(intentMethod);
        }

        if (!methods.isEmpty()) {
            IntentGraphModel intentGraph = model.getIntentGraph();
            if (intentGraph == null) {
                intentGraph = new IntentGraphModel();
                model.setIntentGraph(intentGraph);
            }
            intentGraph.getMethods().addAll(methods);
        }
    }

    /**
     * Attempts to obtain the {@code com.sun.source.util.Trees} instance via reflection.
     *
     * @param processingEnv the annotation processing environment
     * @return the Trees instance, or null if unavailable
     */
    private Object resolveTrees(ProcessingEnvironment processingEnv) {
        try {
            Class<?> treesClass = Class.forName("com.sun.source.util.Trees");
            java.lang.reflect.Method instanceMethod = treesClass.getMethod("instance", ProcessingEnvironment.class);
            return instanceMethod.invoke(null, processingEnv);
        } catch (Exception ignored) {
            // Trees API not available; channels will degrade gracefully
            return null;
        }
    }

    /**
     * Resolves the method tree for a given method element using the Trees API.
     *
     * @param trees  the Trees instance (may be null)
     * @param method the method element
     * @return the method tree, or null if Trees is unavailable or resolution fails
     */
    private Object resolveMethodTree(Object trees, ExecutableElement method) {
        if (trees == null) return null;
        try {
            Class<?> treesClass = Class.forName("com.sun.source.util.Trees");
            java.lang.reflect.Method getTree = treesClass.getMethod("getTree", Element.class);
            return getTree.invoke(trees, method);
        } catch (Exception ignored) {
            return null;
        }
    }

    /**
     * Collects injected (non-static, non-JDK) field types from the enclosing type
     * as dependency signals.
     *
     * @param typeElement the enclosing type to scan
     * @return the list of dependency type names
     */
    private List<String> extractDependencies(TypeElement typeElement) {
        List<String> dependencies = new ArrayList<>();
        for (Element ownerEnclosed : typeElement.getEnclosedElements()) {
            if (ownerEnclosed instanceof VariableElement field
                    && ownerEnclosed.getKind() == ElementKind.FIELD
                    && !field.getModifiers().contains(Modifier.STATIC)) {
                String fieldTypeName = field.asType().toString();
                // Only include non-primitive, non-JDK types as dependencies
                if (!fieldTypeName.startsWith("java.") && !fieldTypeName.startsWith("javax.")
                        && !fieldTypeName.startsWith("jakarta.") && fieldTypeName.contains(".")) {
                    String simpleName = fieldTypeName.contains("<")
                            ? fieldTypeName.substring(0, fieldTypeName.indexOf('<'))
                            : fieldTypeName;
                    if (!dependencies.contains(simpleName)) {
                        dependencies.add(simpleName);
                    }
                }
            }
        }
        return dependencies;
    }
}
