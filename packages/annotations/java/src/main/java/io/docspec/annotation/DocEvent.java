package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents a webhook or event that the annotated type or method produces or handles. This annotation captures the full contract of an event, including its delivery semantics, retry behavior, and the conditions under which it fires.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocEvent {

    @DocMethod("Canonical name of the event, typically in dot-separated format")
    String name();

    @DocMethod("Human-readable description of what this event represents")
    String description() default "";

    @DocMethod("Description of the condition or action that causes this event to fire")
    String trigger() default "";

    @DocMethod("The delivery channel or transport mechanism for this event, such as webhooks, sns, or kafka")
    String channel() default "";

    @DocMethod("Delivery guarantee semantics, such as at-most-once, at-least-once, or exactly-once")
    String deliveryGuarantee() default "";

    @DocMethod("Description of the retry policy applied when delivery fails")
    String retryPolicy() default "";

    @DocMethod("Version in which this event was first introduced")
    String since() default "";
}
