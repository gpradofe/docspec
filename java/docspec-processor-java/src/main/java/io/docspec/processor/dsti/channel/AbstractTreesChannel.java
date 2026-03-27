package io.docspec.processor.dsti.channel;

import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import java.util.List;

/**
 * Base class for channels that need AST (Trees) access.
 * Provides helper methods for reflective Tree API access.
 */
public abstract class AbstractTreesChannel implements IntentChannel {

    @Override
    public boolean requiresTrees() {
        return true;
    }

    /**
     * Extracts the list of statements from a method tree's body block.
     *
     * @param methodTree the method tree obtained from Trees.getTree()
     * @return the list of statement tree objects, or an empty list if unavailable
     */
    protected List<?> getStatements(Object methodTree) {
        try {
            java.lang.reflect.Method getBody = methodTree.getClass().getMethod("getBody");
            Object body = getBody.invoke(methodTree);
            if (body == null) return List.of();
            java.lang.reflect.Method getStatements = body.getClass().getMethod("getStatements");
            Object stmts = getStatements.invoke(body);
            return stmts instanceof List<?> list ? list : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * Returns the full source text of a method tree.
     *
     * @param methodTree the method tree obtained from Trees.getTree()
     * @return the source text, or empty string if null
     */
    protected String getMethodSource(Object methodTree) {
        return methodTree != null ? methodTree.toString() : "";
    }

    /**
     * Counts non-overlapping occurrences of a substring within a string.
     *
     * @param text      the text to search
     * @param substring the substring to count
     * @return the number of occurrences
     */
    protected int countOccurrences(String text, String substring) {
        int count = 0;
        int idx = 0;
        while ((idx = text.indexOf(substring, idx)) != -1) {
            count++;
            idx += substring.length();
        }
        return count;
    }
}
