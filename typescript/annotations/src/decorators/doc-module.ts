/**
 * @docspec:module id="docspec-ts-decorator-module" name="@DocModule Decorator"
 * @docspec:description "Defines the @DocModule class decorator, used to group related
 *   classes into a named documentation module. When a class is decorated with
 *   @DocModule, the processor assigns it to the specified module instead of
 *   inferring module membership from the file path. This is the primary Tier 1
 *   annotation — the first decorator most users add beyond zero-config auto-discovery."
 * @docspec:boundary "decorator definition"
 * @docspec:since "3.0.0"
 */

import { setMetadata } from "../metadata.js";

export interface DocModuleOptions {
  name?: string;
  description?: string;
  since?: string;
  audience?: string;
}

export function DocModule(options: DocModuleOptions = {}): ClassDecorator {
  return (target) => {
    setMetadata("module", options, target);
  };
}
