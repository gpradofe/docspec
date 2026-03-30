package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Attaches a code example to a documented method or type. This annotation is Repeatable, so multiple examples can be attached to the same element. Each example may supply code inline via code() or reference an external file via file().")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
@Repeatable(DocExamples.class)
public @interface DocExample {

    @DocMethod("Display title for the example")
    String title() default "";

    @DocMethod("Programming language of the example code, used for syntax highlighting")
    String language() default "java";

    @DocMethod("Inline source code for the example")
    String code() default "";

    @DocMethod("Path to an external file containing the example source code")
    String file() default "";
}
