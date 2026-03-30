package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Describes a single step within a DocFlow. This annotation has an empty Target and is designed exclusively for use as a nested annotation inside DocFlow#steps(). Supported type values are process, ai, storage, trigger, retry, external, bridge, and observability.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({})
public @interface Step {

    @DocMethod("Unique identifier for this step within its flow")
    String id();

    @DocMethod("Human-readable display name for the step")
    String name() default "";

    @DocMethod("Short name of the actor (system, service, or role) responsible for executing this step")
    String actor() default "";

    @DocMethod("Fully qualified name of the actor, such as a class or service identifier")
    String actorQualified() default "";

    @DocMethod("Prose description of what this step does")
    String description() default "";

    @DocMethod("The type of this step, indicating its role in the flow")
    String type() default "process";

    @DocMethod("Whether this step involves an AI or LLM invocation")
    boolean ai() default false;

    @DocMethod("Identifier of the step to retry or fall back to on failure")
    String retryTarget() default "";

    @DocMethod("Names or identifiers of the data inputs consumed by this step")
    String[] inputs() default {};

    @DocMethod("Names or identifiers of the data outputs produced by this step")
    String[] outputs() default {};
}
