package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents a method parameter. Used inside DocMethod#params(). Replaces the @param tag in JavaDoc comments.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({})  // Only used inside @DocMethod.params
public @interface Param {

    @DocMethod("Parameter name -- must match the actual Java parameter name")
    String name();

    @DocMethod("Description of the parameter")
    String value();
}
