package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks a method where automated test generation should be skipped. Some methods are inherently difficult or inappropriate for automated test generation, for example methods with complex external dependencies, non-deterministic behavior, or destructive side effects. This annotation signals to test generation tooling that the method should be excluded.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocTestSkip {

    @DocMethod("The reason why automated test generation should be skipped for this method")
    String reason() default "";
}
