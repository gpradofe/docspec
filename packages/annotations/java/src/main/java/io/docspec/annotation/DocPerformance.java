package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents performance characteristics of the annotated method.
 *
 * <p>Use this annotation to capture expected latency targets, known
 * bottlenecks, and other performance-related metadata. This information
 * helps API consumers set appropriate timeouts and understand service
 * level expectations.</p>
 *
 * <pre>{@code
 * @DocPerformance(expectedLatency = "< 6s at p99",
 *                 bottleneck = "External payment gateway call")
 * public PaymentResult processPayment(PaymentRequest request) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocPerformance {

    /**
     * The expected latency for this method.
     *
     * @return a latency description, e.g. {@code "< 6s at p99"}
     */
    String expectedLatency() default "";

    /**
     * A known performance bottleneck in this method.
     *
     * @return a description of the bottleneck, or empty if none known
     */
    String bottleneck() default "";
}
