package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Declares a monotonically increasing or decreasing property. A monotonic value is one that only changes in a single direction over time. Common examples include sequence counters, timestamps, and version numbers. Documenting monotonicity helps reasoning about consistency and ordering in distributed systems.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.FIELD})
public @interface DocMonotonic {

    @DocMethod("The direction of monotonic change, valid values are increasing and decreasing")
    String direction() default "increasing";
}
