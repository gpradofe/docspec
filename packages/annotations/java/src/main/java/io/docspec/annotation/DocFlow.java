package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Defines a multi-step documentation flow on the annotated type. A flow describes a sequence of Steps that together represent a business process, pipeline, or workflow. Documentation tooling can render flows as diagrams, step-by-step guides, or interactive walkthroughs.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DocFlow {

    @DocMethod("Unique identifier for this flow")
    String id();

    @DocMethod("Human-readable display name for the flow")
    String name() default "";

    @DocMethod("Prose description of what the flow accomplishes")
    String description() default "";

    @DocMethod("Description of the event or condition that initiates this flow")
    String trigger() default "";

    @DocMethod("Ordered sequence of steps that compose this flow")
    Step[] steps();
}
