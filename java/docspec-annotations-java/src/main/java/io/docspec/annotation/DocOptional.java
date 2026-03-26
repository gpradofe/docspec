package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marker annotation that declares a method parameter as optional.
 *
 * <p>Documentation processors use this annotation to distinguish required
 * parameters from optional ones when generating API references. The actual
 * default value semantics are determined by the implementing method.</p>
 *
 * <pre>{@code
 * public List<Curriculum> search(
 *         String query,
 *         @DocOptional int page,
 *         @DocOptional int size) {
 *     ...
 * }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.PARAMETER)
public @interface DocOptional {
}
