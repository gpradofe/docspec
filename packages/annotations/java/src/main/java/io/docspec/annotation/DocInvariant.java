package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Declares invariants that must hold on the annotated type. An invariant is a condition that must be true at all observable points during the lifetime of an instance. Documenting invariants enables verification tooling and helps developers understand the contracts that govern a type's state.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE})
public @interface DocInvariant {

    @DocMethod("The entity or class the invariant applies to, empty means the annotated type itself")
    String on() default "";

    @DocMethod("The invariant rules expressed as human-readable expressions")
    String[] rules();
}
