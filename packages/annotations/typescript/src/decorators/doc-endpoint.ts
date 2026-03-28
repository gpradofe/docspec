// @docspec:module {
//   id: "docspec-ts-decorator-endpoint",
//   name: "@DocEndpoint Decorator",
//   description: "Defines the @DocEndpoint method decorator for annotating HTTP endpoint handlers with their method (GET/POST/PUT/DELETE/PATCH) and path. Used when the framework does not provide its own routing decorators.",
//   since: "3.0.0"
// }

import { setMetadata } from "../metadata.js";

export interface DocEndpointOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path?: string;
  description?: string;
}

/** @docspec:deterministic */
export function DocEndpoint(options: DocEndpointOptions = {}): MethodDecorator {
  return (target, propertyKey) => {
    setMetadata("endpoint", options, target, propertyKey);
  };
}
