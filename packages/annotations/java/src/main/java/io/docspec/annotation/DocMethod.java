package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents a method -- replaces JavaDoc comments. The value serves as the method description and is used by both DocSpec (for structured documentation) and by the docspec:inject-sources goal to generate standard JavaDoc comments for IDE hover and Maven JavaDoc.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface DocMethod {

    @DocMethod("Description of what this method does")
    String value() default "";

    @DocMethod("Description of the return value")
    String returns() default "";

    @DocMethod("Structured parameter documentation")
    Param[] params() default {};

    @DocMethod("Structured throws documentation")
    ThrowsDoc[] throwsDoc() default {};

    @DocMethod("Version in which this method was first introduced")
    String since() default "";

    @DocMethod("Deprecation notice, empty means not deprecated")
    String deprecated() default "";

    @DocMethod("Code example showing usage of this method")
    String example() default "";
}
