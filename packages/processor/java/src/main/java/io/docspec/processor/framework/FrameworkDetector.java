package io.docspec.processor.framework;

import io.docspec.annotation.DocBoundary;
import io.docspec.annotation.DocMethod;

import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.TypeElement;

@DocBoundary("framework detection without compile deps")
public interface FrameworkDetector {

    @DocMethod(since = "3.0.0")
    boolean isAvailable(ProcessingEnvironment processingEnv);

    String frameworkName();

    @DocMethod(since = "3.0.0")
    FrameworkInfo detect(TypeElement typeElement, ProcessingEnvironment processingEnv);

    record FrameworkInfo(
            String stereotype,
            String moduleGroup,
            boolean exclude
    ) {
        public static final FrameworkInfo NONE = new FrameworkInfo(null, null, false);
        public static final FrameworkInfo EXCLUDED = new FrameworkInfo(null, null, true);

        public boolean isDetected() {
            return stereotype != null || moduleGroup != null;
        }
    }
}
