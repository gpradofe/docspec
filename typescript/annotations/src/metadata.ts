/**
 * @docspec:module id="docspec-ts-metadata" name="DocSpec Metadata Store"
 * @docspec:description "Low-level metadata storage layer using Reflect.defineMetadata.
 *   All DocSpec decorators delegate to setMetadata / appendMetadata to attach
 *   structured documentation data to class and method targets at decoration time.
 *   The processor reads this metadata back via getMetadata during extraction."
 * @docspec:boundary "metadata storage"
 * @docspec:since "3.0.0"
 * @docspec:tags ["self-documented", "metadata", "reflect-metadata"]
 */

import "reflect-metadata";

const DOCSPEC_PREFIX = "docspec:";

export function setMetadata(key: string, value: unknown, target: object, propertyKey?: string | symbol): void {
  const fullKey = DOCSPEC_PREFIX + key;
  if (propertyKey) {
    Reflect.defineMetadata(fullKey, value, target, propertyKey);
  } else {
    Reflect.defineMetadata(fullKey, value, target);
  }
}

export function getMetadata<T>(key: string, target: object, propertyKey?: string | symbol): T | undefined {
  const fullKey = DOCSPEC_PREFIX + key;
  if (propertyKey) {
    return Reflect.getMetadata(fullKey, target, propertyKey) as T | undefined;
  }
  return Reflect.getMetadata(fullKey, target) as T | undefined;
}

export function appendMetadata<T>(key: string, value: T, target: object, propertyKey?: string | symbol): void {
  const existing = getMetadata<T[]>(key, target, propertyKey) ?? [];
  existing.push(value);
  setMetadata(key, existing, target, propertyKey);
}
