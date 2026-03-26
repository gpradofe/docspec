package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Container annotation for repeatable {@link DocExample} annotations.
 *
 * <p>This annotation is not intended to be used directly. When multiple
 * {@link DocExample} annotations are placed on the same element, the compiler
 * automatically wraps them in a {@code DocExamples} container.</p>
 *
 * @see DocExample
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
public @interface DocExamples {

    /**
     * The contained {@link DocExample} annotations.
     *
     * @return the array of examples
     */
    DocExample[] value();
}
