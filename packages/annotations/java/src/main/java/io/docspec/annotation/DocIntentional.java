package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares the primary intent of the annotated method.
 *
 * <p>Intent documentation captures <em>why</em> a method exists and what it
 * is meant to achieve, as opposed to its mechanical implementation. This
 * enables tooling to verify that code behavior aligns with stated intent
 * and to detect semantic drift over time.</p>
 *
 * <pre>{@code
 * @DocIntentional(value = "Transfers funds between accounts",
 *                 preserves = {"totalBalance", "auditTrail"})
 * public void transfer(Account from, Account to, BigDecimal amount) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocIntentional {

    /**
     * A description of the method's primary intent.
     *
     * @return the intent description
     */
    String value();

    /**
     * Fields or properties that must be preserved (unchanged) through the
     * method's execution.
     *
     * @return an array of field or property names that are preserved
     */
    String[] preserves() default {};
}
