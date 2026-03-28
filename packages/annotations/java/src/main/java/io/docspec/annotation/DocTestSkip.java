package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a method where automated test generation should be skipped.
 *
 * <p>Some methods are inherently difficult or inappropriate for automated
 * test generation — for example, methods with complex external dependencies,
 * non-deterministic behavior, or destructive side effects. This annotation
 * signals to test generation tooling that the method should be excluded.</p>
 *
 * <pre>{@code
 * @DocTestSkip(reason = "Requires physical hardware connection")
 * public void calibrateSensor() { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocTestSkip {

    /**
     * The reason why automated test generation should be skipped for this
     * method.
     *
     * @return a human-readable explanation
     */
    String reason() default "";
}
