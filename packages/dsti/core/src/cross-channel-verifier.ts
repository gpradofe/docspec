// @docspec:module {
//   id: "docspec-dsti-cross-channel-verifier",
//   name: "DSTI Cross-Channel Verifier",
//   description: "Compares intent signals across different DSTI channels to detect inconsistencies. Checks naming vs guards, naming vs data flow, guards vs error handling, and dependencies vs naming. Implements DocSpec v3 spec Section 31.",
//   since: "3.0.0"
// }

/**
 * Cross-channel verification per DocSpec v3 spec Section 31.
 *
 * Compares signals across different DSTI channels to detect inconsistencies:
 * - Naming vs guards: if name implies "validate", expect guard clauses
 * - Naming vs data flow: if name implies "query", expect reads; "mutation" expect writes
 * - Guards vs error handling: guard clauses should have matching catch blocks
 * - Constants vs behavior: magic numbers should be documented
 * - Dependencies vs naming: external calls should align with method purpose
 */

import type { IntentMethod, IntentSignals } from "./intent-graph.js";

export interface VerificationIssue {
  method: string;
  channel1: string;
  channel2: string;
  severity: "warning" | "error" | "info";
  message: string;
}

export interface VerificationResult {
  issues: VerificationIssue[];
  methodsChecked: number;
  issueCount: number;
}

export class CrossChannelVerifier {
  /**
   * Verify cross-channel consistency for the given methods.
   */
  verify(methods: IntentMethod[]): VerificationResult {
    const issues: VerificationIssue[] = [];

    for (const method of methods) {
      const signals = method.intentSignals;
      if (!signals) continue;

      this.checkNamingVsGuards(method.qualified, signals, issues);
      this.checkNamingVsDataFlow(method.qualified, signals, issues);
      this.checkGuardsVsErrorHandling(method.qualified, signals, issues);
      this.checkDependenciesVsNaming(method.qualified, signals, issues);
    }

    return {
      issues,
      methodsChecked: methods.length,
      issueCount: issues.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers to extract counts from union types
  // ---------------------------------------------------------------------------

  private getGuardCount(signals: IntentSignals): number {
    if (typeof signals.guardClauses === "number") return signals.guardClauses;
    if (Array.isArray(signals.guardClauses)) return signals.guardClauses.length;
    return 0;
  }

  private getBranchCount(signals: IntentSignals): number {
    if (typeof signals.branches === "number") return signals.branches;
    if (Array.isArray(signals.branches)) return signals.branches.length;
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Cross-channel checks
  // ---------------------------------------------------------------------------

  /**
   * Check: if name semantics implies validation, there should be guard clauses.
   */
  private checkNamingVsGuards(
    qualified: string,
    signals: IntentSignals,
    issues: VerificationIssue[],
  ): void {
    const intent = signals.nameSemantics?.intent;
    const guardCount = this.getGuardCount(signals);

    if (intent === "validation" && guardCount === 0) {
      issues.push({
        method: qualified,
        channel1: "nameSemantics",
        channel2: "guardClauses",
        severity: "warning",
        message:
          "Method name implies validation but no guard clauses detected.",
      });
    }
  }

  /**
   * Check: if name semantics implies query, there should be data reads;
   * if it implies mutation, there should be data writes.
   */
  private checkNamingVsDataFlow(
    qualified: string,
    signals: IntentSignals,
    issues: VerificationIssue[],
  ): void {
    const intent = signals.nameSemantics?.intent;
    const df = signals.dataFlow;

    if (intent === "query" && (!df?.reads || df.reads.length === 0)) {
      issues.push({
        method: qualified,
        channel1: "nameSemantics",
        channel2: "dataFlow",
        severity: "warning",
        message:
          "Method name implies query but no data reads detected.",
      });
    }

    if (intent === "mutation" && (!df?.writes || df.writes.length === 0)) {
      issues.push({
        method: qualified,
        channel1: "nameSemantics",
        channel2: "dataFlow",
        severity: "warning",
        message:
          "Method name implies mutation but no data writes detected.",
      });
    }
  }

  /**
   * Check: methods with many guard clauses but no catch blocks may throw
   * unchecked exceptions from guard failures.
   */
  private checkGuardsVsErrorHandling(
    qualified: string,
    signals: IntentSignals,
    issues: VerificationIssue[],
  ): void {
    const guardCount = this.getGuardCount(signals);
    const catchBlocks = signals.errorHandling?.catchBlocks ?? 0;

    if (guardCount > 3 && catchBlocks === 0) {
      issues.push({
        method: qualified,
        channel1: "guardClauses",
        channel2: "errorHandling",
        severity: "info",
        message: `Method has ${guardCount} guard clauses but no catch blocks — guards may throw unchecked exceptions.`,
      });
    }
  }

  /**
   * Check: methods named as calculations with many external dependencies
   * may be doing more than pure calculation.
   */
  private checkDependenciesVsNaming(
    qualified: string,
    signals: IntentSignals,
    issues: VerificationIssue[],
  ): void {
    const deps = signals.dependencies;
    const depCount = Array.isArray(deps) ? deps.length : 0;
    const intent = signals.nameSemantics?.intent;

    if (intent === "calculation" && depCount > 5) {
      issues.push({
        method: qualified,
        channel1: "dependencies",
        channel2: "nameSemantics",
        severity: "info",
        message: `Method named as calculation but has ${depCount} external dependencies — may be doing more than pure calculation.`,
      });
    }
  }
}
