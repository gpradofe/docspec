// @docspec:module {
//   id: "docspec-ts-decorator-cross-ref",
//   name: "@DocUses / @DocSpecExample Decorators",
//   description: "Defines cross-reference decorators: @DocUses links a class or method to another artifact (with optional flow/step context), and @DocSpecExample attaches a verified example to a documentation target.",
//   since: "3.0.0"
// }

import { setMetadata, appendMetadata } from "../metadata.js";

export interface DocUsesOptions {
  artifact: string;
  flow?: string;
  step?: string;
  member?: string;
  description?: string;
}

/** @docspec:deterministic */
export function DocUses(options: DocUsesOptions): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (propertyKey) appendMetadata("uses", options, target, propertyKey);
    else appendMetadata("uses", options, target);
  };
}

export interface DocSpecExampleOptions {
  attachTo: string;
  title?: string;
}

/** @docspec:deterministic */
export function DocSpecExample(options: DocSpecExampleOptions): MethodDecorator {
  return (target, propertyKey) => {
    setMetadata("specexample", options, target, propertyKey);
  };
}
