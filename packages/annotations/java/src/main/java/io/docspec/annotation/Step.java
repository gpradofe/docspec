package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Describes a single step within a {@link DocFlow}.
 *
 * <p>This annotation has an empty {@link Target} and is designed exclusively
 * for use as a nested annotation inside {@link DocFlow#steps()}.</p>
 *
 * <p>Supported {@link #type()} values are:</p>
 * <ul>
 *   <li>{@code "process"} — general processing step (default)</li>
 *   <li>{@code "ai"} — step involving an AI/LLM call</li>
 *   <li>{@code "storage"} — data persistence step</li>
 *   <li>{@code "trigger"} — event trigger step</li>
 *   <li>{@code "retry"} — retry/compensation step</li>
 *   <li>{@code "external"} — call to an external system</li>
 *   <li>{@code "bridge"} — integration bridge between systems</li>
 *   <li>{@code "observability"} — logging, metrics, or tracing step</li>
 * </ul>
 *
 * <pre>{@code
 * @Step(
 *     id = "generate",
 *     name = "Generate via LLM",
 *     actor = "OpenAI",
 *     actorQualified = "com.openai.Client",
 *     description = "Sends the parsed input to the LLM for curriculum generation.",
 *     type = "ai",
 *     ai = true,
 *     inputs = {"parsedInput"},
 *     outputs = {"rawCurriculum"}
 * )
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({})
public @interface Step {

    /**
     * Unique identifier for this step within its flow.
     *
     * @return the step identifier, must not be empty
     */
    String id();

    /**
     * Human-readable display name for the step.
     *
     * @return the step name, or empty string to derive from {@link #id()}
     */
    String name() default "";

    /**
     * Short name of the actor (system, service, or role) responsible for
     * executing this step.
     *
     * @return the actor name
     */
    String actor() default "";

    /**
     * Fully qualified name of the actor, such as a class or service identifier.
     *
     * @return the qualified actor name
     */
    String actorQualified() default "";

    /**
     * Prose description of what this step does.
     *
     * @return the step description
     */
    String description() default "";

    /**
     * The type of this step, indicating its role in the flow.
     *
     * <p>Must be one of: {@code "process"}, {@code "ai"}, {@code "storage"},
     * {@code "trigger"}, {@code "retry"}, {@code "external"}, {@code "bridge"},
     * or {@code "observability"}.</p>
     *
     * @return the step type, defaults to {@code "process"}
     */
    String type() default "process";

    /**
     * Whether this step involves an AI or LLM invocation.
     *
     * @return {@code true} if the step uses AI, {@code false} otherwise
     */
    boolean ai() default false;

    /**
     * Identifier of the step to retry or fall back to on failure.
     *
     * @return the retry target step id, or empty if no retry is configured
     */
    String retryTarget() default "";

    /**
     * Names or identifiers of the data inputs consumed by this step.
     *
     * @return the array of input names
     */
    String[] inputs() default {};

    /**
     * Names or identifiers of the data outputs produced by this step.
     *
     * @return the array of output names
     */
    String[] outputs() default {};
}
