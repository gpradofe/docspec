package io.docspec.processor.scanner;

import io.docspec.annotation.DocDeterministic;
import io.docspec.annotation.DocMethod;

import java.util.List;
import java.util.regex.Pattern;

public class PackageFilter {

    private final List<Pattern> includePatterns;
    private final List<Pattern> excludePatterns;

    public PackageFilter(List<String> includes, List<String> excludes) {
        this.includePatterns = includes.stream()
                .map(PackageFilter::globToRegex)
                .map(Pattern::compile)
                .toList();
        this.excludePatterns = excludes.stream()
                .map(PackageFilter::globToRegex)
                .map(Pattern::compile)
                .toList();
    }

    @DocDeterministic
    @DocMethod(since = "3.0.0")
    public boolean accepts(String qualifiedName) {
        // If excludes match, reject
        for (Pattern exclude : excludePatterns) {
            if (exclude.matcher(qualifiedName).matches()) {
                return false;
            }
        }
        // If no includes defined, accept everything
        if (includePatterns.isEmpty()) {
            return true;
        }
        // If includes defined, must match at least one
        for (Pattern include : includePatterns) {
            if (include.matcher(qualifiedName).matches()) {
                return true;
            }
        }
        return false;
    }

    static String globToRegex(String glob) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < glob.length(); i++) {
            char c = glob.charAt(i);
            if (c == '*' && i + 1 < glob.length() && glob.charAt(i + 1) == '*') {
                sb.append(".*");
                i++; // skip second *
                // skip trailing dot after **
                if (i + 1 < glob.length() && glob.charAt(i + 1) == '.') {
                    sb.append("\\.");
                    i++;
                }
            } else if (c == '*') {
                sb.append("[^.]*");
            } else if (c == '.') {
                sb.append("\\.");
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
