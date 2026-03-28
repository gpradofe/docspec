package io.docspec.processor.dsti;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;
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
