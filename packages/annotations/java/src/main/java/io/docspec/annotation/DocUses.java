package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares a cross-project or cross-module reference from the annotated
 * element to an artifact, flow, step, or member in another project.
 *
 * <p>This annotation is {@link Repeatable}, allowing multiple cross-project
 * references on the same element. Documentation tooling can use these
 * references to build dependency graphs and cross-link documentation
 * across repositories.</p>
 *
 * <pre>{@code
 * @DocUses(
 *     artifact = "com.example:auth-service",
 *     flow = "token-validation",
 *     step = "verify",
 *     description = "Validates the bearer token before processing the request."
 * )
 * public Response handleRequest(Request request) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
@Repeatable(DocUsesAll.class)
public @interface DocUses {

    /**
     * Maven-style coordinates or identifier of the referenced artifact.
     *
     * @return the artifact identifier, must not be empty
     */
    String artifact();

    /**
     * Identifier of the referenced flow within the artifact.
     *
     * @return the flow id, or empty if not referencing a specific flow
     */
    String flow() default "";

    /**
     * Identifier of the referenced step within the flow.
     *
     * @return the step id, or empty if not referencing a specific step
     */
    String step() default "";

    /**
     * Name of the referenced member (method, field, class) within the artifact.
     *
     * @return the member name, or empty if not referencing a specific member
     */
    String member() default "";

    /**
     * Prose description of why this reference exists and how the dependency
     * is used.
     *
     * @return the usage description
     */
    String description() default "";
}
