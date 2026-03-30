package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Declares a cross-project usage link within a DocContext. This annotation has an empty Target and is designed exclusively for use as a nested annotation inside DocContext#uses().")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({})
public @interface ContextUses {

    @DocMethod("Maven-style coordinates or identifier of the referenced artifact")
    String artifact();

    @DocMethod("Name of the specific component, class, or resource being used from the artifact")
    String what();

    @DocMethod("Prose explanation of why this dependency exists")
    String why() default "";
}
