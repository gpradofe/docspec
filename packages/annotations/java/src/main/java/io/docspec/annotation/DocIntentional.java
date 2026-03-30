package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Declares the primary intent of the annotated method. Intent documentation captures why a method exists and what it is meant to achieve, as opposed to its mechanical implementation. This enables tooling to verify that code behavior aligns with stated intent and to detect semantic drift over time.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocIntentional {

    @DocMethod("A description of the method's primary intent")
    String value();

    @DocMethod("Fields or properties that must be preserved (unchanged) through the method's execution")
    String[] preserves() default {};
}
