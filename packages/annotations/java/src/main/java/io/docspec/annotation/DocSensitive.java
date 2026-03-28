package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks sensitive data that should not be logged or returned in API responses.
 *
 * <p>Unlike {@link DocPII}, which specifically identifies personally identifiable
 * information, this annotation covers any data that is sensitive for security,
 * compliance, or business reasons — such as API keys, internal identifiers,
 * or trade secrets.</p>
 *
 * <pre>{@code
 * @DocSensitive(reason = "Contains internal routing token")
 * private String routingToken;
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD, ElementType.METHOD})
public @interface DocSensitive {

    /**
     * The reason this data is considered sensitive.
     *
     * @return a human-readable explanation of why this data is sensitive
     */
    String reason() default "";
}
