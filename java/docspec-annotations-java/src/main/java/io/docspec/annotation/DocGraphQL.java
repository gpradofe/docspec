package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a GraphQL resolver or type.
 *
 * <p>Use this annotation to document GraphQL queries, mutations, and
 * subscriptions. Documentation tooling can use this metadata to generate
 * GraphQL schema references alongside the rest of the API surface.</p>
 *
 * <pre>{@code
 * @DocGraphQL(type = "Query", field = "user")
 * public User getUser(String id) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocGraphQL {

    /**
     * The GraphQL type.
     *
     * <p>Common values are {@code "Query"}, {@code "Mutation"}, and
     * {@code "Subscription"}.</p>
     *
     * @return the GraphQL type, or empty if inferred from context
     */
    String type() default "";

    /**
     * The GraphQL field name.
     *
     * @return the field name, or empty to infer from the method name
     */
    String field() default "";
}
