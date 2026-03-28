package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares invariants that must hold on the annotated type.
 *
 * <p>An invariant is a condition that must be true at all observable points
 * during the lifetime of an instance. Documenting invariants enables
 * verification tooling and helps developers understand the contracts that
 * govern a type's state.</p>
 *
 * <pre>{@code
 * @DocInvariant(on = "Account", rules = {
 *     "balance >= 0",
 *     "currency is never null",
 *     "createdAt <= updatedAt"
 * })
 * public class Account { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE})
public @interface DocInvariant {

    /**
     * The entity or class the invariant applies to.
     *
     * <p>If empty, the invariant applies to the annotated type itself.</p>
     *
     * @return the target entity name, or empty to use the annotated type
     */
    String on() default "";

    /**
     * The invariant rules expressed as human-readable expressions.
     *
     * @return an array of invariant rule expressions
     */
    String[] rules();
}
