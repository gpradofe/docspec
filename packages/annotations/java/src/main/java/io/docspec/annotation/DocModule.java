package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Groups annotated types or packages into a logical documentation module.
 *
 * <p>A module represents a cohesive unit of functionality within the API surface.
 * Every type or package belonging to the same module should share the same
 * {@link #id()}, allowing documentation tooling to aggregate and present them
 * together.</p>
 *
 * <pre>{@code
 * @DocModule(
 *     id = "curricula",
 *     name = "Curricula Management",
 *     description = "APIs for creating, updating, and querying curricula.",
 *     since = "1.0",
 *     audience = "public"
 * )
 * public class CurriculaService { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.PACKAGE})
public @interface DocModule {

    /**
     * Unique identifier for this module. Used to group related types across
     * packages.
     *
     * @return the module identifier, must not be empty
     */
    String id();

    /**
     * Human-readable display name for the module.
     *
     * @return the module name, or empty string to derive from {@link #id()}
     */
    String name() default "";

    /**
     * Prose description of the module's purpose and scope.
     *
     * @return the module description
     */
    String description() default "";

    /**
     * Version in which this module was first introduced.
     *
     * @return the version string, e.g. {@code "1.0"} or {@code "2024-03-01"}
     */
    String since() default "";

    /**
     * Intended audience for this module's documentation.
     *
     * <p>Common values are {@code "public"}, {@code "partner"}, and
     * {@code "internal"}.</p>
     *
     * @return the audience level, defaults to {@code "public"}
     */
    String audience() default "public";
}
