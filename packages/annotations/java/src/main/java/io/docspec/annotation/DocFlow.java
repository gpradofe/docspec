package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Defines a multi-step documentation flow on the annotated type.
 *
 * <p>A flow describes a sequence of {@link Step}s that together represent a
 * business process, pipeline, or workflow. Documentation tooling can render
 * flows as diagrams, step-by-step guides, or interactive walkthroughs.</p>
 *
 * <pre>{@code
 * @DocFlow(
 *     id = "curriculum-generation",
 *     name = "Curriculum Generation",
 *     description = "End-to-end flow for generating a curriculum from a job description.",
 *     trigger = "User submits a generation request",
 *     steps = {
 *         @Step(id = "parse", name = "Parse Input", type = "process"),
 *         @Step(id = "generate", name = "Generate via LLM", type = "ai", ai = true),
 *         @Step(id = "store", name = "Persist Result", type = "storage")
 *     }
 * )
 * public class CurriculumGenerationFlow { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DocFlow {

    /**
     * Unique identifier for this flow.
     *
     * @return the flow identifier, must not be empty
     */
    String id();

    /**
     * Human-readable display name for the flow.
     *
     * @return the flow name, or empty string to derive from {@link #id()}
     */
    String name() default "";

    /**
     * Prose description of what the flow accomplishes.
     *
     * @return the flow description
     */
    String description() default "";

    /**
     * Description of the event or condition that initiates this flow.
     *
     * @return the trigger description
     */
    String trigger() default "";

    /**
     * Ordered sequence of steps that compose this flow.
     *
     * @return the array of steps
     */
    Step[] steps();
}
