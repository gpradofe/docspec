package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares a conservation law — a quantity that is preserved through a
 * transformation.
 *
 * <p>Conservation laws are fundamental semantic properties stating that
 * certain quantities remain constant before and after an operation.
 * For example, a fund transfer must conserve the total balance across
 * all accounts.</p>
 *
 * <pre>{@code
 * @DocConservation("Total balance across all accounts remains constant")
 * public void transfer(Account from, Account to, BigDecimal amount) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocConservation {

    /**
     * A description of the conservation law that holds for this method.
     *
     * @return the conservation description
     */
    String value();
}
