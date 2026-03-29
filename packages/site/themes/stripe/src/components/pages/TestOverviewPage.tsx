import React from "react";
import type { TestOverviewPageData, IntentMethod, IntentSignals } from "@docspec/core";
import { T } from "../../lib/tokens.js";
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
  if (score >= 0.8) return T.green;
  if (score >= 0.6) return "#34d399";
  if (score >= 0.4) return T.yellow;
  if (score >= 0.2) return "#f59e0b";
  return T.red;
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
  badgeColor: string;
  badgeBg: string;
}

const BUCKETS: Bucket[] = [
  { label: "0 - 0.2", min: 0, max: 0.2, color: T.red, badgeColor: T.red, badgeBg: T.redBg },
  { label: "0.2 - 0.4", min: 0.2, max: 0.4, color: "#f59e0b", badgeColor: T.yellow, badgeBg: T.yellowBg },
  { label: "0.4 - 0.6", min: 0.4, max: 0.6, color: T.yellow, badgeColor: T.yellow, badgeBg: T.yellowBg },
  { label: "0.6 - 0.8", min: 0.6, max: 0.8, color: "#34d399", badgeColor: T.green, badgeBg: T.greenBg },
  { label: "0.8 - 1.0", min: 0.8, max: 1.0, color: T.green, badgeColor: T.green, badgeBg: T.greenBg },
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

      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8 }}>Test Overview</h1>
      <p style={{ color: T.textMuted, marginBottom: 24 }}>
        Intent analysis and test strategy insights for {artifact.label}.
      </p>

      {/* ============================================================ */}
      {/* SECTION 1 — Coverage Dashboard                                */}
      {/* ============================================================ */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="coverage-dashboard">
          Coverage Dashboard
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
          <StatCard label="Methods Analyzed" value={totalMethods} />
          <StatCard label="With Intent Signals" value={withSignals} />
          <StatCard label="Avg. ISD Score" value={avgDensity.toFixed(2)} />
          <StatCard label="High Complexity" value={highComplexity} subtitle="ISD >= 0.7" />
          <StatCard label="Auto-Generable Tests" value={autoGenerable} subtitle="ISD > 0.3" />
        </div>

        {/* Analysis coverage percentage bar */}
        {totalMethods > 0 && (
          <div style={{ padding: 16, borderRadius: 8, border: "1px solid " + T.surfaceBorder, background: T.surface }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>DSTI Analysis Coverage</span>
              <span style={{ fontSize: 14, fontFamily: T.mono, color: T.textMuted }}>
                {withSignals}/{totalMethods} ({totalMethods > 0 ? Math.round((withSignals / totalMethods) * 100) : 0}%)
              </span>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: T.surfaceBorder, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: T.blue,
                  transition: "all 0.3s",
                  width: `${totalMethods > 0 ? (withSignals / totalMethods) * 100 : 0}%`,
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: T.textDim }}>
              <span>Highest ISD: {highestMethods[0] ? `${getIsd(highestMethods[0]).toFixed(2)} (${shortName(highestMethods[0].qualified)})` : "N/A"}</span>
              <span>Lowest ISD: {lowestMethods[0] ? `${getIsd(lowestMethods[0]).toFixed(2)} (${shortName(lowestMethods[0].qualified)})` : "N/A"}</span>
            </div>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* SECTION 2 — ISD Histogram                                     */}
      {/* ============================================================ */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="isd-histogram">
          ISD Distribution Histogram
        </h2>
        <p style={{ fontSize: 14, color: T.textMuted, marginBottom: 16 }}>
          Distribution of Intent Signal Density scores across all methods. Higher ISD indicates richer
          semantic information available for test generation.
        </p>

        <div style={{ padding: 20, borderRadius: 8, border: "1px solid " + T.surfaceBorder, background: T.surface }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {BUCKETS.map((bucket) => {
              const items = buckets.get(bucket.label) || [];
              const count = items.length;
              const pct = totalMethods > 0 ? (count / totalMethods) * 100 : 0;

              return (
                <div key={bucket.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, fontFamily: T.mono, color: T.textDim, width: 64, flexShrink: 0, textAlign: "right" }}>
                    {bucket.label}
                  </span>
                  <div style={{ flex: 1, height: 28, borderRadius: 4, background: T.surfaceBorder, overflow: "hidden", position: "relative" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 4,
                        background: bucket.color,
                        transition: "all 0.3s",
                        width: `${Math.max(pct, count > 0 ? 2 : 0)}%`,
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: 112, flexShrink: 0 }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      background: bucket.badgeBg,
                      color: bucket.badgeColor,
                    }}>
                      {count}
                    </span>
                    <span style={{ fontSize: 12, color: T.textDim }}>
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, paddingTop: 12, borderTop: "1px solid " + T.surfaceBorder, fontSize: 12, color: T.textDim }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 4, background: T.red }} /> Low (blind spots)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 4, background: T.yellow }} /> Medium
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 4, background: T.green }} /> High (rich signals)
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3 — Generated Test Summary                            */}
      {/* ============================================================ */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="test-summary">
          Generated Test Summary
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {/* Left: stats */}
          <div style={{ padding: 20, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 12 }}>Test Generation Potential</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
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
          <div style={{ padding: 20, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 12 }}>
              Channel Coverage Breakdown
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {channelCoverage.map((ch) => {
                const pct = totalMethods > 0 ? (ch.count / totalMethods) * 100 : 0;
                const barColor = pct >= 70 ? T.green : pct >= 30 ? T.yellow : T.red;
                return (
                  <div key={ch.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: T.textMuted, width: 144, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ch.label}
                    </span>
                    <div style={{ flex: 1, height: 8, borderRadius: 999, background: T.surfaceBorder, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 999,
                          transition: "all 0.3s",
                          background: barColor,
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 12, fontFamily: T.mono, color: T.textDim, width: 56, textAlign: "right", flexShrink: 0 }}>
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
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="gap-report">
          Gap Report
        </h2>
        <p style={{ fontSize: 14, color: T.textMuted, marginBottom: 16 }}>
          Methods with lowest ISD scores and missing critical channels represent potential blind spots
          in test coverage.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {/* Lowest ISD methods */}
          <div style={{ padding: 20, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: T.red }} />
              Lowest ISD Methods
            </h3>
            {lowestMethods.length === 0 ? (
              <p style={{ fontSize: 14, color: T.textDim }}>No methods found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lowestMethods.map((m) => (
                  <div key={m.qualified} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 4, background: T.surface }}>
                    <Badge variant={isdBadgeVariant(getIsd(m))}>{getIsd(m).toFixed(2)}</Badge>
                    <code style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                      {shortName(m.qualified)}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Missing critical channels */}
          <div style={{ padding: 20, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: T.yellow }} />
              Missing Critical Channels
            </h3>
            {methodsWithGaps.length === 0 ? (
              <p style={{ fontSize: 14, color: T.textDim }}>All methods have complete critical channel coverage.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {methodsWithGaps.map(({ method, missingChannels }) => (
                  <div key={method.qualified} style={{ padding: 8, borderRadius: 4, background: T.surface }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <code style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                        {shortName(method.qualified)}
                      </code>
                      <span style={{ fontSize: 12, color: T.textDim, flexShrink: 0 }}>
                        {missingChannels.length} missing
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
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
        <div style={{ marginTop: 16, padding: 20, borderRadius: 8, border: "1px solid " + T.blueBorder, background: T.blueBg }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: T.blue, marginBottom: 8 }}>Recommendations</h3>
          <ul style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, color: T.textMuted, listStyle: "none", padding: 0, margin: 0 }}>
            {lowestMethods.length > 0 && lowestMethods[0] && getIsd(lowestMethods[0]) < 0.2 && (
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: T.blue, marginTop: 2, flexShrink: 0 }}>&#x2022;</span>
                <span>
                  {lowestMethods.filter((m) => getIsd(m) < 0.2).length} method(s) have very low ISD
                  (&lt; 0.2). Consider adding guard clauses, validation, or descriptive naming to
                  improve intent extraction.
                </span>
              </li>
            )}
            {methodsWithGaps.filter((g) => g.missingChannels.includes("guardClauses")).length > 0 && (
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: T.blue, marginTop: 2, flexShrink: 0 }}>&#x2022;</span>
                <span>
                  {methodsWithGaps.filter((g) => g.missingChannels.includes("guardClauses")).length} method(s)
                  lack guard clauses. Adding precondition checks enables automatic boundary-condition test generation.
                </span>
              </li>
            )}
            {methodsWithGaps.filter((g) => g.missingChannels.includes("errorHandling")).length > 0 && (
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: T.blue, marginTop: 2, flexShrink: 0 }}>&#x2022;</span>
                <span>
                  {methodsWithGaps.filter((g) => g.missingChannels.includes("errorHandling")).length} method(s)
                  have no error handling. Adding try-catch blocks enables exception-path test generation.
                </span>
              </li>
            )}
            {totalMethods > 0 && withSignals < totalMethods && (
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: T.blue, marginTop: 2, flexShrink: 0 }}>&#x2022;</span>
                <span>
                  {totalMethods - withSignals} method(s) have no intent signals at all. Ensure the processor
                  can access their source code.
                </span>
              </li>
            )}
            {totalMethods > 0 && avgDensity >= 0.5 && (
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: T.blue, marginTop: 2, flexShrink: 0 }}>&#x2022;</span>
                <span>
                  Overall average ISD is {avgDensity.toFixed(2)}, which is good. The codebase has
                  sufficient signals for meaningful auto-generated tests.
                </span>
              </li>
            )}
            {totalMethods === 0 && (
              <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: T.blue, marginTop: 2, flexShrink: 0 }}>&#x2022;</span>
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
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="methods">
          Methods ({totalMethods})
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
    <div style={{ padding: "12px 16px", borderRadius: 8, background: T.surface, border: "1px solid " + T.surfaceBorder }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textDim }}>{label}</div>
      {subtitle && <div style={{ fontSize: 12, color: T.textDim, marginTop: 2, opacity: 0.7 }}>{subtitle}</div>}
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ color: T.textMuted }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: T.mono, fontWeight: 500, color: T.text }}>{value}</span>
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
    <div style={{ padding: 16, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <code style={{ fontSize: 14, fontFamily: T.mono, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {method.qualified}
        </code>
        <Badge variant={isdBadgeVariant(density)}>{density.toFixed(2)}</Badge>
        {intent && <Badge variant="info">{intent}</Badge>}
      </div>

      {signals && (
        <>
          {/* Density Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <span style={{ fontSize: 12, color: T.textDim, width: 80, flexShrink: 0 }}>Density</span>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: T.surfaceBorder, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 999,
                    background: isdColor(density),
                    width: `${Math.round(density * 100)}%`,
                  }}
                />
              </div>
              <span style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted, width: 40, textAlign: "right", flexShrink: 0 }}>
                {density.toFixed(2)}
              </span>
            </div>

            {/* Quick stats */}
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: T.textDim, flexShrink: 0 }}>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {populatedChannels.map((ch) => (
                <span
                  key={ch.key}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 500,
                    background: T.surfaceBorder,
                    color: T.textDim,
                  }}
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
