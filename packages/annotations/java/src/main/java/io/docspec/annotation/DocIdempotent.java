package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a method as idempotent.
 *
 * <p>An idempotent method produces the same result whether it is called
 * once or multiple times with the same arguments. This is a critical
 * property for retry safety, distributed systems, and API design.</p>
 *
 * <pre>{@code
 * @DocIdempotent
 * public void setAccountStatus(String accountId, Status status) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocIdempotent {
    /** Optional description of the idempotency guarantee. */
    String value() default "";
}
