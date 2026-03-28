package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents a state machine on the annotated type.
 *
 * <p>Use this annotation to describe the valid states, initial state, and
 * allowed transitions for an entity or service that follows a state machine
 * pattern. Documentation tooling can render state diagrams from this
 * metadata.</p>
 *
 * <pre>{@code
 * @DocStateMachine(
 *     states = {"DRAFT", "PENDING", "APPROVED", "REJECTED"},
 *     initial = "DRAFT",
 *     transitions = {"DRAFT -> PENDING", "PENDING -> APPROVED", "PENDING -> REJECTED"}
 * )
 * public class DocumentWorkflow { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE})
public @interface DocStateMachine {

    /**
     * The set of valid states in the state machine.
     *
     * @return an array of state names
     */
    String[] states();

    /**
     * The initial state when the state machine is created.
     *
     * @return the initial state name, or empty if unspecified
     */
    String initial() default "";

    /**
     * The allowed transitions expressed in {@code "FROM -> TO"} format.
     *
     * @return an array of transition expressions
     */
    String[] transitions() default {};
}
