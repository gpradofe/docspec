package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks an architectural boundary. Boundaries are key structural points in a system where one subsystem or context meets another. Common boundary types include anti-corruption layers, adapters, facades, and gateway services. Documenting boundaries helps developers understand system decomposition and integration points.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocBoundary {

    @DocMethod("A description of the architectural boundary, such as anti-corruption layer, adapter, facade, or gateway")
    String value();
}
