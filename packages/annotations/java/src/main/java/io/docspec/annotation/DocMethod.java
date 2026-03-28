package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Adds lifecycle metadata to a documented method.
 *
 * <p>Use this annotation to record when a method was introduced and, if
 * applicable, when it was deprecated and what callers should use instead.</p>
 *
 * <pre>{@code
 * @DocMethod(since = "1.2", deprecated = "Use #generateV2 instead")
 * public Curriculum generate(Request request) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface DocMethod {

    /**
     * Version in which this method was first introduced.
     *
     * @return the version string
     */
    String since() default "";

    /**
     * Deprecation notice explaining why the method is deprecated and what
     * callers should migrate to.
     *
     * <p>An empty string (the default) means the method is not deprecated.</p>
     *
     * @return the deprecation message, or empty if not deprecated
     */
    String deprecated() default "";
}
