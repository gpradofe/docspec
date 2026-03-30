package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Documents a method — replaces JavaDoc {@code /** * /} comments.
 *
 * <p>The {@code value} serves as the method description and is used by both
 * DocSpec (for structured documentation) and by the {@code docspec:inject-sources}
 * goal to generate standard JavaDoc comments for IDE hover and Maven JavaDoc.</p>
 *
 * <pre>{@code
 * @DocMethod(value = "Runs all 13 intent channels on every public method",
 *            returns = "Populates model.intentGraph with extracted signals",
 *            params = {
 *                @Param(name = "typeElement", value = "The class/interface to analyze"),
 *                @Param(name = "env", value = "Annotation processing environment"),
 *                @Param(name = "model", value = "Output model to populate with intent signals")
 *            },
 *            throwsDoc = {
 *                @ThrowsDoc(type = "NullPointerException", value = "If typeElement is null")
 *            })
 * public void extract(TypeElement typeElement, ProcessingEnvironment env, DocSpecModel model) {
 * }</pre>
 *
 * <p>Short form for simple methods:</p>
 * <pre>{@code
 * @DocMethod("Checks if DSTI extraction is enabled")
 * public boolean isAvailable(ProcessingEnvironment env) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface DocMethod {

    /**
     * Description of what this method does. This replaces the first line
     * of a JavaDoc comment.
     */
    String value() default "";

    /**
     * Description of the return value. Replaces {@code @return} in JavaDoc.
     */
    String returns() default "";

    /**
     * Structured parameter documentation. Replaces {@code @param} tags in JavaDoc.
     */
    Param[] params() default {};

    /**
     * Structured throws documentation. Replaces {@code @throws} tags in JavaDoc.
     */
    ThrowsDoc[] throwsDoc() default {};

    /**
     * Version in which this method was first introduced.
     */
    String since() default "";

    /**
     * Deprecation notice. Empty means not deprecated.
     */
    String deprecated() default "";

    /**
     * Code example showing usage of this method.
     */
    String example() default "";
}
