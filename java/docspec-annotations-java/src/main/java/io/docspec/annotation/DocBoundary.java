package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an architectural boundary.
 *
 * <p>Boundaries are key structural points in a system where one subsystem
 * or context meets another. Common boundary types include anti-corruption
 * layers, adapters, facades, and gateway services. Documenting boundaries
 * helps developers understand system decomposition and integration points.</p>
 *
 * <pre>{@code
 * @DocBoundary("anti-corruption layer")
 * public class LegacyPaymentAdapter { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocBoundary {

    /**
     * A description of the architectural boundary.
     *
     * <p>Common values include {@code "anti-corruption layer"},
     * {@code "adapter"}, {@code "facade"}, and {@code "gateway"}.</p>
     *
     * @return the boundary description
     */
    String value();
}
