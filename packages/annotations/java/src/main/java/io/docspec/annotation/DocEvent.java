package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents a webhook or event that the annotated type or method produces
 * or handles.
 *
 * <p>This annotation captures the full contract of an event, including its
 * delivery semantics, retry behavior, and the conditions under which it
 * fires.</p>
 *
 * <pre>{@code
 * @DocEvent(
 *     name = "curriculum.generated",
 *     description = "Fired when a curriculum has been successfully generated.",
 *     trigger = "Successful completion of the generation flow",
 *     channel = "webhooks",
 *     deliveryGuarantee = "at-least-once",
 *     retryPolicy = "Exponential backoff, max 5 retries over 24 hours",
 *     since = "1.0"
 * )
 * public class CurriculumGeneratedEvent { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocEvent {

    /**
     * Canonical name of the event, typically in dot-separated format.
     *
     * @return the event name, must not be empty
     */
    String name();

    /**
     * Human-readable description of what this event represents.
     *
     * @return the event description
     */
    String description() default "";

    /**
     * Description of the condition or action that causes this event to fire.
     *
     * @return the trigger description
     */
    String trigger() default "";

    /**
     * The delivery channel or transport mechanism for this event, such as
     * {@code "webhooks"}, {@code "sns"}, or {@code "kafka"}.
     *
     * @return the channel name
     */
    String channel() default "";

    /**
     * Delivery guarantee semantics, such as {@code "at-most-once"},
     * {@code "at-least-once"}, or {@code "exactly-once"}.
     *
     * @return the delivery guarantee
     */
    String deliveryGuarantee() default "";

    /**
     * Description of the retry policy applied when delivery fails.
     *
     * @return the retry policy description
     */
    String retryPolicy() default "";

    /**
     * Version in which this event was first introduced.
     *
     * @return the version string
     */
    String since() default "";
}
