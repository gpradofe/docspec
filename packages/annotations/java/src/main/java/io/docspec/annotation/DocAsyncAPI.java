package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks a class that implements an AsyncAPI specification. AsyncAPI describes event-driven architectures with channels, messages, and operations. This annotation captures the channel and operation type, enabling documentation tooling to generate AsyncAPI-compatible references and message catalogs.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE})
public @interface DocAsyncAPI {

    @DocMethod("The AsyncAPI channel name")
    String channel();

    @DocMethod("The operation type on this channel, such as publish or subscribe")
    String operation() default "";
}
