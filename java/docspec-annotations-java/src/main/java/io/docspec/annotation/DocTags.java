package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Associates searchable tags with a documented type.
 *
 * <p>Tags provide a lightweight taxonomy that documentation tooling can use
 * for filtering, searching, and cross-referencing related types.</p>
 *
 * <pre>{@code
 * @DocTags({"curriculum", "generation", "ai"})
 * public class CurriculumGenerator { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DocTags {

    /**
     * One or more tags to associate with the annotated type.
     *
     * @return the array of tag strings, must contain at least one element
     */
    String[] value();
}
