package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks a field as containing Personally Identifiable Information (PII). This annotation signals to documentation tooling, logging frameworks, and data governance systems that the annotated field contains sensitive personal data requiring special handling under privacy regulations such as GDPR, CCPA, or HIPAA.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.FIELD})
public @interface DocPII {

    @DocMethod("The type of PII contained in this field, such as email, phone, name, address, ssn, dob, ip, financial, health, biometric, or other")
    String value();

    @DocMethod("The retention policy governing how long this data may be stored")
    String retention() default "";

    @DocMethod("The GDPR legal basis for processing this personal data, such as consent, contract, legal-obligation, vital-interest, public-task, or legitimate-interest")
    String gdprBasis() default "";

    @DocMethod("Whether this field is stored in encrypted form")
    boolean encrypted() default false;

    @DocMethod("Whether this field must never appear in log output")
    boolean neverLog() default false;

    @DocMethod("Whether this field must never be returned in API responses")
    boolean neverReturn() default false;
}
