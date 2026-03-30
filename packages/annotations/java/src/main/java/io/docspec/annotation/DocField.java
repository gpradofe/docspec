package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks a field for explicit inclusion in generated documentation. Fields that are not annotated may still appear in documentation depending on the processor configuration, but annotating a field guarantees its inclusion and allows supplying additional metadata.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface DocField {

    @DocMethod("Prose description of the field's purpose")
    String description() default "";

    @DocMethod("Version in which this field was first introduced")
    String since() default "";
}
