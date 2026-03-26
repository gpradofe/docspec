// @docspec:module {
//   id: "docspec-ts-decorator-dsti",
//   name: "DSTI Semantic Decorators",
//   description: "Defines 13 DSTI (Deep Structural & Textual Intent) decorators: @DocInvariant, @DocMonotonic, @DocConservation, @DocOrdering, @DocPreserves, @DocCompare, @DocRelation, @DocBoundary, @DocStateMachine, @DocIdempotent, @DocDeterministic, and @DocIntentional. These express semantic contracts that the DSTI engine verifies against method source code.",
//   since: "3.0.0"
// }

import { setMetadata, appendMetadata } from "../metadata.js";

export interface DocInvariantOptions {
  rules: string[];
  description?: string;
}
/** @docspec:deterministic */
export function DocInvariant(options: DocInvariantOptions): MethodDecorator {
  return (target, propertyKey) => { appendMetadata("invariants", options, target, propertyKey); };
}

export interface DocMonotonicOptions {
  field: string;
  direction: "increasing" | "decreasing";
  description?: string;
}
/** @docspec:deterministic */
export function DocMonotonic(options: DocMonotonicOptions): MethodDecorator {
  return (target, propertyKey) => { setMetadata("monotonic", options, target, propertyKey); };
}

export interface DocConservationOptions {
  quantity: string;
  scope?: string;
  description?: string;
}
/** @docspec:deterministic */
export function DocConservation(options: DocConservationOptions): MethodDecorator {
  return (target, propertyKey) => { setMetadata("conservation", options, target, propertyKey); };
}

export interface DocOrderingOptions {
  strategy: "natural" | "custom" | "comparable";
  field?: string;
  comparator?: string;
}
/** @docspec:deterministic */
export function DocOrdering(options: DocOrderingOptions): ClassDecorator {
  return (target) => { setMetadata("ordering", options, target); };
}

/** @docspec:deterministic */
export function DocPreserves(property: string): MethodDecorator {
  return (target, propertyKey) => { appendMetadata("preserves", property, target, propertyKey); };
}

export interface DocCompareOptions {
  strategy: "natural" | "custom" | "structural";
  fields?: string[];
}
/** @docspec:deterministic */
export function DocCompare(options: DocCompareOptions): ClassDecorator {
  return (target) => { setMetadata("compare", options, target); };
}

export interface DocRelationOptions {
  type: "oneToMany" | "manyToMany" | "oneToOne" | "manyToOne";
  target: string;
  via?: string;
  description?: string;
}
/** @docspec:deterministic */
export function DocRelation(options: DocRelationOptions): PropertyDecorator {
  return (target, propertyKey) => { appendMetadata("relations", options, target, propertyKey); };
}

export interface DocBoundaryOptions {
  type: "input" | "output" | "error" | "state";
  description?: string;
}
/** @docspec:deterministic */
export function DocBoundary(options: DocBoundaryOptions): MethodDecorator {
  return (target, propertyKey) => { setMetadata("boundary", options, target, propertyKey); };
}

export interface DocStateMachineOptions {
  states: string[];
  transitions?: string[];
}
/** @docspec:deterministic */
export function DocStateMachine(options: DocStateMachineOptions): ClassDecorator {
  return (target) => { setMetadata("stateMachine", options, target); };
}

/** @docspec:deterministic */
export function DocIdempotent(): MethodDecorator {
  return (target, propertyKey) => { setMetadata("idempotent", true, target, propertyKey); };
}

/** @docspec:deterministic */
export function DocDeterministic(): MethodDecorator {
  return (target, propertyKey) => { setMetadata("deterministic", true, target, propertyKey); };
}

/** @docspec:deterministic */
export function DocIntentional(intent: string): MethodDecorator {
  return (target, propertyKey) => { setMetadata("intentional", intent, target, propertyKey); };
}
