package io.docspec.processor.dsti.channel;

import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Channel 9: Constants (Assignment Chain).
 * Scans for UPPER_CASE constant references in the method body.
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
    public void extract(ExecutableElement method, TypeElement owner,
                        Object trees, Object methodTree,
                        ProcessingEnvironment env, IntentSignalsModel signals) {
        if (methodTree == null) return;

        String methodSource = getMethodSource(methodTree);
        List<String> constants = new ArrayList<>();

        Matcher constantMatcher = CONSTANT_PATTERN.matcher(methodSource);
        while (constantMatcher.find()) {
            String constant = constantMatcher.group(1);
            if (!constants.contains(constant)) {
                constants.add(constant);
            }
        }

        if (!constants.isEmpty()) {
            signals.setConstants(constants);
        }
    }
}
