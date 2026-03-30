package io.docspec.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a method as deterministic — the same inputs always produce the
 * same outputs.
 *
 * <p>A deterministic method has no dependency on external state, randomness,
 * or timing. This property enables caching, memoization, and formal
 * verification.</p>
 *
 * <pre>{@code
 * @DocDeterministic
 * public int calculateHash(byte[] data) { ... }
 * }</pre>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD})
public @interface DocDeterministic {
    /** Optional description of what makes this method deterministic. */
    String value() default "";
}
