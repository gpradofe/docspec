// @docspec:module {
//   id: "docspec-ts-decorator-event",
//   name: "@DocEvent Decorator",
//   description: "Defines the @DocEvent method decorator for documenting domain events emitted by a method, including trigger conditions, channel names, and delivery guarantees. Multiple @DocEvent decorators can be stacked.",
//   since: "3.0.0"
// }

import { appendMetadata } from "../metadata.js";

export interface DocEventOptions {
  name: string;
  description?: string;
  trigger?: string;
  channel?: string;
  deliveryGuarantee?: string;
}

/** @docspec:deterministic */
export function DocEvent(options: DocEventOptions): MethodDecorator {
  return (target, propertyKey) => {
    appendMetadata("events", options, target, propertyKey);
  };
}
