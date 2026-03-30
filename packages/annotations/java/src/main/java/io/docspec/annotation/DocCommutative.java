package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks a method as commutative -- the order of its arguments does not affect the result. This annotation generates property-based tests verifying that f(a, b) == f(b, a) for all valid input pairs. Used by DSTI test generators.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocCommutative {
    @DocMethod("Optional description of the commutative property")
    String value() default "";
}
