package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents the test strategy for the annotated type or method. This annotation captures how a component should be tested, including the testing level and key scenarios. Documentation tooling can use this to generate test coverage reports and identify gaps.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocTestStrategy {

    @DocMethod("The testing strategy or level, such as unit, integration, e2e, or property-based")
    String value();

    @DocMethod("Key test scenarios that should be covered")
    String[] scenarios() default {};
}
