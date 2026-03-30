package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks a WebSocket endpoint. Use this annotation to document WebSocket endpoints and the message types they handle. Documentation tooling can use this metadata to generate WebSocket API references.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocWebSocket {

    @DocMethod("The WebSocket endpoint path")
    String path() default "";

    @DocMethod("The message types handled by this WebSocket endpoint")
    String[] messages() default {};
}
