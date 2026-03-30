package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks a method as idempotent. An idempotent method produces the same result whether it is called once or multiple times with the same arguments. This is a critical property for retry safety, distributed systems, and API design.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocIdempotent {
    @DocMethod("Optional description of the idempotency guarantee")
    String value() default "";
}
