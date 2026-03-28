// @docspec:module {
//   id: "docspec-ts-decorator-method",
//   name: "@DocMethod / @DocField Decorators",
//   description: "Defines the @DocMethod method decorator and @DocField property decorator for adding explicit documentation metadata (name, description, since, tags) to individual class members.",
//   since: "3.0.0"
// }

import { setMetadata, appendMetadata } from "../metadata.js";

export interface DocMethodOptions {
  name?: string;
  description?: string;
  since?: string;
  deprecated?: string;
  tags?: string[];
}

/** @docspec:deterministic */
export function DocMethod(options: DocMethodOptions = {}): MethodDecorator {
  return (target, propertyKey) => {
    setMetadata("method", options, target, propertyKey);
  };
}

export interface DocFieldOptions {
  name?: string;
  description?: string;
  since?: string;
  type?: string;
}

/** @docspec:deterministic */
export function DocField(options: DocFieldOptions = {}): PropertyDecorator {
  return (target, propertyKey) => {
    setMetadata("field", options, target, propertyKey);
  };
}
