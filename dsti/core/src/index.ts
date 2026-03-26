// @docspec:module {
//   id: "docspec-dsti-core-index",
//   name: "DSTI Core Engine — Public API",
//   description: "Barrel re-export for the @docspec/dsti-core package. Exposes intent graph types and traversal utilities, the PropertyDSLParser, ISDCalculator, CrossChannelVerifier, and GapReporter.",
//   since: "3.0.0"
// }

/**
 * @docspec/dsti-core — DSTI Core Engine
 *
 * TypeScript implementation of the DocSpec Deep Semantic Test Intelligence
 * (DSTI) system. Provides types, utilities, and analysis tools for working
 * with intent graphs produced by the DocSpec processor.
 *
 * Modules:
 * - intent-graph: Types and traversal utilities
 * - property-dsl-parser: @DocInvariant rule expression parser
 * - isd-calculator: Intent Signal Density score calculator (13 channels)
 * - cross-channel-verifier: Cross-channel consistency checks
 * - gap-reporter: Actionable gap analysis and recommendations
 */

// Intent graph types and traversal
export type {
  IntentGraph,
  IntentMethod,
  IntentSignals,
  NameSemantics,
  DataFlowInfo,
  LoopProperties,
  ErrorHandlingInfo,
  GuardClause,
  BranchInfo,
  ConstantInfo,
  DependencyInfo,
} from "./intent-graph.js";

export {
  traverseMethods,
  filterByDensity,
  getMethodsByIntent,
} from "./intent-graph.js";

// Property DSL parser
export type { InvariantRule } from "./property-dsl-parser.js";
export { PropertyDSLParser } from "./property-dsl-parser.js";

// Cross-channel verifier
export type {
  VerificationResult,
  VerificationIssue,
} from "./cross-channel-verifier.js";
export { CrossChannelVerifier } from "./cross-channel-verifier.js";

// ISD calculator
export { ISDCalculator } from "./isd-calculator.js";

// Gap reporter
export type { GapReport, Gap } from "./gap-reporter.js";
export { GapReporter } from "./gap-reporter.js";
