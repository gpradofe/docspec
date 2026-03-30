package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents comparison semantics for the annotated method. Use this annotation to describe how a method compares, orders, or evaluates equality of objects. This is particularly useful for custom comparators, equality checks, and sorting implementations.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocCompare {

    @DocMethod("A description of the comparison semantics, such as natural ordering, by-name, by-date, or case-insensitive")
    String value();
}
