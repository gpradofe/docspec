package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents performance characteristics of the annotated method. Use this annotation to capture expected latency targets, known bottlenecks, and other performance-related metadata. This information helps API consumers set appropriate timeouts and understand service level expectations.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocPerformance {

    @DocMethod("The expected latency for this method")
    String expectedLatency() default "";

    @DocMethod("A known performance bottleneck in this method")
    String bottleneck() default "";
}
