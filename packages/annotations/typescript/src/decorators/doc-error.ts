// @docspec:module {
//   id: "docspec-ts-decorator-error",
//   name: "@DocError Decorator",
//   description: "Defines the @DocError method decorator for documenting error codes, HTTP status codes, causes, and resolution steps. Multiple @DocError decorators can be stacked on a single method to catalog all possible error responses.",
//   since: "3.0.0"
// }

import { appendMetadata } from "../metadata.js";

export interface DocErrorOptions {
  code: string;
  httpStatus?: number;
  description?: string;
  causes?: string[];
  resolution?: string;
}

/** @docspec:deterministic */
export function DocError(options: DocErrorOptions): MethodDecorator {
  return (target, propertyKey) => {
    appendMetadata("errors", options, target, propertyKey);
  };
}
