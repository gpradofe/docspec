import React from "react";
import type { IntentGraphPageData, IntentMethod, IntentSignals } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface IntentGraphPageProps {
  data: IntentGraphPageData;
}

export function IntentGraphPage({ data }: IntentGraphPageProps) {
  const { intentGraph, artifact } = data;
  const methods = intentGraph.methods || [];

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: artifact.label },
          { label: "Intent Graph" },
        ]}
      />

      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8 }}>Intent Graph</h1>
      <p style={{ color: T.textMuted, marginBottom: 32 }}>
        Detailed intent signals for each method in {artifact.label}.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {methods.map((method) => (
          <MethodDetailCard key={method.qualified} method={method} />
        ))}
      </div>
    </div>
  );
}

function MethodDetailCard({ method }: { method: IntentMethod }) {
  const signals = method.intentSignals;
  const density = signals?.intentDensityScore || 0;

  return (
    <div style={{ padding: 20, borderRadius: 8, border: "1px solid " + T.surfaceBorder }} id={`method-${slugify(method.qualified)}`}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <code style={{ fontSize: 14, fontFamily: T.mono, fontWeight: 600, color: T.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {method.qualified}
        </code>
        <DensityBadge score={density} />
      </div>

      {signals && <SignalsDetail signals={signals} />}
    </div>
  );
}

function DensityBadge({ score }: { score: number }) {
  const variant = score >= 0.7 ? "error" : score >= 0.4 ? "warning" : "success";
  return <Badge variant={variant}>{score.toFixed(2)}</Badge>;
}

function SignalsDetail({ signals }: { signals: IntentSignals }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Name Semantics */}
      {signals.nameSemantics && (
        <div style={{ padding: 12, borderRadius: 8, background: T.surface }}>
          <h4 style={{ fontSize: 12, fontWeight: 500, color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>Name Semantics</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14 }}>
            {signals.nameSemantics.verb && (
              <div>
                <span style={{ color: T.textDim }}>Verb: </span>
                <span style={{ color: T.text, fontWeight: 500 }}>{signals.nameSemantics.verb}</span>
              </div>
            )}
            {signals.nameSemantics.object && (
              <div>
                <span style={{ color: T.textDim }}>Object: </span>
                <span style={{ color: T.text, fontWeight: 500 }}>{signals.nameSemantics.object}</span>
              </div>
            )}
            {signals.nameSemantics.intent && (
              <div>
                <span style={{ color: T.textDim }}>Intent: </span>
                <Badge variant="info">{signals.nameSemantics.intent}</Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control Flow Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        {signals.guardClauses !== undefined && (
          <MetricCard label="Guard Clauses" value={typeof signals.guardClauses === "number" ? signals.guardClauses : signals.guardClauses.length} />
        )}
        {signals.branches !== undefined && (
          <MetricCard label="Branches" value={typeof signals.branches === "number" ? signals.branches : signals.branches.length} />
        )}
        {signals.errorHandling?.catchBlocks !== undefined && (
          <MetricCard label="Catch Blocks" value={signals.errorHandling.catchBlocks} />
        )}
        {signals.intentDensityScore !== undefined && (
          <MetricCard label="Density Score" value={signals.intentDensityScore.toFixed(2)} />
        )}
      </div>

      {/* Error Handling */}
      {signals.errorHandling?.caughtTypes && signals.errorHandling.caughtTypes.length > 0 && (
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 500, color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>Caught Exception Types</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {signals.errorHandling.caughtTypes.map((type) => (
              <code
                key={type}
                style={{ padding: "4px 8px", borderRadius: 4, background: T.redBg, color: T.red, fontSize: 12, fontFamily: T.mono }}
              >
                {type}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Data Flow */}
      {signals.dataFlow && (
        <div style={{ padding: 12, borderRadius: 8, background: T.surface }}>
          <h4 style={{ fontSize: 12, fontWeight: 500, color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>Data Flow</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            {signals.dataFlow.reads && signals.dataFlow.reads.length > 0 && (
              <div>
                <span style={{ color: T.textDim }}>Reads: </span>
                <span style={{ color: T.textMuted }}>{signals.dataFlow.reads.join(", ")}</span>
              </div>
            )}
            {signals.dataFlow.writes && signals.dataFlow.writes.length > 0 && (
              <div>
                <span style={{ color: T.textDim }}>Writes: </span>
                <span style={{ color: T.textMuted }}>{signals.dataFlow.writes.join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loop Properties */}
      {signals.loopProperties && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {signals.loopProperties.hasStreams && <Badge variant="info">streams</Badge>}
          {signals.loopProperties.hasEnhancedFor && <Badge variant="info">enhanced-for</Badge>}
        </div>
      )}

      {/* Dependencies */}
      {signals.dependencies && signals.dependencies.length > 0 && (
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 500, color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>Dependencies</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {signals.dependencies.map((dep, i) => (
              <code
                key={typeof dep === "string" ? dep : dep.name ?? i}
                style={{ padding: "4px 8px", borderRadius: 4, background: T.surface, fontSize: 12, fontFamily: T.mono, color: T.textMuted, border: "1px solid " + T.surfaceBorder }}
              >
                {typeof dep === "string" ? dep : dep.name ?? "unknown"}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Constants */}
      {signals.constants && signals.constants.length > 0 && (
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 500, color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>Constants</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {signals.constants.map((c, i) => (
              <Badge key={typeof c === "string" ? c : c.name ?? i}>{typeof c === "string" ? c : c.name ?? "unknown"}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: "8px 12px", borderRadius: 8, background: T.surface, border: "1px solid " + T.surfaceBorder, textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textDim }}>{label}</div>
    </div>
  );
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
