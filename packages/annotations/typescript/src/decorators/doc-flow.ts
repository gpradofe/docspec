/**
 * @docspec:module id="docspec-ts-decorator-flow" name="@DocFlow / @Step Decorators"
 * @docspec:description "Defines the @DocFlow class decorator and @Step method decorator
 *   for documenting multi-step business workflows. @DocFlow marks a class as a flow
 *   orchestrator and @Step annotates individual methods as named steps within that flow,
 *   including their type (process, ai, storage, external, etc.) and data inputs/outputs.
 *   The processor stitches steps into a directed graph for visualization."
 * @docspec:boundary "decorator definition"
 * @docspec:since "3.0.0"
 */

import { setMetadata, appendMetadata } from "../metadata.js";

export interface DocFlowOptions {
  id: string;
  name?: string;
  description?: string;
  trigger?: string;
}

export function DocFlow(options: DocFlowOptions): ClassDecorator {
  return (target) => {
    setMetadata("flow", options, target);
  };
}

export interface StepOptions {
  id: string;
  name?: string;
  description?: string;
  type?: "process" | "ai" | "storage" | "trigger" | "retry" | "external" | "bridge" | "observability";
  ai?: boolean;
  inputs?: string[];
  outputs?: string[];
}

export function Step(options: StepOptions): MethodDecorator {
  return (target, propertyKey) => {
    appendMetadata("steps", options, target, propertyKey);
  };
}
