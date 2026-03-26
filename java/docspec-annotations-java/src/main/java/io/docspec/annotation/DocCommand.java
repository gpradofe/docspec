package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents a command in a CQRS (Command Query Responsibility Segregation)
 * architecture.
 *
 * <p>Commands represent write operations that change state. This annotation
 * captures the command name and the aggregate it targets, enabling
 * documentation tooling to generate command catalogs and aggregate
 * diagrams.</p>
 *
 * <pre>{@code
 * @DocCommand(value = "PlaceOrder", aggregate = "Order")
 * public void handle(PlaceOrderCommand command) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocCommand {

    /**
     * The command name.
     *
     * @return the name of the command
     */
    String value();

    /**
     * The target aggregate that this command modifies.
     *
     * @return the aggregate name, or empty if not applicable
     */
    String aggregate() default "";
}
