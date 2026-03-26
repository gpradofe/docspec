// @docspec:module {
//   id: "docspec-ts-decorator-quality",
//   name: "Quality, Privacy & Testing Decorators",
//   description: "Defines quality and governance decorators: @DocHidden (exclude from docs), @DocAudience, @DocTags, @DocOptional, @DocExample (verified code samples), @DocPII (privacy/GDPR), @DocSensitive, @DocPerformance (latency/bottleneck), @DocTestStrategy, and @DocTestSkip.",
//   since: "3.0.0"
// }

import { setMetadata, appendMetadata } from "../metadata.js";

/** @docspec:deterministic */
export function DocHidden(): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (propertyKey) setMetadata("hidden", true, target, propertyKey);
    else setMetadata("hidden", true, target);
  };
}

/** @docspec:deterministic */
export function DocAudience(audience: string): ClassDecorator {
  return (target) => { setMetadata("audience", audience, target); };
}

/** @docspec:deterministic */
export function DocTags(...tags: string[]): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    if (propertyKey) setMetadata("tags", tags, target, propertyKey);
    else setMetadata("tags", tags, target);
  };
}

/** @docspec:deterministic */
export function DocOptional(reason?: string): PropertyDecorator {
  return (target, propertyKey) => { setMetadata("optional", reason ?? true, target, propertyKey); };
}

export interface DocExampleOptions {
  title?: string;
  language?: string;
  code: string;
  verified?: boolean;
}
/** @docspec:deterministic */
export function DocExample(options: DocExampleOptions): MethodDecorator {
  return (target, propertyKey) => { appendMetadata("examples", options, target, propertyKey); };
}

export interface DocPIIOptions {
  type: "email" | "phone" | "name" | "address" | "ssn" | "dob" | "ip" | "financial" | "health" | "biometric" | "other";
  retention?: string;
  gdprBasis?: string;
  encrypted?: boolean;
  neverLog?: boolean;
  neverReturn?: boolean;
}
/** @docspec:deterministic */
export function DocPII(options: DocPIIOptions): PropertyDecorator {
  return (target, propertyKey) => { setMetadata("pii", options, target, propertyKey); };
}

/** @docspec:deterministic */
export function DocSensitive(reason?: string): PropertyDecorator {
  return (target, propertyKey) => { setMetadata("sensitive", reason ?? true, target, propertyKey); };
}

export interface DocPerformanceOptions {
  expectedLatency?: string;
  bottleneck?: string;
}
/** @docspec:deterministic */
export function DocPerformance(options: DocPerformanceOptions): MethodDecorator {
  return (target, propertyKey) => { setMetadata("performance", options, target, propertyKey); };
}

export interface DocTestStrategyOptions {
  type: "unit" | "integration" | "e2e" | "property" | "contract";
  description?: string;
}
/** @docspec:deterministic */
export function DocTestStrategy(options: DocTestStrategyOptions): MethodDecorator {
  return (target, propertyKey) => { setMetadata("testStrategy", options, target, propertyKey); };
}

/** @docspec:deterministic */
export function DocTestSkip(reason?: string): MethodDecorator {
  return (target, propertyKey) => { setMetadata("testSkip", reason ?? true, target, propertyKey); };
}
