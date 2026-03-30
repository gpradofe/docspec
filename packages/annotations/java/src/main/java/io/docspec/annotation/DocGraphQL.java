package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks a GraphQL resolver or type. Use this annotation to document GraphQL queries, mutations, and subscriptions. Documentation tooling can use this metadata to generate GraphQL schema references alongside the rest of the API surface.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DocGraphQL {

    @DocMethod("The GraphQL type, such as Query, Mutation, or Subscription")
    String type() default "";

    @DocMethod("The GraphQL field name")
    String field() default "";
}
