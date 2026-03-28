package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents an error code on the annotated type, providing structured
 * information for API consumers to understand and handle failures.
 *
 * <p>Each annotated type represents a distinct error condition with its own
 * code, HTTP status, description, possible causes, and resolution guidance.</p>
 *
 * <pre>{@code
 * @DocError(
 *     code = "CURR_001",
 *     httpStatus = 422,
 *     description = "The job description is too short to generate a curriculum.",
 *     causes = {"Input text has fewer than 50 characters", "Input text is blank after trimming"},
 *     resolution = "Provide a job description with at least 50 characters.",
 *     since = "1.0"
 * )
 * public class JobDescriptionTooShortException extends ApiException { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DocError {

    /**
     * Application-specific error code.
     *
     * @return the error code, must not be empty
     */
    String code();

    /**
     * HTTP status code associated with this error.
     *
     * <p>A value of {@code -1} (the default) indicates that no specific HTTP
     * status is associated.</p>
     *
     * @return the HTTP status code, or {@code -1} if not applicable
     */
    int httpStatus() default -1;

    /**
     * Human-readable description of the error condition.
     *
     * @return the error description
     */
    String description() default "";

    /**
     * Possible root causes that may lead to this error.
     *
     * @return the array of cause descriptions
     */
    String[] causes() default {};

    /**
     * Guidance for the API consumer on how to resolve or avoid this error.
     *
     * @return the resolution text
     */
    String resolution() default "";

    /**
     * Version in which this error code was first introduced.
     *
     * @return the version string
     */
    String since() default "";
}
