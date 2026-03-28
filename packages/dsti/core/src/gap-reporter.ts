// @docspec:module {
//   id: "docspec-dsti-gap-reporter",
//   name: "DSTI Gap Reporter",
//   description: "Analyzes each method's intent signals to identify channels where documentation or implementation could be improved. Produces prioritized gap reports with severity levels and actionable recommendations.",
//   since: "3.0.0"
// }

/**
 * Produces actionable recommendations per method based on signal gaps.
 *
 * Analyzes each method's intent signals and identifies channels where
 * documentation or implementation could be improved. The output is a
 * prioritized list of gaps with severity and recommendations.
 *
 * @docspec:boundary "DSTI gap analysis and recommendation engine"
 */

import type { IntentMethod, IntentSignals } from "./intent-graph.js";

export interface Gap {
  channel: string;
  severity: "high" | "medium" | "low";
  recommendation: string;
}

export interface GapReport {
  method: string;
  isd: number;
  gaps: Gap[];
}

export class GapReporter {
  /**
   * Analyze all methods and produce gap reports for those with gaps.
   */
  report(methods: IntentMethod[]): GapReport[] {
    return methods
      .map((m) => this.analyzeMethod(m))
      .filter((r) => r.gaps.length > 0);
  }

  private analyzeMethod(method: IntentMethod): GapReport {
    const signals = (method.intentSignals ?? {}) as IntentSignals;
    const gaps: Gap[] = [];

    // Check name semantics
    if (
      !signals.nameSemantics?.intent ||
      signals.nameSemantics.intent === "unknown"
    ) {
      gaps.push({
        channel: "nameSemantics",
        severity: "high",
        recommendation:
          "Add @DocMethod or rename method to use a clear verb (e.g. create, find, validate, process).",
      });
    }

    // Check guard clauses for validation/mutation methods
    const intent = signals.nameSemantics?.intent;
    const guardCount =
      typeof signals.guardClauses === "number"
        ? signals.guardClauses
        : Array.isArray(signals.guardClauses)
          ? signals.guardClauses.length
          : 0;

    if ((intent === "mutation" || intent === "creation") && guardCount === 0) {
      gaps.push({
        channel: "guardClauses",
        severity: "medium",
        recommendation:
          "Add input validation — mutation/creation methods should validate inputs.",
      });
    }

    // Check error handling
    const catchBlocks = signals.errorHandling?.catchBlocks ?? 0;
    if (guardCount > 2 && catchBlocks === 0) {
      gaps.push({
        channel: "errorHandling",
        severity: "low",
        recommendation:
          "Consider adding error handling for guard clause failures.",
      });
    }

    // Check data flow for query methods
    if (
      intent === "query" &&
      (!signals.dataFlow?.reads || signals.dataFlow.reads.length === 0)
    ) {
      gaps.push({
        channel: "dataFlow",
        severity: "medium",
        recommendation:
          "Query method has no detected data reads — add @DocField or clarify data source.",
      });
    }

    // Check logging for service methods with many dependencies
    const depCount = Array.isArray(signals.dependencies)
      ? signals.dependencies.length
      : 0;
    if (depCount > 3 && (signals.logStatements ?? 0) === 0) {
      gaps.push({
        channel: "logStatements",
        severity: "low",
        recommendation:
          "Method has multiple dependencies but no logging — consider adding log statements for observability.",
      });
    }

    return {
      method: method.qualified,
      isd: signals.intentDensityScore ?? 0,
      gaps,
    };
  }
}
