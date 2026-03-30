package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Declares a conservation law -- a quantity that is preserved through a transformation. Conservation laws are fundamental semantic properties stating that certain quantities remain constant before and after an operation. For example, a fund transfer must conserve the total balance across all accounts.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocConservation {

    @DocMethod("A description of the conservation law that holds for this method")
    String value();
}
