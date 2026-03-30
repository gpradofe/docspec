package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Maps the annotated SDK method to its underlying REST API endpoint. This annotation enables documentation tooling to cross-reference SDK methods with API endpoint documentation, providing consumers with a clear mapping between the programmatic interface and the HTTP contract.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface DocEndpoint {

    @DocMethod("The HTTP method and path of the API endpoint, formatted as METHOD /path")
    String value();
}
