package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents the runtime context for the annotated type, including its inputs,
 * associated flow, and cross-project dependencies.
 *
 * <p>A context represents the runtime environment or configuration surface
 * that a component requires to operate. Documentation tooling can use this
 * to generate configuration guides and dependency matrices.</p>
 *
 * <pre>{@code
 * @DocContext(
 *     id = "generation-context",
 *     name = "Generation Context",
 *     inputs = {
 *         @ContextInput(name = "jobDescription", source = "request.body", description = "The job description text")
 *     },
 *     flow = "curriculum-generation",
 *     uses = {
 *         @ContextUses(artifact = "com.example:llm-client", what = "OpenAIClient", why = "LLM inference")
 *     }
 * )
 * public class GenerationContext { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DocContext {

    /**
     * Unique identifier for this context.
     *
     * @return the context identifier
     */
    String id() default "";

    /**
     * Human-readable display name for the context.
     *
     * @return the context name
     */
    String name() default "";

    /**
     * Runtime inputs required by this context.
     *
     * @return the array of context inputs
     */
    ContextInput[] inputs() default {};

    /**
     * Identifier of the flow associated with this context.
     *
     * @return the flow id, or empty if not associated with a specific flow
     */
    String flow() default "";

    /**
     * Cross-project dependencies consumed by this context.
     *
     * @return the array of usage links
     */
    ContextUses[] uses() default {};
}
