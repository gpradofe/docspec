package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents the test strategy for the annotated type or method.
 *
 * <p>This annotation captures how a component should be tested, including
 * the testing level and key scenarios. Documentation tooling can use this
 * to generate test coverage reports and identify gaps.</p>
 *
 * <pre>{@code
 * @DocTestStrategy(value = "integration",
 *                  scenarios = {"happy path with valid input",
 *                               "invalid input returns 400",
 *                               "concurrent access is safe"})
 * public class PaymentService { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocTestStrategy {

    /**
     * The testing strategy or level.
     *
     * <p>Common values include {@code "unit"}, {@code "integration"},
     * {@code "e2e"}, and {@code "property-based"}.</p>
     *
     * @return the test strategy identifier
     */
    String value();

    /**
     * Key test scenarios that should be covered.
     *
     * @return an array of scenario descriptions
     */
    String[] scenarios() default {};
}
