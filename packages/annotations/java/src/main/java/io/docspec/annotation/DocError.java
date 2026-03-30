package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents an error code on the annotated type, providing structured information for API consumers to understand and handle failures. Each annotated type represents a distinct error condition with its own code, HTTP status, description, possible causes, and resolution guidance.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DocError {

    @DocMethod("Application-specific error code")
    String code();

    @DocMethod("HTTP status code associated with this error, -1 indicates no specific HTTP status")
    int httpStatus() default -1;

    @DocMethod("Human-readable description of the error condition")
    String description() default "";

    @DocMethod("Possible root causes that may lead to this error")
    String[] causes() default {};

    @DocMethod("Guidance for the API consumer on how to resolve or avoid this error")
    String resolution() default "";

    @DocMethod("Version in which this error code was first introduced")
    String since() default "";
}
