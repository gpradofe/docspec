// @docspec:module {
//   id: "docspec-dsti-intent-graph",
//   name: "DSTI Intent Graph Types & Traversal",
//   description: "Defines TypeScript types matching the DocSpec v3 JSON Schema IntentGraph, IntentMethod, and IntentSignals definitions, plus traversal utilities for filtering by ISD score and grouping by intent category.",
//   since: "3.0.0"
// }

/**
 * Types matching the DocSpec v3 JSON Schema IntentGraph / IntentMethod / IntentSignals,
 * plus traversal utilities for working with intent graphs.
 *
 * Schema reference: spec/docspec.schema.json  #/$defs/IntentGraph
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntentGraph {
  methods?: IntentMethod[];
}

export interface IntentMethod {
  qualified: string;
  intentSignals?: IntentSignals;
}

export interface NameSemantics {
  verb?: string;
  object?: string;
  intent?: string;
}

export interface DataFlowInfo {
  reads?: string[];
  writes?: string[];
}

export interface LoopProperties {
  hasStreams?: boolean;
  hasEnhancedFor?: boolean;
  streamOps?: string[];
}

export interface ErrorHandlingInfo {
  catchBlocks?: number;
  caughtTypes?: string[];
}

export interface GuardClause {
  condition?: string;
  error?: string;
  boundary?: string;
}

export interface BranchInfo {
  condition?: string;
  output?: string;
}

export interface ConstantInfo {
  name?: string;
  value?: string;
  implies?: string;
}

export interface DependencyInfo {
  name?: string;
  classification?: string;
}

/**
 * Intent signals extracted from a method's source code.
 *
 * The `guardClauses`, `branches`, `constants`, and `dependencies` fields use
 * union types matching the JSON Schema `oneOf` definitions — they can be either
 * simple counts/strings or structured objects.
 */
export interface IntentSignals {
  nameSemantics?: NameSemantics;
  guardClauses?: number | GuardClause[];
  branches?: number | BranchInfo[];
  dataFlow?: DataFlowInfo;
  loopProperties?: LoopProperties;
  errorHandling?: ErrorHandlingInfo;
  constants?: string[] | ConstantInfo[];
  dependencies?: string[] | DependencyInfo[];
  intentDensityScore?: number;
  nullChecks?: number;
  assertions?: number;
  logStatements?: number;
  validationAnnotations?: number;
}

// ---------------------------------------------------------------------------
// Traversal utilities
// ---------------------------------------------------------------------------

/**
 * Iterate over all methods in an intent graph.
 */
export function traverseMethods(graph: IntentGraph): IntentMethod[] {
  return graph.methods ?? [];
}

/**
 * Filter methods by minimum ISD (Intent Signal Density) score.
 */
export function filterByDensity(
  graph: IntentGraph,
  minScore: number,
): IntentMethod[] {
  return traverseMethods(graph).filter(
    (m) => (m.intentSignals?.intentDensityScore ?? 0) >= minScore,
  );
}

/**
 * Get methods grouped by their inferred intent category.
 */
export function getMethodsByIntent(
  graph: IntentGraph,
): Map<string, IntentMethod[]> {
  const result = new Map<string, IntentMethod[]>();
  for (const method of traverseMethods(graph)) {
    const intent = method.intentSignals?.nameSemantics?.intent ?? "unknown";
    const list = result.get(intent) ?? [];
    list.push(method);
    result.set(intent, list);
  }
  return result;
}
