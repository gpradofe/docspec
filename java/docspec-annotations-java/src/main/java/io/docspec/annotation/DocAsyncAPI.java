package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a class that implements an AsyncAPI specification.
 *
 * <p>AsyncAPI describes event-driven architectures with channels, messages,
 * and operations. This annotation captures the channel and operation type,
 * enabling documentation tooling to generate AsyncAPI-compatible references
 * and message catalogs.</p>
 *
 * <pre>{@code
 * @DocAsyncAPI(channel = "orders/created", operation = "subscribe")
 * public class OrderCreatedListener { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE})
public @interface DocAsyncAPI {

    /**
     * The AsyncAPI channel name.
     *
     * @return the channel name, e.g. {@code "orders/created"}
     */
    String channel();

    /**
     * The operation type on this channel.
     *
     * <p>Common values are {@code "publish"} and {@code "subscribe"}.</p>
     *
     * @return the operation type, or empty if not specified
     */
    String operation() default "";
}
