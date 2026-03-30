package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents a thrown exception. Used inside {@link DocMethod#throwsDoc()}.
 *
 * <p>Replaces the {@code @throws} tag in JavaDoc comments.</p>
 *
 * <pre>{@code
 * @DocMethod(throwsDoc = {
 *     @ThrowsDoc(type = "IllegalArgumentException", value = "If goalId is null or empty"),
 *     @ThrowsDoc(type = "GoalNotFoundException", value = "If no goal exists with the given ID")
 * })
 * public Curriculum generate(String goalId) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({})  // Only used inside @DocMethod.throwsDoc
public @interface ThrowsDoc {

    /** Fully qualified or simple name of the exception type. */
    String type();

    /** Description of when this exception is thrown. */
    String value();
}
