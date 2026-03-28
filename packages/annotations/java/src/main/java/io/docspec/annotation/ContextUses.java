package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares a cross-project usage link within a {@link DocContext}.
 *
 * <p>This annotation has an empty {@link Target} and is designed exclusively
 * for use as a nested annotation inside {@link DocContext#uses()}.</p>
 *
 * <pre>{@code
 * @ContextUses(
 *     artifact = "com.example:llm-client",
 *     what = "OpenAIClient",
 *     why = "Used for LLM inference during curriculum generation"
 * )
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({})
public @interface ContextUses {

    /**
     * Maven-style coordinates or identifier of the referenced artifact.
     *
     * @return the artifact identifier, must not be empty
     */
    String artifact();

    /**
     * Name of the specific component, class, or resource being used from
     * the artifact.
     *
     * @return the component name, must not be empty
     */
    String what();

    /**
     * Prose explanation of why this dependency exists.
     *
     * @return the rationale
     */
    String why() default "";
}
