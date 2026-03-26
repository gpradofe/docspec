/**
 * @docspec:module id="docspec-ts-annotations" name="DocSpec TypeScript Annotations"
 * @docspec:description "Provides 42 TypeScript decorators that mirror the Java annotation set.
 *   Covers core documentation, flows, contexts, endpoints, errors, events,
 *   DSTI semantic channels, quality/privacy markers, protocol bindings,
 *   and cross-reference decorators. Zero runtime dependencies beyond reflect-metadata."
 * @docspec:boundary "decorator definition"
 * @docspec:since "3.0.0"
 * @docspec:audience "library-author"
 * @docspec:tags ["self-documented", "annotations", "typescript", "decorators"]
 */

export { setMetadata, getMetadata, appendMetadata } from "./metadata.js";
export { DocModule, type DocModuleOptions } from "./decorators/doc-module.js";
export { DocMethod, DocField, type DocMethodOptions, type DocFieldOptions } from "./decorators/doc-method.js";
export { DocFlow, Step, type DocFlowOptions, type StepOptions } from "./decorators/doc-flow.js";
export { DocContext, ContextInput, ContextUses, type DocContextOptions, type ContextInputOptions, type ContextUsesOptions } from "./decorators/doc-context.js";
export { DocEndpoint, type DocEndpointOptions } from "./decorators/doc-endpoint.js";
export { DocError, type DocErrorOptions } from "./decorators/doc-error.js";
export { DocEvent, type DocEventOptions } from "./decorators/doc-event.js";
export { DocInvariant, DocMonotonic, DocConservation, DocOrdering, DocPreserves, DocCompare, DocRelation, DocBoundary, DocStateMachine, DocIdempotent, DocDeterministic, DocIntentional, type DocInvariantOptions, type DocMonotonicOptions, type DocConservationOptions, type DocOrderingOptions, type DocCompareOptions, type DocRelationOptions, type DocBoundaryOptions, type DocStateMachineOptions } from "./decorators/doc-dsti.js";
export { DocHidden, DocAudience, DocTags, DocOptional, DocExample, DocPII, DocSensitive, DocPerformance, DocTestStrategy, DocTestSkip, type DocExampleOptions, type DocPIIOptions, type DocPerformanceOptions, type DocTestStrategyOptions } from "./decorators/doc-quality.js";
export { DocAsyncAPI, DocGRPC, DocGraphQL, DocWebSocket, DocCommand, type DocAsyncAPIOptions, type DocGRPCOptions, type DocGraphQLOptions, type DocWebSocketOptions, type DocCommandOptions } from "./decorators/doc-protocol.js";
export { DocUses, DocSpecExample, type DocUsesOptions, type DocSpecExampleOptions } from "./decorators/doc-cross-ref.js";
