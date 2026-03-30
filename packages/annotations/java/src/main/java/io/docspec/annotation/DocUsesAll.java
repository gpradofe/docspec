package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Container annotation for repeatable DocUses annotations. This annotation is not intended to be used directly. When multiple DocUses annotations are placed on the same element, the compiler automatically wraps them in a DocUsesAll container.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
public @interface DocUsesAll {

    @DocMethod("The contained DocUses annotations")
    DocUses[] value();
}
