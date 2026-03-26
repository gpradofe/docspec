package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a field for explicit inclusion in generated documentation.
 *
 * <p>Fields that are not annotated may still appear in documentation depending
 * on the processor configuration, but annotating a field guarantees its
 * inclusion and allows supplying additional metadata.</p>
 *
 * <pre>{@code
 * @DocField(description = "Maximum number of retries before giving up.", since = "1.0")
 * private int maxRetries = 3;
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface DocField {

    /**
     * Prose description of the field's purpose.
     *
     * @return the field description
     */
    String description() default "";

    /**
     * Version in which this field was first introduced.
     *
     * @return the version string
     */
    String since() default "";
}
