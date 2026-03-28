package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares a monotonically increasing or decreasing property.
 *
 * <p>A monotonic value is one that only changes in a single direction over
 * time. Common examples include sequence counters, timestamps, and version
 * numbers. Documenting monotonicity helps reasoning about consistency and
 * ordering in distributed systems.</p>
 *
 * <pre>{@code
 * @DocMonotonic(direction = "increasing")
 * private long sequenceNumber;
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.FIELD})
public @interface DocMonotonic {

    /**
     * The direction of monotonic change.
     *
     * <p>Valid values are {@code "increasing"} and {@code "decreasing"}.</p>
     *
     * @return the direction, defaults to {@code "increasing"}
     */
    String direction() default "increasing";
}
