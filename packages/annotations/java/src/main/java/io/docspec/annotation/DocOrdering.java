package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Declares ordering guarantees provided by the annotated method. Use this annotation to document whether a method preserves insertion order, returns results sorted by a particular key, or provides any other ordering contract that callers may depend on.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocOrdering {

    @DocMethod("A description of the ordering guarantee")
    String value();
}
