package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Describes a single runtime input within a {@link DocContext}.
 *
 * <p>This annotation has an empty {@link Target} and is designed exclusively
 * for use as a nested annotation inside {@link DocContext#inputs()}.</p>
 *
 * <pre>{@code
 * @ContextInput(
 *     name = "apiKey",
 *     source = "environment",
 *     description = "API key for the LLM provider",
 *     items = {"OPENAI_API_KEY", "ANTHROPIC_API_KEY"}
 * )
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({})
public @interface ContextInput {

    /**
     * Name of the input parameter.
     *
     * @return the input name, must not be empty
     */
    String name();

    /**
     * Origin or source of the input value, such as {@code "environment"},
     * {@code "request.body"}, or {@code "config"}.
     *
     * @return the source descriptor
     */
    String source() default "";

    /**
     * Prose description of the input's purpose and expected format.
     *
     * @return the input description
     */
    String description() default "";

    /**
     * Enumeration of specific items, keys, or variants that this input
     * accepts.
     *
     * @return the array of accepted items
     */
    String[] items() default {};
}
