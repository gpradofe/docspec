package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Associates searchable tags with a documented type. Tags provide a lightweight taxonomy that documentation tooling can use for filtering, searching, and cross-referencing related types.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DocTags {

    @DocMethod("One or more tags to associate with the annotated type")
    String[] value();
}
