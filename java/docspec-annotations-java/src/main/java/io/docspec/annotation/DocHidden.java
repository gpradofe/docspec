package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marker annotation that excludes the annotated element from generated
 * documentation.
 *
 * <p>Apply this to types, methods, fields, constructors, or packages that
 * should remain undocumented regardless of other visibility rules or
 * processor configuration.</p>
 *
 * <pre>{@code
 * @DocHidden
 * public void internalMigrationHelper() { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD, ElementType.FIELD, ElementType.CONSTRUCTOR, ElementType.PACKAGE})
public @interface DocHidden {
}
