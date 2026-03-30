package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@DocBoundary("Marks a test method as a verified, executable example that should be attached to a specific documented element. Unlike DocExample, which embeds code snippets as strings, this annotation designates an actual test method whose source code is extracted at build time and attached to the referenced element. Because the example is a real test, it is guaranteed to compile and pass.")
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface DocSpecExample {

    @DocMethod("Fully qualified reference to the documented element that this example should be attached to")
    String attachTo();

    @DocMethod("Display title for the example")
    String title() default "";
}
