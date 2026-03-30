package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Documents a state machine on the annotated type. Use this annotation to describe the valid states, initial state, and allowed transitions for an entity or service that follows a state machine pattern. Documentation tooling can render state diagrams from this metadata.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE})
public @interface DocStateMachine {

    @DocMethod("The set of valid states in the state machine")
    String[] states();

    @DocMethod("The initial state when the state machine is created")
    String initial() default "";

    @DocMethod("The allowed transitions expressed in FROM -> TO format")
    String[] transitions() default {};
}
