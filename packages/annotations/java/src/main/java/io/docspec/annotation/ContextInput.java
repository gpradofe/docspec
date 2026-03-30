package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Describes a single runtime input within a DocContext. This annotation has an empty Target and is designed exclusively for use as a nested annotation inside DocContext#inputs().")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({})
public @interface ContextInput {

    @DocMethod("Name of the input parameter")
    String name();

    @DocMethod("Origin or source of the input value, such as environment, request.body, or config")
    String source() default "";

    @DocMethod("Prose description of the input's purpose and expected format")
    String description() default "";

    @DocMethod("Enumeration of specific items, keys, or variants that this input accepts")
    String[] items() default {};
}
