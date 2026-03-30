package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents a thrown exception. Used inside DocMethod#throwsDoc(). Replaces the @throws tag in JavaDoc comments.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({})  // Only used inside @DocMethod.throwsDoc
public @interface ThrowsDoc {

    @DocMethod("Fully qualified or simple name of the exception type")
    String type();

    @DocMethod("Description of when this exception is thrown")
    String value();
}
