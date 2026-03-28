package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Maps the annotated SDK method to its underlying REST API endpoint.
 *
 * <p>This annotation enables documentation tooling to cross-reference SDK
 * methods with API endpoint documentation, providing consumers with a
 * clear mapping between the programmatic interface and the HTTP contract.</p>
 *
 * <pre>{@code
 * @DocEndpoint("POST /v1/curricula/generate")
 * public Curriculum generate(GenerateRequest request) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface DocEndpoint {

    /**
     * The HTTP method and path of the API endpoint, formatted as
     * {@code "METHOD /path"}.
     *
     * <p>Examples: {@code "GET /v1/curricula"}, {@code "POST /v1/curricula/generate"},
     * {@code "DELETE /v1/curricula/{id}"}.</p>
     *
     * @return the endpoint descriptor, must not be empty
     */
    String value();
}
