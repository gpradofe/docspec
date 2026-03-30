package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Container annotation for repeatable DocExample annotations. This annotation is not intended to be used directly. When multiple DocExample annotations are placed on the same element, the compiler automatically wraps them in a DocExamples container.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
public @interface DocExamples {

    @DocMethod("The contained DocExample annotations")
    DocExample[] value();
}
