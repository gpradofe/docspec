package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents a method parameter. Used inside {@link DocMethod#params()}.
 *
 * <p>Replaces the {@code @param} tag in JavaDoc comments.</p>
 *
 * <pre>{@code
 * @DocMethod(params = {
 *     @Param(name = "goalId", value = "The goal to generate a curriculum for"),
 *     @Param(name = "options", value = "Generation options including difficulty and weekly hours")
 * })
 * public Curriculum generate(String goalId, GenerateOptions options) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({})  // Only used inside @DocMethod.params
public @interface Param {

    /** Parameter name — must match the actual Java parameter name. */
    String name();

    /** Description of the parameter. */
    String value();
}
