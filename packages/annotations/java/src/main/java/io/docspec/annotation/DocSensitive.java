package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks sensitive data that should not be logged or returned in API responses. Unlike DocPII, which specifically identifies personally identifiable information, this annotation covers any data that is sensitive for security, compliance, or business reasons -- such as API keys, internal identifiers, or trade secrets.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.METHOD})
public @interface DocSensitive {

    @DocMethod("The reason this data is considered sensitive")
    String reason() default "";
}
