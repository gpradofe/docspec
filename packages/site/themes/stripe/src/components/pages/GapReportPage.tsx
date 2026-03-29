import React from "react";
import type { GapReportPageData, IntentGraph, IntentMethod, IntentSignals } from "@docspec/core";
import { T } from "../../lib/tokens.js";
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

      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8 }}>Gap Report</h1>
      <p style={{ color: T.textMuted, marginBottom: 32 }}>
        DSTI gap analysis and actionable recommendations for {artifact.label}.
      </p>

      {/* Summary Cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
        <SummaryCard label="Total Methods" value={totalMethods} />
        <SummaryCard label="Methods With Gaps" value={methodsWithGaps} />
        <SummaryCard label="Critical Gaps" value={criticalGaps} />
        <SummaryCard label="Coverage" value={`${coveragePercent}%`} />
      </div>

      {/* Gap Categories */}
      {categories.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="categories">
            Gap Categories
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {categories.map(([category, entries]) => {
              const catMeta = GAP_CATEGORIES[category];
              const label = catMeta?.label ?? category;
              const severity = catMeta?.severity ?? "info";

              return (
                <div key={category} style={{ padding: 20, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{label}</h3>
                    <Badge variant={SEVERITY_VARIANT[severity]}>{severity}</Badge>
                    <Badge variant="info">{entries.length}</Badge>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="priority">
            Priority List (Top 10)
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid " + T.surfaceBorder }}>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>#</th>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Method</th>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Category</th>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Severity</th>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>ISD</th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {priorityList.map((gap, i) => (
                  <tr key={gap.qualified} style={{ borderBottom: "1px solid " + T.surfaceBorder + "80" }}>
                    <td style={{ padding: "8px 16px 8px 0", color: T.textDim, fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: "8px 16px 8px 0" }}>
                      <code style={{ fontFamily: T.mono, fontSize: 14, color: T.text }}>{gap.methodName}</code>
                    </td>
                    <td style={{ padding: "8px 16px 8px 0" }}>
                      <Badge>{GAP_CATEGORIES[gap.category]?.label ?? gap.category}</Badge>
                    </td>
                    <td style={{ padding: "8px 16px 8px 0" }}>
                      <Badge variant={SEVERITY_VARIANT[gap.severity]}>{gap.severity}</Badge>
                    </td>
                    <td style={{ padding: "8px 16px 8px 0" }}>
                      <span style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted }}>{gap.isdScore.toFixed(2)}</span>
                    </td>
                    <td style={{ padding: "8px 0", fontSize: 14, color: T.textMuted }}>{gap.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recommendations */}
      {gaps.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="recommendations">
            Recommendations
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {gaps.map((gap) => (
              <div key={gap.qualified} style={{ padding: 16, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <code style={{ fontSize: 14, fontFamily: T.mono, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {gap.qualified}
                  </code>
                  <Badge variant={SEVERITY_VARIANT[gap.severity]}>{gap.severity}</Badge>
                </div>
                <p style={{ fontSize: 14, color: T.textMuted, marginBottom: 4 }}>{gap.description}</p>
                <p style={{ fontSize: 14, color: T.textDim }}>
                  <span style={{ fontWeight: 500 }}>Suggested action:</span> {gap.recommendation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {gaps.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ color: T.textMuted }}>
            No gaps detected. All methods have sufficient intent coverage.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: "12px 16px", borderRadius: 8, background: T.surface, border: "1px solid " + T.surfaceBorder }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textDim }}>{label}</div>
    </div>
  );
}

function GapRow({ gap }: { gap: GapEntry }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: T.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <code style={{ fontSize: 12, fontFamily: T.mono, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {gap.qualified}
        </code>
        <Badge variant={SEVERITY_VARIANT[gap.severity]}>{gap.severity}</Badge>
        <span style={{ fontSize: 12, fontFamily: T.mono, color: T.textDim }}>{gap.isdScore.toFixed(2)}</span>
      </div>
      <p style={{ fontSize: 12, color: T.textMuted }}>{gap.description}</p>
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
