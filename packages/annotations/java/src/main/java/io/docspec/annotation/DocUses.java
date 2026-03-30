package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Declares a cross-project or cross-module reference from the annotated element to an artifact, flow, step, or member in another project. This annotation is Repeatable, allowing multiple cross-project references on the same element. Documentation tooling can use these references to build dependency graphs and cross-link documentation across repositories.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
@Repeatable(DocUsesAll.class)
public @interface DocUses {

    @DocMethod("Maven-style coordinates or identifier of the referenced artifact")
    String artifact();

    @DocMethod("Identifier of the referenced flow within the artifact")
    String flow() default "";

    @DocMethod("Identifier of the referenced step within the flow")
    String step() default "";

    @DocMethod("Name of the referenced member (method, field, class) within the artifact")
    String member() default "";

    @DocMethod("Prose description of why this reference exists and how the dependency is used")
    String description() default "";
}
