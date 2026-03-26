package io.docspec.processor.dsti;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;
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
 * For each method in a type, runs {@link NamingAnalyzer} and {@link IntentDensityCalculator}
 * to build the intent graph section of the DocSpec model.
 *
 * <p>This extractor is only active when the DSTI config flag is enabled. It optionally
 * uses {@code com.sun.source.util.Trees} for deeper AST analysis, but gracefully
 * degrades if that API is unavailable.</p>
 */
@DocBoundary("DSTI intent graph extraction boundary")
public class IntentGraphExtractor implements DocSpecExtractor {

    private static final String DOC_INTENTIONAL = "io.docspec.annotation.DocIntentional";
    private static final String DOC_PRESERVES = "io.docspec.annotation.DocPreserves";

    private final boolean dstiEnabled;
    private final NamingAnalyzer namingAnalyzer;
    private final IntentDensityCalculator densityCalculator;

    public IntentGraphExtractor(boolean dstiEnabled) {
        this.dstiEnabled = dstiEnabled;
        this.namingAnalyzer = new NamingAnalyzer();
        this.densityCalculator = new IntentDensityCalculator();
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

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(TypeElement typeElement, ProcessingEnvironment processingEnv, DocSpecModel model) {
        String ownerQualified = typeElement.getQualifiedName().toString();
        List<IntentMethodModel> methods = new ArrayList<>();

        // Try to obtain Trees for deeper AST analysis; gracefully degrade if unavailable
        Object trees = null;
        try {
            Class<?> treesClass = Class.forName("com.sun.source.util.Trees");
            java.lang.reflect.Method instanceMethod = treesClass.getMethod("instance", ProcessingEnvironment.class);
            trees = instanceMethod.invoke(null, processingEnv);
        } catch (Exception ignored) {
            // Trees API not available; proceed with annotation-only analysis
        }

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

            // --- Name semantics from NamingAnalyzer ---
            NamingAnalyzer.NameSemantics semantics = namingAnalyzer.analyze(methodName);
            IntentSignalsModel.NameSemanticsModel nameModel = new IntentSignalsModel.NameSemanticsModel();
            nameModel.setVerb(semantics.verb());
            nameModel.setObject(semantics.object());
            nameModel.setIntent(semantics.intent());
            signals.setNameSemantics(nameModel);

            // --- Guard clauses: count annotations that express intent constraints ---
            int guardClauses = 0;
            AnnotationMirror intentional = findAnnotation(method, DOC_INTENTIONAL);
            if (intentional != null) {
                guardClauses++;
                // The @DocIntentional.preserves() array indicates preserved fields
                List<String> preserves = getStringArrayValue(intentional, "preserves", processingEnv);
                if (preserves != null && !preserves.isEmpty()) {
                    guardClauses += preserves.size();
                }
            }
            AnnotationMirror preservesMirror = findAnnotation(method, DOC_PRESERVES);
            if (preservesMirror != null) {
                List<String> fields = getStringArrayValue(preservesMirror, "fields", processingEnv);
                if (fields != null) {
                    guardClauses += fields.size();
                }
            }

            // --- Channel 13: Validation annotations on parameters ---
            int validationAnnotations = 0;
            for (VariableElement param : method.getParameters()) {
                for (AnnotationMirror am : param.getAnnotationMirrors()) {
                    String annotName = am.getAnnotationType().asElement().getSimpleName().toString();
                    if ("NotNull".equals(annotName) || "NonNull".equals(annotName)
                            || "Nonnull".equals(annotName) || "Valid".equals(annotName)
                            || "Min".equals(annotName) || "Max".equals(annotName)
                            || "Size".equals(annotName) || "NotBlank".equals(annotName)
                            || "NotEmpty".equals(annotName) || "Pattern".equals(annotName)
                            || "Email".equals(annotName) || "Positive".equals(annotName)
                            || "PositiveOrZero".equals(annotName) || "Negative".equals(annotName)
                            || "NegativeOrZero".equals(annotName) || "Past".equals(annotName)
                            || "Future".equals(annotName) || "Digits".equals(annotName)
                            || "DecimalMin".equals(annotName) || "DecimalMax".equals(annotName)) {
                        validationAnnotations++;
                    }
                }
            }
            if (validationAnnotations > 0) {
                signals.setValidationAnnotations(validationAnnotations);
            }

            // --- Deeper analysis with Trees if available ---
            if (trees != null) {
                try {
                    analyzeWithTrees(trees, method, signals, processingEnv);
                } catch (Exception ignored) {
                    // Graceful degradation: Trees-based analysis failed
                }
            }

            // If guard clauses were not populated by Trees analysis, use annotation-based count
            if (signals.getGuardClauses() == null || signals.getGuardClauses() == 0) {
                signals.setGuardClauses(guardClauses > 0 ? guardClauses : null);
            }

            // --- Dependencies: collect injected field types ---
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
            if (!dependencies.isEmpty()) {
                signals.setDependencies(dependencies);
            }

            // --- ISD score ---
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
     * Uses the Trees API to perform deeper AST analysis of a method body,
     * extracting guard clauses, branches, error handling, loop properties, and constants.
     */
    private void analyzeWithTrees(Object trees, ExecutableElement method,
                                   IntentSignalsModel signals, ProcessingEnvironment processingEnv) throws Exception {
        // Get the method's tree representation
        Class<?> treesClass = Class.forName("com.sun.source.util.Trees");
        java.lang.reflect.Method getTree = treesClass.getMethod("getTree", Element.class);
        Object methodTree = getTree.invoke(trees, method);
        if (methodTree == null) return;

        // Get the method body
        java.lang.reflect.Method getBody = methodTree.getClass().getMethod("getBody");
        Object body = getBody.invoke(methodTree);
        if (body == null) return;

        // Get statements from the block
        java.lang.reflect.Method getStatements = body.getClass().getMethod("getStatements");
        Object statements = getStatements.invoke(body);
        if (!(statements instanceof List<?> stmtList)) return;

        int guardClauses = 0;
        int branches = 0;
        int catchBlocks = 0;
        List<String> caughtTypes = new ArrayList<>();
        boolean hasStreams = false;
        boolean hasEnhancedFor = false;
        List<String> constants = new ArrayList<>();
        int nullChecks = 0;
        int assertions = 0;
        int logStatements = 0;

        for (Object stmt : stmtList) {
            String stmtClassName = stmt.getClass().getSimpleName();

            // Count if-statements (branches)
            if (stmtClassName.contains("If")) {
                branches++;
                // Guard clause heuristic: if the first statements are if-throw, they're guards
                if (isGuardClause(stmt)) {
                    guardClauses++;
                }
            }

            // Count try-catch blocks
            if (stmtClassName.contains("Try")) {
                try {
                    java.lang.reflect.Method getCatches = stmt.getClass().getMethod("getCatches");
                    Object catches = getCatches.invoke(stmt);
                    if (catches instanceof List<?> catchList) {
                        catchBlocks += catchList.size();
                        for (Object catchClause : catchList) {
                            try {
                                java.lang.reflect.Method getParameter = catchClause.getClass().getMethod("getParameter");
                                Object param = getParameter.invoke(catchClause);
                                if (param != null) {
                                    java.lang.reflect.Method getType = param.getClass().getMethod("getType");
                                    Object type = getType.invoke(param);
                                    if (type != null) {
                                        caughtTypes.add(type.toString());
                                    }
                                }
                            } catch (Exception ignored) {
                                // Skip if we cannot extract catch parameter type
                            }
                        }
                    }
                } catch (Exception ignored) {
                    // Try block analysis failed
                }
            }

            // Enhanced for loop detection
            if (stmtClassName.contains("EnhancedForLoop")) {
                hasEnhancedFor = true;
            }

            // Channel 11: Assertions - detect assert statements
            if (stmtClassName.contains("Assert")) {
                assertions++;
            }
        }

        // Full method source for pattern-based analysis
        String methodSource = methodTree.toString();

        // Stream detection: check the method's string representation for .stream()
        if (methodSource.contains(".stream()") || methodSource.contains("Stream.")) {
            hasStreams = true;
        }

        // Channel 9: Constants - scan for UPPER_CASE references (static final fields)
        java.util.regex.Pattern constantPattern = java.util.regex.Pattern.compile(
                "(?:^|[^a-zA-Z_])([A-Z][A-Z0-9_]{2,})(?:[^a-zA-Z0-9_]|$)");
        java.util.regex.Matcher constantMatcher = constantPattern.matcher(methodSource);
        while (constantMatcher.find()) {
            String constant = constantMatcher.group(1);
            if (!constants.contains(constant)) {
                constants.add(constant);
            }
        }

        // Channel 10: Null checks - count null-related patterns
        if (methodSource.contains("!= null")) {
            nullChecks += countOccurrences(methodSource, "!= null");
        }
        if (methodSource.contains("== null")) {
            nullChecks += countOccurrences(methodSource, "== null");
        }
        if (methodSource.contains("Objects.requireNonNull")) {
            nullChecks += countOccurrences(methodSource, "Objects.requireNonNull");
        }
        if (methodSource.contains("Optional.ofNullable")) {
            nullChecks += countOccurrences(methodSource, "Optional.ofNullable");
        }
        if (methodSource.contains("Optional.of(")) {
            nullChecks += countOccurrences(methodSource, "Optional.of(");
        }

        // Channel 11: Assertions - also count method-call-based assertions (check*, require*, verify*)
        java.util.regex.Pattern assertionCallPattern = java.util.regex.Pattern.compile(
                "\\b(check[A-Z]\\w*|require[A-Z]\\w*|verify[A-Z]\\w*)\\s*\\(");
        java.util.regex.Matcher assertionMatcher = assertionCallPattern.matcher(methodSource);
        while (assertionMatcher.find()) {
            assertions++;
        }

        // Channel 12: Logging - detect logger method calls
        java.util.regex.Pattern logPattern = java.util.regex.Pattern.compile(
                "\\b\\w+\\s*\\.\\s*(log|debug|info|warn|error|trace)\\s*\\(");
        java.util.regex.Matcher logMatcher = logPattern.matcher(methodSource);
        while (logMatcher.find()) {
            logStatements++;
        }

        // Populate signals from AST analysis
        if (guardClauses > 0) {
            Integer existing = signals.getGuardClauses();
            signals.setGuardClauses((existing != null ? existing : 0) + guardClauses);
        }
        if (branches > 0) {
            signals.setBranches(branches);
        }
        if (catchBlocks > 0) {
            IntentSignalsModel.ErrorHandlingModel errorHandling = new IntentSignalsModel.ErrorHandlingModel();
            errorHandling.setCatchBlocks(catchBlocks);
            if (!caughtTypes.isEmpty()) {
                errorHandling.setCaughtTypes(caughtTypes);
            }
            signals.setErrorHandling(errorHandling);
        }
        if (hasStreams || hasEnhancedFor) {
            IntentSignalsModel.LoopPropertiesModel loopProps = new IntentSignalsModel.LoopPropertiesModel();
            loopProps.setHasStreams(hasStreams ? true : null);
            loopProps.setHasEnhancedFor(hasEnhancedFor ? true : null);
            signals.setLoopProperties(loopProps);
        }
        // Channel 9: Constants
        if (!constants.isEmpty()) {
            signals.setConstants(constants);
        }
        // Channel 10: Null checks
        if (nullChecks > 0) {
            signals.setNullChecks(nullChecks);
        }
        // Channel 11: Assertions
        if (assertions > 0) {
            signals.setAssertions(assertions);
        }
        // Channel 12: Logging
        if (logStatements > 0) {
            signals.setLogStatements(logStatements);
        }
    }

    /**
     * Heuristic: checks if a statement looks like a guard clause (if-then-throw).
     */
    private boolean isGuardClause(Object ifStmt) {
        try {
            java.lang.reflect.Method getThenStatement = ifStmt.getClass().getMethod("getThenStatement");
            Object thenStmt = getThenStatement.invoke(ifStmt);
            if (thenStmt != null) {
                String thenStr = thenStmt.toString();
                return thenStr.contains("throw ");
            }
        } catch (Exception ignored) {
            // Cannot determine
        }
        return false;
    }

    /**
     * Counts non-overlapping occurrences of a substring within a string.
     */
    private int countOccurrences(String text, String substring) {
        int count = 0;
        int idx = 0;
        while ((idx = text.indexOf(substring, idx)) != -1) {
            count++;
            idx += substring.length();
        }
        return count;
    }

    // --- Private helpers ---

    private AnnotationMirror findAnnotation(Element element, String annotationQualifiedName) {
        for (AnnotationMirror mirror : element.getAnnotationMirrors()) {
            TypeElement annotationType = (TypeElement) mirror.getAnnotationType().asElement();
            if (annotationType.getQualifiedName().contentEquals(annotationQualifiedName)) {
                return mirror;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<String> getStringArrayValue(AnnotationMirror mirror, String key, ProcessingEnvironment processingEnv) {
        for (java.util.Map.Entry<? extends ExecutableElement, ? extends AnnotationValue> entry :
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
}
