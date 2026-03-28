package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares the intended audience visibility level for the annotated element.
 *
 * <p>Documentation processors use this annotation to partition API
 * documentation into tiers. Supported values are:</p>
 * <ul>
 *   <li>{@code "public"} — visible to all external consumers</li>
 *   <li>{@code "partner"} — visible only to partner integrations</li>
 *   <li>{@code "internal"} — visible only within the organization</li>
 * </ul>
 *
 * <pre>{@code
 * @DocAudience("partner")
 * public class PartnerOnboardingService { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD, ElementType.FIELD, ElementType.CONSTRUCTOR, ElementType.PACKAGE})
public @interface DocAudience {

    /**
     * The audience level for this element.
     *
     * <p>Must be one of {@code "public"}, {@code "partner"}, or
     * {@code "internal"}.</p>
     *
     * @return the audience level
     */
    String value();
}
