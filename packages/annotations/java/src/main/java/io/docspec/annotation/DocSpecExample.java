package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a test method as a verified, executable example that should be
 * attached to a specific documented element.
 *
 * <p>Unlike {@link DocExample}, which embeds code snippets as strings, this
 * annotation designates an actual test method whose source code is extracted
 * at build time and attached to the referenced element. Because the example
 * is a real test, it is guaranteed to compile and pass.</p>
 *
 * <pre>{@code
 * @Test
 * @DocSpecExample(
 *     attachTo = "io.docspec.sample.CurriculaService#generate",
 *     title = "Generate a curriculum from a job description"
 * )
 * void testGenerateCurriculum() {
 *     Curriculum result = service.generate(new GenerateRequest("Software Engineer"));
 *     assertNotNull(result);
 * }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface DocSpecExample {

    /**
     * Fully qualified reference to the documented element that this example
     * should be attached to.
     *
     * <p>The format is typically {@code "fully.qualified.ClassName#methodName"}
     * or {@code "fully.qualified.ClassName"} for type-level examples.</p>
     *
     * @return the target element reference, must not be empty
     */
    String attachTo();

    /**
     * Display title for the example.
     *
     * @return the example title
     */
    String title() default "";
}
