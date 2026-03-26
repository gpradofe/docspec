import React from "react";
import type { TestOverviewPageData, IntentMethod, IntentSignals } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface TestOverviewPageProps {
  data: TestOverviewPageData;
}

/* ------------------------------------------------------------------ */
/*  13 DSTI Channels — canonical order                                 */
/* ------------------------------------------------------------------ */
const DSTI_CHANNELS: { key: keyof IntentSignals | string; label: string }[] = [
  { key: "nameSemantics", label: "Name Semantics" },
  { key: "guardClauses", label: "Guard Clauses" },
  { key: "branches", label: "Branches" },
  { key: "dataFlow", label: "Data Flow" },
  { key: "loopProperties", label: "Loop Properties" },
  { key: "errorHandling", label: "Error Handling" },
  { key: "constants", label: "Constants" },
  { key: "dependencies", label: "Dependencies" },
  { key: "nullChecks", label: "Null Checks" },
  { key: "assertions", label: "Assertions" },
  { key: "validationAnnotations", label: "Validation Annotations" },
  { key: "logStatements", label: "Log Statements" },
  { key: "intentDensityScore", label: "Density Score" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function channelPopulated(signals: IntentSignals, key: string): boolean {
  const v = (signals as Record<string, unknown>)[key];
  if (v === undefined || v === null) return false;
  if (typeof v === "number") return v > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

function getIsd(m: IntentMethod): number {
  return m.intentSignals?.intentDensityScore ?? 0;
}

function isdColor(score: number): string {
  if (score >= 0.8) return "bg-emerald-500";
  if (score >= 0.6) return "bg-emerald-400";
  if (score >= 0.4) return "bg-amber-400";
  if (score >= 0.2) return "bg-amber-500";
  return "bg-red-500";
}

function isdBadgeVariant(score: number): "success" | "warning" | "error" {
  if (score >= 0.6) return "success";
  if (score >= 0.3) return "warning";
  return "error";
}

function shortName(qualified: string): string {
  const parts = qualified.split(".");
  return parts.length > 1 ? parts.slice(-2).join(".") : qualified;
}

/* ------------------------------------------------------------------ */
/*  Histogram buckets                                                  */
/* ------------------------------------------------------------------ */
interface Bucket {
  label: string;
  min: number;
  max: number;
  color: string;
  bgLight: string;
  textColor: string;
}

const BUCKETS: Bucket[] = [
  { label: "0 - 0.2", min: 0, max: 0.2, color: "bg-red-500", bgLight: "bg-red-50", textColor: "text-red-700" },
  { label: "0.2 - 0.4", min: 0.2, max: 0.4, color: "bg-amber-500", bgLight: "bg-amber-50", textColor: "text-amber-700" },
  { label: "0.4 - 0.6", min: 0.4, max: 0.6, color: "bg-amber-400", bgLight: "bg-amber-50", textColor: "text-amber-700" },
  { label: "0.6 - 0.8", min: 0.6, max: 0.8, color: "bg-emerald-400", bgLight: "bg-emerald-50", textColor: "text-emerald-700" },
  { label: "0.8 - 1.0", min: 0.8, max: 1.0, color: "bg-emerald-500", bgLight: "bg-emerald-50", textColor: "text-emerald-700" },
];

function bucketize(methods: IntentMethod[]): Map<string, IntentMethod[]> {
  const map = new Map<string, IntentMethod[]>();
  for (const b of BUCKETS) map.set(b.label, []);
  for (const m of methods) {
    const isd = getIsd(m);
    for (const b of BUCKETS) {
      if (isd >= b.min && (isd < b.max || (b.max === 1.0 && isd <= 1.0))) {
        map.get(b.label)!.push(m);
        break;
      }
    }
  }
  return map;
}

/* ================================================================== */
/*  TestOverviewPage                                                   */
/* ================================================================== */
export function TestOverviewPage({ data }: TestOverviewPageProps) {
  const { intentGraph, artifact } = data;
  const methods = intentGraph.methods || [];

  // ---- Core stats ----
  const totalMethods = methods.length;
  const withSignals = methods.filter((m) => m.intentSignals).length;
  const avgDensity =
    totalMethods > 0
      ? methods.reduce((sum, m) => sum + getIsd(m), 0) / totalMethods
      : 0;
  const highComplexity = methods.filter((m) => getIsd(m) >= 0.7).length;
  const autoGenerable = methods.filter((m) => getIsd(m) > 0.3).length;

  // ---- Highest / lowest ----
  const sorted = [...methods].sort((a, b) => getIsd(a) - getIsd(b));
  const lowestMethods = sorted.slice(0, 5);
  const highestMethods = sorted.slice(-5).reverse();

  // ---- Bucket histogram ----
  const buckets = bucketize(methods);

  // ---- Channel coverage: how many methods populate each channel ----
  const channelCoverage = DSTI_CHANNELS.map((ch) => {
    const count = methods.filter(
      (m) => m.intentSignals && channelPopulated(m.intentSignals, ch.key)
    ).length;
    return { ...ch, count };
  });

  // ---- Gap detection: methods missing critical channels ----
  const criticalChannels = ["guardClauses", "branches", "errorHandling", "nullChecks"];
  const methodsWithGaps = methods
    .filter((m) => {
      if (!m.intentSignals) return true;
      const missing = criticalChannels.filter(
        (ch) => !channelPopulated(m.intentSignals!, ch)
      );
      return missing.length > 0;
    })
    .map((m) => {
      const missing = criticalChannels.filter(
        (ch) => !m.intentSignals || !channelPopulated(m.intentSignals, ch)
      );
      return { method: m, missingChannels: missing };
    })
    .sort((a, b) => b.missingChannels.length - a.missingChannels.length)
    .slice(0, 8);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: artifact.label },
          { label: "Test Overview" },
        ]}
      />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Test Overview</h1>
      <p className="text-text-secondary mb-6">
        Intent analysis and test strategy insights for {artifact.label}.
      </p>

      {/* ============================================================ */}
      {/* SECTION 1 — Coverage Dashboard                                */}
      {/* ============================================================ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="coverage-dashboard">
          Coverage Dashboard
        </h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5 mb-6">
          <StatCard label="Methods Analyzed" value={totalMethods} />
          <StatCard label="With Intent Signals" value={withSignals} />
          <StatCard label="Avg. ISD Score" value={avgDensity.toFixed(2)} />
          <StatCard label="High Complexity" value={highComplexity} subtitle="ISD >= 0.7" />
          <StatCard label="Auto-Generable Tests" value={autoGenerable} subtitle="ISD > 0.3" />
        </div>

        {/* Analysis coverage percentage bar */}
        {totalMethods > 0 && (
          <div className="p-4 rounded-lg border border-border bg-surface-secondary">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">DSTI Analysis Coverage</span>
              <span className="text-sm font-mono text-text-secondary">
                {withSignals}/{totalMethods} ({totalMethods > 0 ? Math.round((withSignals / totalMethods) * 100) : 0}%)
              </span>
            </div>
            <div className="h-3 rounded-full bg-surface-tertiary overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${totalMethods > 0 ? (withSignals / totalMethods) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-xs text-text-tertiary">
              <span>Highest ISD: {highestMethods[0] ? `${getIsd(highestMethods[0]).toFixed(2)} (${shortName(highestMethods[0].qualified)})` : "N/A"}</span>
              <span>Lowest ISD: {lowestMethods[0] ? `${getIsd(lowestMethods[0]).toFixed(2)} (${shortName(lowestMethods[0].qualified)})` : "N/A"}</span>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* SECTION 2 — ISD Histogram                                     */}
      {/* ============================================================ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="isd-histogram">
          ISD Distribution Histogram
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Distribution of Intent Signal Density scores across all methods. Higher ISD indicates richer
          semantic information available for test generation.
        </p>

        <div className="p-5 rounded-lg border border-border bg-surface-secondary">
          <div className="space-y-3">
            {BUCKETS.map((bucket) => {
              const items = buckets.get(bucket.label) || [];
              const count = items.length;
              const pct = totalMethods > 0 ? (count / totalMethods) * 100 : 0;

              return (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-tertiary w-16 flex-shrink-0 text-right">
                    {bucket.label}
                  </span>
                  <div className="flex-1 h-7 rounded bg-surface-tertiary overflow-hidden relative">
                    <div
                      className={`h-full rounded ${bucket.color} transition-all`}
                      style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                    />
                    {count > 0 && (
                      <span className="absolute inset-y-0 flex items-center text-xs font-medium px-2 text-white"
                        style={{ left: `${Math.max(pct, 2)}%` }}>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 w-28 flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bucket.bgLight} ${bucket.textColor}`}>
                      {count}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-text-tertiary">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-red-500" /> Low (blind spots)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-amber-400" /> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-emerald-500" /> High (rich signals)
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3 — Generated Test Summary                            */}
      {/* ============================================================ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="test-summary">
          Generated Test Summary
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left: stats */}
          <div className="p-5 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-text-primary mb-3">Test Generation Potential</h3>
            <div className="space-y-3 text-sm">
              <SummaryRow label="Total methods analyzed" value={totalMethods} />
              <SummaryRow label="Methods with test signals" value={withSignals} />
              <SummaryRow
                label="Estimated auto-generable tests"
                value={autoGenerable}
                badge={
                  totalMethods > 0
                    ? `${Math.round((autoGenerable / totalMethods) * 100)}%`
                    : "0%"
                }
                badgeVariant="success"
              />
              <SummaryRow
                label="Methods below threshold (ISD <= 0.3)"
                value={totalMethods - autoGenerable}
                badge={
                  totalMethods > 0
                    ? `${Math.round(((totalMethods - autoGenerable) / totalMethods) * 100)}%`
                    : "0%"
                }
                badgeVariant="warning"
              />
            </div>
          </div>

          {/* Right: channel coverage breakdown */}
          <div className="p-5 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-text-primary mb-3">
              Channel Coverage Breakdown
            </h3>
            <div className="space-y-2">
              {channelCoverage.map((ch) => {
                const pct = totalMethods > 0 ? (ch.count / totalMethods) * 100 : 0;
                return (
                  <div key={ch.key} className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary w-36 flex-shrink-0 truncate">
                      {ch.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-surface-tertiary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 70 ? "bg-emerald-500" : pct >= 30 ? "bg-amber-400" : "bg-red-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-text-tertiary w-14 text-right flex-shrink-0">
                      {ch.count}/{totalMethods}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 4 — Gap Report                                        */}
      {/* ============================================================ */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="gap-report">
          Gap Report
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Methods with lowest ISD scores and missing critical channels represent potential blind spots
          in test coverage.
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Lowest ISD methods */}
          <div className="p-5 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              Lowest ISD Methods
            </h3>
            {lowestMethods.length === 0 ? (
              <p className="text-sm text-text-tertiary">No methods found.</p>
            ) : (
              <div className="space-y-2">
                {lowestMethods.map((m) => (
                  <div key={m.qualified} className="flex items-center gap-2 p-2 rounded bg-surface-secondary">
                    <Badge variant={isdBadgeVariant(getIsd(m))}>{getIsd(m).toFixed(2)}</Badge>
                    <code className="text-xs font-mono text-text-secondary truncate flex-1 min-w-0">
                      {shortName(m.qualified)}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Missing critical channels */}
          <div className="p-5 rounded-lg border border-border">
            <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              Missing Critical Channels
            </h3>
            {methodsWithGaps.length === 0 ? (
              <p className="text-sm text-text-tertiary">All methods have complete critical channel coverage.</p>
            ) : (
              <div className="space-y-2">
                {methodsWithGaps.map(({ method, missingChannels }) => (
                  <div key={method.qualified} className="p-2 rounded bg-surface-secondary">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono text-text-secondary truncate flex-1 min-w-0">
                        {shortName(method.qualified)}
                      </code>
                      <span className="text-xs text-text-tertiary flex-shrink-0">
                        {missingChannels.length} missing
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {missingChannels.map((ch) => (
                        <Badge key={ch} variant="warning">{ch}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-4 p-5 rounded-lg border border-border bg-blue-50">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Recommendations</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            {lowestMethods.length > 0 && lowestMethods[0] && getIsd(lowestMethods[0]) < 0.2 && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">&#x2022;</span>
                <span>
                  {lowestMethods.filter((m) => getIsd(m) < 0.2).length} method(s) have very low ISD
                  (&lt; 0.2). Consider adding guard clauses, validation, or descriptive naming to
                  improve intent extraction.
                </span>
              </li>
            )}
            {methodsWithGaps.filter((g) => g.missingChannels.includes("guardClauses")).length > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">&#x2022;</span>
                <span>
                  {methodsWithGaps.filter((g) => g.missingChannels.includes("guardClauses")).length} method(s)
                  lack guard clauses. Adding precondition checks enables automatic boundary-condition test generation.
                </span>
              </li>
            )}
            {methodsWithGaps.filter((g) => g.missingChannels.includes("errorHandling")).length > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">&#x2022;</span>
                <span>
                  {methodsWithGaps.filter((g) => g.missingChannels.includes("errorHandling")).length} method(s)
                  have no error handling. Adding try-catch blocks enables exception-path test generation.
                </span>
              </li>
            )}
            {totalMethods > 0 && withSignals < totalMethods && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">&#x2022;</span>
                <span>
                  {totalMethods - withSignals} method(s) have no intent signals at all. Ensure the processor
                  can access their source code.
                </span>
              </li>
            )}
            {totalMethods > 0 && avgDensity >= 0.5 && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">&#x2022;</span>
                <span>
                  Overall average ISD is {avgDensity.toFixed(2)}, which is good. The codebase has
                  sufficient signals for meaningful auto-generated tests.
                </span>
              </li>
            )}
            {totalMethods === 0 && (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">&#x2022;</span>
                <span>
                  No methods found in the intent graph. Run the processor with DSTI enabled to populate
                  intent signals.
                </span>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 5 — Methods Table (enhanced from original)            */}
      {/* ============================================================ */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="methods">
          Methods ({totalMethods})
        </h2>
        <div className="space-y-2">
          {methods.map((method) => (
            <MethodRow key={method.qualified} method={method} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-tertiary">{label}</div>
      {subtitle && <div className="text-xs text-text-tertiary mt-0.5 opacity-70">{subtitle}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Row (for test generation summary)                          */
/* ------------------------------------------------------------------ */
function SummaryRow({
  label,
  value,
  badge,
  badgeVariant,
}: {
  label: string;
  value: number;
  badge?: string;
  badgeVariant?: "success" | "warning" | "error" | "info";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium text-text-primary">{value}</span>
        {badge && <Badge variant={badgeVariant || "default"}>{badge}</Badge>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Method Row (enhanced with channel badges)                          */
/* ------------------------------------------------------------------ */
function MethodRow({ method }: { method: IntentMethod }) {
  const signals = method.intentSignals;
  const density = signals?.intentDensityScore || 0;
  const intent = signals?.nameSemantics?.intent;

  // Count populated channels
  const populatedChannels = signals
    ? DSTI_CHANNELS.filter((ch) => channelPopulated(signals, ch.key))
    : [];

  return (
    <div className="p-4 rounded-lg border border-border">
      <div className="flex items-center gap-3 mb-2">
        <code className="text-sm font-mono text-text-primary flex-1 min-w-0 truncate">
          {method.qualified}
        </code>
        <Badge variant={isdBadgeVariant(density)}>{density.toFixed(2)}</Badge>
        {intent && <Badge variant="info">{intent}</Badge>}
      </div>

      {signals && (
        <>
          {/* Density Bar */}
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-text-tertiary w-20 flex-shrink-0">Density</span>
              <div className="flex-1 h-2 rounded-full bg-surface-tertiary overflow-hidden">
                <div
                  className={`h-full rounded-full ${isdColor(density)}`}
                  style={{ width: `${Math.round(density * 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-text-secondary w-10 text-right flex-shrink-0">
                {density.toFixed(2)}
              </span>
            </div>

            {/* Quick stats */}
            <div className="flex gap-3 text-xs text-text-tertiary flex-shrink-0">
              {signals.guardClauses !== undefined && (
                <span>
                  {typeof signals.guardClauses === "number"
                    ? signals.guardClauses
                    : signals.guardClauses.length}{" "}
                  guard{(typeof signals.guardClauses === "number"
                    ? signals.guardClauses
                    : signals.guardClauses.length) !== 1
                    ? "s"
                    : ""}
                </span>
              )}
              {signals.branches !== undefined && (
                <span>
                  {typeof signals.branches === "number"
                    ? signals.branches
                    : signals.branches.length}{" "}
                  branch
                  {(typeof signals.branches === "number"
                    ? signals.branches
                    : signals.branches.length) !== 1
                    ? "es"
                    : ""}
                </span>
              )}
              {signals.errorHandling?.catchBlocks !== undefined && (
                <span>{signals.errorHandling.catchBlocks} catch</span>
              )}
            </div>
          </div>

          {/* Channel badges */}
          {populatedChannels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {populatedChannels.map((ch) => (
                <span
                  key={ch.key}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-tertiary text-text-tertiary"
                >
                  {ch.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
