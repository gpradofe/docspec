package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a WebSocket endpoint.
 *
 * <p>Use this annotation to document WebSocket endpoints and the message
 * types they handle. Documentation tooling can use this metadata to
 * generate WebSocket API references.</p>
 *
 * <pre>{@code
 * @DocWebSocket(path = "/ws/notifications",
 *               messages = {"SubscribeMessage", "UnsubscribeMessage", "PingMessage"})
 * public class NotificationWebSocket { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocWebSocket {

    /**
     * The WebSocket endpoint path.
     *
     * @return the path, e.g. {@code "/ws/notifications"}
     */
    String path() default "";

    /**
     * The message types handled by this WebSocket endpoint.
     *
     * @return an array of message type names
     */
    String[] messages() default {};
}
