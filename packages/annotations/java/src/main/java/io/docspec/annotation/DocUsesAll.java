package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Container annotation for repeatable {@link DocUses} annotations.
 *
 * <p>This annotation is not intended to be used directly. When multiple
 * {@link DocUses} annotations are placed on the same element, the compiler
 * automatically wraps them in a {@code DocUsesAll} container.</p>
 *
 * @see DocUses
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
public @interface DocUsesAll {

    /**
     * The contained {@link DocUses} annotations.
     *
     * @return the array of cross-project references
     */
    DocUses[] value();
}
