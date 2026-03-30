package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents a relationship between entities. Use this annotation to describe how a field or method relates to another entity in the system. This metadata enables documentation tooling to render entity-relationship diagrams and dependency graphs.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.METHOD})
public @interface DocRelation {

    @DocMethod("The type of relationship, such as parent-child, peer, depends-on, owns, or references")
    String value();

    @DocMethod("The target entity of this relationship")
    String target() default "";
}
