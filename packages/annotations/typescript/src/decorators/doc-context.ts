// @docspec:module {
//   id: "docspec-ts-decorator-context",
//   name: "@DocContext / @ContextInput / @ContextUses Decorators",
//   description: "Defines decorators for documenting bounded contexts (@DocContext), context data inputs (@ContextInput), and cross-artifact dependencies (@ContextUses). Used in Tier 2 to describe how classes participate in domain-driven design contexts.",
//   since: "3.0.0"
// }

import { setMetadata } from "../metadata.js";

export interface DocContextOptions {
  id: string;
  name?: string;
  attachedTo?: string;
  flow?: string;
}

/** @docspec:deterministic */
export function DocContext(options: DocContextOptions): ClassDecorator {
  return (target) => {
    setMetadata("context", options, target);
  };
}

export interface ContextInputOptions {
  name: string;
  source?: string;
  description?: string;
  items?: string[];
}

/** @docspec:deterministic */
export function ContextInput(options: ContextInputOptions): PropertyDecorator {
  return (target, propertyKey) => {
    setMetadata("contextInput", options, target, propertyKey);
  };
}

export interface ContextUsesOptions {
  artifact: string;
  what: string;
  why?: string;
}

/** @docspec:deterministic */
export function ContextUses(options: ContextUsesOptions): PropertyDecorator {
  return (target, propertyKey) => {
    setMetadata("contextUses", options, target, propertyKey);
  };
}
