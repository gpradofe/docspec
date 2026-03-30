package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents a command in a CQRS (Command Query Responsibility Segregation) architecture. Commands represent write operations that change state. This annotation captures the command name and the aggregate it targets, enabling documentation tooling to generate command catalogs and aggregate diagrams.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocCommand {

    @DocMethod("The command name")
    String value();

    @DocMethod("The target aggregate that this command modifies")
    String aggregate() default "";
}
