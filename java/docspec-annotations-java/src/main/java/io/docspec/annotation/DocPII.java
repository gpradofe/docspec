package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a field as containing Personally Identifiable Information (PII).
 *
 * <p>This annotation signals to documentation tooling, logging frameworks, and
 * data governance systems that the annotated field contains sensitive personal
 * data requiring special handling under privacy regulations such as GDPR,
 * CCPA, or HIPAA.</p>
 *
 * <pre>{@code
 * @DocPII(value = "email", retention = "90 days", gdprBasis = "consent",
 *         encrypted = true, neverLog = true)
 * private String emailAddress;
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD})
public @interface DocPII {

    /**
     * The type of PII contained in this field.
     *
     * <p>Common values include {@code "email"}, {@code "phone"}, {@code "name"},
     * {@code "address"}, {@code "ssn"}, {@code "dob"}, {@code "ip"},
     * {@code "financial"}, {@code "health"}, {@code "biometric"}, and
     * {@code "other"}.</p>
     *
     * @return the PII type identifier
     */
    String value();

    /**
     * The retention policy governing how long this data may be stored.
     *
     * @return the retention policy description, e.g. {@code "90 days"}
     */
    String retention() default "";

    /**
     * The GDPR legal basis for processing this personal data.
     *
     * <p>Common values include {@code "consent"}, {@code "contract"},
     * {@code "legal-obligation"}, {@code "vital-interest"},
     * {@code "public-task"}, and {@code "legitimate-interest"}.</p>
     *
     * @return the GDPR legal basis, or empty if not applicable
     */
    String gdprBasis() default "";

    /**
     * Whether this field is stored in encrypted form.
     *
     * @return {@code true} if the field value is encrypted at rest
     */
    boolean encrypted() default false;

    /**
     * Whether this field must never appear in log output.
     *
     * @return {@code true} if the field must be excluded from all logging
     */
    boolean neverLog() default false;

    /**
     * Whether this field must never be returned in API responses.
     *
     * @return {@code true} if the field must be excluded from all responses
     */
    boolean neverReturn() default false;
}
