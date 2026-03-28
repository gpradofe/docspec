import React from "react";
import type { IntentGraphPageData, IntentMethod, IntentSignals } from "@docspec/core";
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
      <Breadcrumb items={[{ label: "Architecture", href: "/architecture" }, { label: artifact.label }, { label: "Intent Graph" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Intent Graph</h1>
      <p className="text-text-secondary mb-8">Detailed intent signals for each method in {artifact.label}.</p>

      <div className="space-y-6">
        {methods.map((method) => <MethodDetailCard key={method.qualified} method={method} />)}
      </div>
    </div>
  );
}

function MethodDetailCard({ method }: { method: IntentMethod }) {
  const signals = method.intentSignals;
  const density = signals?.intentDensityScore || 0;

  return (
    <div className="p-5 rounded-lg border border-border" id={`method-${slugify(method.qualified)}`}>
      <div className="flex items-center gap-3 mb-3">
        <code className="text-sm font-mono font-semibold text-text-primary flex-1 min-w-0 truncate">{method.qualified}</code>
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
    <div className="space-y-4">
      {signals.nameSemantics && (
        <div className="p-3 rounded-lg bg-surface-secondary">
          <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">Name Semantics</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            {signals.nameSemantics.verb && <div><span className="text-text-tertiary">Verb: </span><span className="text-text-primary font-medium">{signals.nameSemantics.verb}</span></div>}
            {signals.nameSemantics.object && <div><span className="text-text-tertiary">Object: </span><span className="text-text-primary font-medium">{signals.nameSemantics.object}</span></div>}
            {signals.nameSemantics.intent && <div><span className="text-text-tertiary">Intent: </span><Badge variant="info">{signals.nameSemantics.intent}</Badge></div>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {signals.guardClauses !== undefined && <MetricCard label="Guard Clauses" value={typeof signals.guardClauses === "number" ? signals.guardClauses : signals.guardClauses.length} />}
        {signals.branches !== undefined && <MetricCard label="Branches" value={typeof signals.branches === "number" ? signals.branches : signals.branches.length} />}
        {signals.errorHandling?.catchBlocks !== undefined && <MetricCard label="Catch Blocks" value={signals.errorHandling.catchBlocks} />}
        {signals.intentDensityScore !== undefined && <MetricCard label="Density Score" value={signals.intentDensityScore.toFixed(2)} />}
      </div>

      {signals.errorHandling?.caughtTypes && signals.errorHandling.caughtTypes.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">Caught Exception Types</h4>
          <div className="flex flex-wrap gap-2">
            {signals.errorHandling.caughtTypes.map((type) => (
              <code key={type} className="px-2 py-1 rounded bg-red-950 text-red-400 text-xs font-mono">{type}</code>
            ))}
          </div>
        </div>
      )}

      {signals.dataFlow && (
        <div className="p-3 rounded-lg bg-surface-secondary">
          <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">Data Flow</h4>
          <div className="space-y-2 text-sm">
            {signals.dataFlow.reads && signals.dataFlow.reads.length > 0 && (
              <div><span className="text-text-tertiary">Reads: </span><span className="text-text-secondary">{signals.dataFlow.reads.join(", ")}</span></div>
            )}
            {signals.dataFlow.writes && signals.dataFlow.writes.length > 0 && (
              <div><span className="text-text-tertiary">Writes: </span><span className="text-text-secondary">{signals.dataFlow.writes.join(", ")}</span></div>
            )}
          </div>
        </div>
      )}

      {signals.loopProperties && (
        <div className="flex flex-wrap gap-2">
          {signals.loopProperties.hasStreams && <Badge variant="info">streams</Badge>}
          {signals.loopProperties.hasEnhancedFor && <Badge variant="info">enhanced-for</Badge>}
        </div>
      )}

      {signals.dependencies && signals.dependencies.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">Dependencies</h4>
          <div className="flex flex-wrap gap-2">
            {signals.dependencies.map((dep, i) => (
              <code key={typeof dep === "string" ? dep : dep.name ?? i} className="px-2 py-1 rounded bg-surface-secondary text-xs font-mono text-text-secondary border border-border">
                {typeof dep === "string" ? dep : dep.name ?? "unknown"}
              </code>
            ))}
          </div>
        </div>
      )}

      {signals.constants && signals.constants.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">Constants</h4>
          <div className="flex flex-wrap gap-2">
            {signals.constants.map((c, i) => <Badge key={typeof c === "string" ? c : c.name ?? i}>{typeof c === "string" ? c : c.name ?? "unknown"}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-surface-secondary border border-border text-center">
      <div className="text-lg font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-tertiary">{label}</div>
    </div>
  );
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
