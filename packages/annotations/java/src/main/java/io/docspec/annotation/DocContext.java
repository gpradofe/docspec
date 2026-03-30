package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents the runtime context for the annotated type, including its inputs, associated flow, and cross-project dependencies. A context represents the runtime environment or configuration surface that a component requires to operate. Documentation tooling can use this to generate configuration guides and dependency matrices.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DocContext {

    @DocMethod("Unique identifier for this context")
    String id() default "";

    @DocMethod("Human-readable display name for the context")
    String name() default "";

    @DocMethod("Runtime inputs required by this context")
    ContextInput[] inputs() default {};

    @DocMethod("Identifier of the flow associated with this context")
    String flow() default "";

    @DocMethod("Cross-project dependencies consumed by this context")
    ContextUses[] uses() default {};
}
