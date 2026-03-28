package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents a relationship between entities.
 *
 * <p>Use this annotation to describe how a field or method relates to
 * another entity in the system. This metadata enables documentation
 * tooling to render entity-relationship diagrams and dependency graphs.</p>
 *
 * <pre>{@code
 * @DocRelation(value = "parent-child", target = "Department")
 * private Department parentDepartment;
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.METHOD})
public @interface DocRelation {

    /**
     * The type of relationship.
     *
     * <p>Common values include {@code "parent-child"}, {@code "peer"},
     * {@code "depends-on"}, {@code "owns"}, and {@code "references"}.</p>
     *
     * @return the relation type
     */
    String value();

    /**
     * The target entity of this relationship.
     *
     * @return the target entity name, or empty to infer from the field type
     */
    String target() default "";
}
