package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Attaches a code example to a documented method or type.
 *
 * <p>This annotation is {@link Repeatable}, so multiple examples can be
 * attached to the same element. Each example may supply code inline via
 * {@link #code()} or reference an external file via {@link #file()}.</p>
 *
 * <pre>{@code
 * @DocExample(
 *     title = "Generate a curriculum",
 *     language = "java",
 *     code = "Curriculum c = client.curricula().generate(request);"
 * )
 * @DocExample(
 *     title = "Generate from file",
 *     file = "examples/generate-from-file.java"
 * )
 * public Curriculum generate(Request request) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
@Repeatable(DocExamples.class)
public @interface DocExample {

    /**
     * Display title for the example.
     *
     * @return the example title
     */
    String title() default "";

    /**
     * Programming language of the example code, used for syntax highlighting.
     *
     * @return the language identifier, defaults to {@code "java"}
     */
    String language() default "java";

    /**
     * Inline source code for the example.
     *
     * <p>Mutually exclusive with {@link #file()} in practice; if both are
     * provided, processor behavior is implementation-defined.</p>
     *
     * @return the example source code
     */
    String code() default "";

    /**
     * Path to an external file containing the example source code.
     *
     * <p>The path is resolved relative to the project root by documentation
     * processors.</p>
     *
     * @return the file path
     */
    String file() default "";
}
