package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a gRPC service or method.
 *
 * <p>Use this annotation to document gRPC service implementations and
 * their individual RPC methods. Documentation tooling can use this
 * metadata to generate gRPC API references alongside REST and other
 * protocol documentation.</p>
 *
 * <pre>{@code
 * @DocGRPC(service = "PaymentService", method = "ProcessPayment")
 * public void processPayment(ProcessPaymentRequest request,
 *                            StreamObserver<ProcessPaymentResponse> responseObserver) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocGRPC {

    /**
     * The gRPC service name.
     *
     * @return the service name, or empty to infer from the class name
     */
    String service() default "";

    /**
     * The gRPC method name.
     *
     * @return the method name, or empty to infer from the Java method name
     */
    String method() default "";
}
