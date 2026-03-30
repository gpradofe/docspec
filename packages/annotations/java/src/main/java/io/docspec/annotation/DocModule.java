package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Groups annotated types or packages into a logical documentation module. A module represents a cohesive unit of functionality within the API surface. Every type or package belonging to the same module should share the same id(), allowing documentation tooling to aggregate and present them together.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.PACKAGE})
public @interface DocModule {

    @DocMethod("Unique identifier for this module, used to group related types across packages")
    String id();

    @DocMethod("Human-readable display name for the module")
    String name() default "";

    @DocMethod("Prose description of the module's purpose and scope")
    String description() default "";

    @DocMethod("Version in which this module was first introduced")
    String since() default "";

    @DocMethod("Intended audience for this module's documentation, such as public, partner, or internal")
    String audience() default "public";
}
