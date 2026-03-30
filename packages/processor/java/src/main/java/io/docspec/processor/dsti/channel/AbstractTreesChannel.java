package io.docspec.processor.dsti.channel;

import io.docspec.annotation.*;
import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;
import java.util.List;

@DocBoundary("Base class for channels that need AST Trees access. Provides helper methods for reflective Tree API access.")
public abstract class AbstractTreesChannel implements IntentChannel {

    @Override
    public boolean requiresTrees() {
        return true;
    }

    @DocMethod(value = "Extracts the list of statements from a method tree body block",
               since = "3.0.0",
               params = {@Param(name = "methodTree", value = "The method tree obtained from Trees.getTree()")},
               returns = "The list of statement tree objects, or an empty list if unavailable")
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

    @DocMethod(value = "Returns the full source text of a method tree",
               params = {@Param(name = "methodTree", value = "The method tree obtained from Trees.getTree()")},
               returns = "The source text, or empty string if null")
    protected String getMethodSource(Object methodTree) {
        return methodTree != null ? methodTree.toString() : "";
    }

    @DocMethod(value = "Counts non-overlapping occurrences of a substring within a string",
               params = {
                   @Param(name = "text", value = "The text to search"),
                   @Param(name = "substring", value = "The substring to count")
               },
               returns = "The number of occurrences")
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
