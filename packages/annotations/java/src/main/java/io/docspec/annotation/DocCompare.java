package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents comparison semantics for the annotated method.
 *
 * <p>Use this annotation to describe how a method compares, orders, or
 * evaluates equality of objects. This is particularly useful for custom
 * comparators, equality checks, and sorting implementations.</p>
 *
 * <pre>{@code
 * @DocCompare("natural ordering by last name, then first name")
 * public int compareTo(Person other) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocCompare {

    /**
     * A description of the comparison semantics.
     *
     * <p>Common values include {@code "natural ordering"},
     * {@code "by-name"}, {@code "by-date"}, and
     * {@code "case-insensitive"}.</p>
     *
     * @return the comparison description
     */
    String value();
}
