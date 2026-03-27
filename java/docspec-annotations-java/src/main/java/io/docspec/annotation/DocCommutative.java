package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a method as commutative — the order of its arguments does not affect the result.
 *
 * <p>This annotation generates property-based tests verifying that {@code f(a, b) == f(b, a)}
 * for all valid input pairs. Used by DSTI test generators.</p>
 *
 * <pre>{@code
 * @DocCommutative("addition is commutative")
 * public int add(int a, int b) {
 *     return a + b;
 * }
 * }</pre>
 *
 * @since 3.0.0
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocCommutative {
    /** Optional description of the commutative property. */
    String value() default "";
}
