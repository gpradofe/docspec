package io.docspec.processor.dsti.channel;

import io.docspec.annotation.DocMethod;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.Element;
import javax.lang.model.element.ElementKind;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.VariableElement;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Channel 9: Constants (Assignment Chain).
 * Scans for UPPER_CASE constant references in the method body.
 * Falls back to detecting static final fields in the enclosing class when Trees is unavailable.
 * Sets the constants list on signals.
 */
public class AssignmentChainChannel extends AbstractTreesChannel {

    private static final Pattern CONSTANT_PATTERN = Pattern.compile(
            "(?:^|[^a-zA-Z_])([A-Z][A-Z0-9_]{2,})(?:[^a-zA-Z0-9_]|$)");

    @Override
    public String channelName() {
        return "constants";
    }

    @Override
    public int channelNumber() {
        return 9;
    }

    @Override
    public boolean requiresTrees() {
        // Works without Trees via static final field detection
        return false;
    }

    @Override
    @DocMethod(since = "3.0.0")
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        List<String> constants = new ArrayList<>();

        if (methodTree != null) {
            // AST-based: scan method source for UPPER_CASE references
            String methodSource = getMethodSource(methodTree);
            Matcher constantMatcher = CONSTANT_PATTERN.matcher(methodSource);
            while (constantMatcher.find()) {
                String constant = constantMatcher.group(1);
                if (!constants.contains(constant)) {
                    constants.add(constant);
                }
            }
        } else {
            // Fallback: collect static final fields from the enclosing class
            // These are the class's constants that methods may reference
            for (Element element : owner.getEnclosedElements()) {
                if (element.getKind() == ElementKind.FIELD && element instanceof VariableElement field) {
                    if (field.getModifiers().contains(Modifier.STATIC)
                            && field.getModifiers().contains(Modifier.FINAL)) {
                        String fieldName = field.getSimpleName().toString();
                        // Only include UPPER_CASE names (convention for constants)
                        if (fieldName.matches("[A-Z][A-Z0-9_]{2,}") && !constants.contains(fieldName)) {
                            constants.add(fieldName);
                        }
                    }
                }
            }
        }

        if (!constants.isEmpty()) {
            signals.setConstants(constants);
        }
    }
}
