package io.docspec.processor.reader;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;
import com.sun.source.doctree.*;
import com.sun.source.util.DocTrees;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.Element;
import java.util.LinkedHashMap;
import java.util.Map;

@DocBoundary("documentation metadata reader")
public class JavaDocReader {

    private final DocTrees docTrees;

    public JavaDocReader(ProcessingEnvironment processingEnv) {
        this.docTrees = DocTrees.instance(processingEnv);
    }

    @DocMethod(since = "3.0.0")
    public String getDescription(Element element) {
        DocCommentTree docTree = docTrees.getDocCommentTree(element);
        if (docTree == null) return null;

        StringBuilder sb = new StringBuilder();
        for (DocTree bodyTree : docTree.getFullBody()) {
            appendDocTree(sb, bodyTree);
        }
        String result = sb.toString().trim();
        return result.isEmpty() ? null : result;
    }

    @DocMethod(since = "3.0.0")
    public Map<String, String> getParamDescriptions(Element element) {
        DocCommentTree docTree = docTrees.getDocCommentTree(element);
        if (docTree == null) return Map.of();

        Map<String, String> params = new LinkedHashMap<>();
        for (DocTree tag : docTree.getBlockTags()) {
            if (tag instanceof ParamTree paramTree) {
                String name = paramTree.getName().toString();
                StringBuilder desc = new StringBuilder();
                for (DocTree d : paramTree.getDescription()) {
                    appendDocTree(desc, d);
                }
                String descStr = desc.toString().trim();
                if (!descStr.isEmpty()) {
                    params.put(name, descStr);
                }
            }
        }
        return params;
    }

    @DocMethod(since = "3.0.0")
    public String getReturnDescription(Element element) {
        DocCommentTree docTree = docTrees.getDocCommentTree(element);
        if (docTree == null) return null;

        for (DocTree tag : docTree.getBlockTags()) {
            if (tag instanceof ReturnTree returnTree) {
                StringBuilder desc = new StringBuilder();
                for (DocTree d : returnTree.getDescription()) {
                    appendDocTree(desc, d);
                }
                String result = desc.toString().trim();
                return result.isEmpty() ? null : result;
            }
        }
        return null;
    }

    @DocMethod(since = "3.0.0")
    public Map<String, String> getThrowsDescriptions(Element element) {
        DocCommentTree docTree = docTrees.getDocCommentTree(element);
        if (docTree == null) return Map.of();

        Map<String, String> throwsMap = new LinkedHashMap<>();
        for (DocTree tag : docTree.getBlockTags()) {
            if (tag instanceof ThrowsTree throwsTree) {
                String exType = throwsTree.getExceptionName().toString();
                StringBuilder desc = new StringBuilder();
                for (DocTree d : throwsTree.getDescription()) {
                    appendDocTree(desc, d);
                }
                String descStr = desc.toString().trim();
                throwsMap.put(exType, descStr);
            }
        }
        return throwsMap;
    }

    @DocMethod(since = "3.0.0")
    public String getInlineExample(Element element) {
        DocCommentTree docTree = docTrees.getDocCommentTree(element);
        if (docTree == null) return null;

        for (DocTree tag : docTree.getBlockTags()) {
            if (tag instanceof UnknownBlockTagTree unknownTag) {
                if ("docspec.example".equals(unknownTag.getTagName())) {
                    StringBuilder code = new StringBuilder();
                    for (DocTree d : unknownTag.getContent()) {
                        code.append(d.toString());
                    }
                    String result = code.toString().trim();
                    return result.isEmpty() ? null : result;
                }
            }
        }
        return null;
    }

    private void appendDocTree(StringBuilder sb, DocTree tree) {
        if (tree instanceof TextTree textTree) {
            sb.append(textTree.getBody());
        } else if (tree instanceof LinkTree linkTree) {
            sb.append(linkTree.getReference().toString());
        } else {
            sb.append(tree.toString());
        }
    }
}
