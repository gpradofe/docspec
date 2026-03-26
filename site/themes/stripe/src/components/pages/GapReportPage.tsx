import React from "react";
import type { GapReportPageData, IntentGraph, IntentMethod, IntentSignals } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface GapReportPageProps {
  data: GapReportPageData;
}

/**
 * Gap categories derived from DSTI intent graph analysis.
 * Each category maps a class of structural weakness to actionable guidance.
 */
interface GapEntry {
  methodName: string;
  qualified: string;
  category: string;
  severity: "critical" | "warning" | "info";
  description: string;
  recommendation: string;
  isdScore: number;
}

interface CategorySummary {
  category: string;
  count: number;
  severity: "critical" | "warning" | "info";
}

const GAP_CATEGORIES: Record<string, { label: string; severity: "critical" | "warning" | "info" }> = {
  "missing-guards": { label: "Missing Guard Clauses", severity: "warning" },
  "untested-error-paths": { label: "Untested Error Paths", severity: "critical" },
  "complex-no-tests": { label: "Complex Methods Without Tests", severity: "critical" },
  "missing-null-checks": { label: "Missing Null Checks", severity: "warning" },
};

const SEVERITY_VARIANT: Record<string, "error" | "warning" | "info"> = {
  critical: "error",
  warning: "warning",
  info: "info",
};

export function GapReportPage({ data }: GapReportPageProps) {
  const { artifact } = data;

  // GapReportPageData currently only carries artifact info.
  // When the intent graph is available on the page data, derive gaps from it.
  // For now we render a placeholder-safe structure that handles both
  // the minimal data shape and a future enriched data shape.
  const extendedData = data as GapReportPageData & {
    intentGraph?: IntentGraph;
    gaps?: GapEntry[];
    categorySummary?: CategorySummary[];
    totalMethods?: number;
    analyzedMethods?: number;
  };

  const gaps: GapEntry[] = extendedData.gaps || deriveGaps(extendedData.intentGraph);
  const totalMethods = extendedData.totalMethods ?? gaps.length;
  const analyzedMethods = extendedData.analyzedMethods ?? gaps.length;
  const methodsWithGaps = gaps.length;
  const criticalGaps = gaps.filter((g) => g.severity === "critical").length;
  const coveragePercent = totalMethods > 0
    ? Math.round(((totalMethods - methodsWithGaps) / totalMethods) * 100)
    : 100;

  // Group gaps by category
  const grouped = new Map<string, GapEntry[]>();
  for (const gap of gaps) {
    if (!grouped.has(gap.category)) {
      grouped.set(gap.category, []);
    }
    grouped.get(gap.category)!.push(gap);
  }
  const categories = Array.from(grouped.entries());

  // Priority list (top 10 by severity then ISD score)
  const priorityList = [...gaps]
    .sort((a, b) => {
      const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      const sDiff = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
      if (sDiff !== 0) return sDiff;
      return a.isdScore - b.isdScore;
    })
    .slice(0, 10);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: artifact.label },
          { label: "Gap Report" },
        ]}
      />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Gap Report</h1>
      <p className="text-text-secondary mb-8">
        DSTI gap analysis and actionable recommendations for {artifact.label}.
      </p>

      {/* Summary Cards */}
      <div className="flex flex-wrap gap-4 mb-8">
        <SummaryCard label="Total Methods" value={totalMethods} />
        <SummaryCard label="Methods With Gaps" value={methodsWithGaps} />
        <SummaryCard label="Critical Gaps" value={criticalGaps} />
        <SummaryCard label="Coverage" value={`${coveragePercent}%`} />
      </div>

      {/* Gap Categories */}
      {categories.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="categories">
            Gap Categories
          </h2>
          <div className="space-y-6">
            {categories.map(([category, entries]) => {
              const catMeta = GAP_CATEGORIES[category];
              const label = catMeta?.label ?? category;
              const severity = catMeta?.severity ?? "info";

              return (
                <div key={category} className="p-5 rounded-lg border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
                    <Badge variant={SEVERITY_VARIANT[severity]}>{severity}</Badge>
                    <Badge variant="info">{entries.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {entries.map((gap) => (
                      <GapRow key={gap.qualified} gap={gap} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Priority List */}
      {priorityList.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="priority">
            Priority List (Top 10)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">#</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Method</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Category</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Severity</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">ISD</th>
                  <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {priorityList.map((gap, i) => (
                  <tr key={gap.qualified} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-text-tertiary text-xs">{i + 1}</td>
                    <td className="py-2 pr-4">
                      <code className="font-mono text-sm text-text-primary">{gap.methodName}</code>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge>{GAP_CATEGORIES[gap.category]?.label ?? gap.category}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={SEVERITY_VARIANT[gap.severity]}>{gap.severity}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-xs font-mono text-text-secondary">{gap.isdScore.toFixed(2)}</span>
                    </td>
                    <td className="py-2 text-sm text-text-secondary">{gap.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recommendations */}
      {gaps.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="recommendations">
            Recommendations
          </h2>
          <div className="space-y-3">
            {gaps.map((gap) => (
              <div key={gap.qualified} className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <code className="text-sm font-mono text-text-primary flex-1 min-w-0 truncate">
                    {gap.qualified}
                  </code>
                  <Badge variant={SEVERITY_VARIANT[gap.severity]}>{gap.severity}</Badge>
                </div>
                <p className="text-sm text-text-secondary mb-1">{gap.description}</p>
                <p className="text-sm text-text-tertiary">
                  <span className="font-medium">Suggested action:</span> {gap.recommendation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {gaps.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary">
            No gaps detected. All methods have sufficient intent coverage.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-tertiary">{label}</div>
    </div>
  );
}

function GapRow({ gap }: { gap: GapEntry }) {
  return (
    <div className="p-3 rounded-lg bg-surface-secondary">
      <div className="flex items-center gap-2 mb-1">
        <code className="text-xs font-mono text-text-primary flex-1 min-w-0 truncate">
          {gap.qualified}
        </code>
        <Badge variant={SEVERITY_VARIANT[gap.severity]}>{gap.severity}</Badge>
        <span className="text-xs font-mono text-text-tertiary">{gap.isdScore.toFixed(2)}</span>
      </div>
      <p className="text-xs text-text-secondary">{gap.description}</p>
    </div>
  );
}

/**
 * Derive gap entries from an IntentGraph when explicit gap data is not provided.
 * This performs a heuristic analysis of intent signals to find methods with weaknesses.
 */
function deriveGaps(intentGraph?: IntentGraph): GapEntry[] {
  if (!intentGraph?.methods) return [];

  const gaps: GapEntry[] = [];

  for (const method of intentGraph.methods) {
    const signals = method.intentSignals;
    if (!signals) continue;

    const isd = signals.intentDensityScore ?? 0;
    const methodName = method.qualified.split(".").pop() ?? method.qualified;
    const guardCount = typeof signals.guardClauses === "number"
      ? signals.guardClauses
      : signals.guardClauses?.length ?? 0;
    const branchCount = typeof signals.branches === "number"
      ? signals.branches
      : signals.branches?.length ?? 0;
    const catchBlocks = signals.errorHandling?.catchBlocks ?? 0;
    const nullChecks = signals.nullChecks ?? 0;

    // Missing guard clauses: name suggests validation but no guards
    const nameHint = signals.nameSemantics?.intent ?? "";
    if (
      (nameHint === "validate" || nameHint === "check" || nameHint === "verify") &&
      guardCount === 0
    ) {
      gaps.push({
        methodName,
        qualified: method.qualified,
        category: "missing-guards",
        severity: "warning",
        description: `Method name suggests validation intent ("${nameHint}") but no guard clauses detected.`,
        recommendation: "Add precondition checks or throw IllegalArgumentException for invalid inputs.",
        isdScore: isd,
      });
    }

    // Untested error paths: catch blocks with low ISD
    if (catchBlocks > 0 && isd < 0.3) {
      gaps.push({
        methodName,
        qualified: method.qualified,
        category: "untested-error-paths",
        severity: "critical",
        description: `Has ${catchBlocks} catch block${catchBlocks !== 1 ? "s" : ""} but ISD is ${isd.toFixed(2)}, suggesting error paths may be untested.`,
        recommendation: "Add tests that trigger each catch block and verify error handling behavior.",
        isdScore: isd,
      });
    }

    // Complex methods without tests: high branch count + low ISD
    if (branchCount >= 4 && isd < 0.3) {
      gaps.push({
        methodName,
        qualified: method.qualified,
        category: "complex-no-tests",
        severity: "critical",
        description: `${branchCount} branches with ISD ${isd.toFixed(2)}. High complexity with low intent coverage.`,
        recommendation: "Break down into smaller methods or add comprehensive branch-coverage tests.",
        isdScore: isd,
      });
    }

    // Missing null checks: handles optional data without null checks
    if (
      signals.dataFlow &&
      ((signals.dataFlow.reads?.length ?? 0) > 0 || (signals.dataFlow.writes?.length ?? 0) > 0) &&
      nullChecks === 0
    ) {
      gaps.push({
        methodName,
        qualified: method.qualified,
        category: "missing-null-checks",
        severity: "warning",
        description: `Accesses data fields but has no null checks detected.`,
        recommendation: "Add null/empty checks for data fields, especially before writes.",
        isdScore: isd,
      });
    }
  }

  return gaps;
}
