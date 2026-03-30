package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Declares fields that must be preserved through the method's execution. A preserved field is one whose value must remain unchanged after the method completes, regardless of any intermediate mutations. This is a semantic contract that documentation and verification tooling can use to detect accidental side effects.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocPreserves {

    @DocMethod("The names of fields or properties that must remain unchanged after the method executes")
    String[] fields();
}
