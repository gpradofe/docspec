package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks a gRPC service or method. Use this annotation to document gRPC service implementations and their individual RPC methods. Documentation tooling can use this metadata to generate gRPC API references alongside REST and other protocol documentation.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocGRPC {

    @DocMethod("The gRPC service name")
    String service() default "";

    @DocMethod("The gRPC method name")
    String method() default "";
}
