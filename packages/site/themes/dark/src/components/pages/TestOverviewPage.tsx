import React from "react";
import type { TestOverviewPageData, IntentMethod } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface TestOverviewPageProps {
  data: TestOverviewPageData;
}

export function TestOverviewPage({ data }: TestOverviewPageProps) {
  const { intentGraph, artifact } = data;
  const methods = intentGraph.methods || [];

  const totalMethods = methods.length;
  const withSignals = methods.filter((m) => m.intentSignals).length;
  const avgDensity = totalMethods > 0
    ? methods.reduce((sum, m) => sum + (m.intentSignals?.intentDensityScore || 0), 0) / totalMethods
    : 0;
  const highComplexity = methods.filter((m) => (m.intentSignals?.intentDensityScore || 0) >= 0.7).length;

  return (
    <div>
      <Breadcrumb items={[{ label: "Architecture", href: "/architecture" }, { label: artifact.label }, { label: "Test Overview" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Test Overview</h1>
      <p className="text-text-secondary mb-4">Intent analysis and test strategy insights for {artifact.label}.</p>

      <div className="flex flex-wrap gap-4 mb-8">
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{totalMethods}</div>
          <div className="text-xs text-text-tertiary">Methods Analyzed</div>
        </div>
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{withSignals}</div>
          <div className="text-xs text-text-tertiary">With Intent Signals</div>
        </div>
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{avgDensity.toFixed(2)}</div>
          <div className="text-xs text-text-tertiary">Avg. Density Score</div>
        </div>
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{highComplexity}</div>
          <div className="text-xs text-text-tertiary">High Complexity</div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="methods">Methods ({totalMethods})</h2>
        <div className="space-y-2">
          {methods.map((method) => <MethodRow key={method.qualified} method={method} />)}
        </div>
      </section>
    </div>
  );
}

function MethodRow({ method }: { method: IntentMethod }) {
  const signals = method.intentSignals;
  const density = signals?.intentDensityScore || 0;
  const intent = signals?.nameSemantics?.intent;

  return (
    <div className="p-4 rounded-lg border border-border">
      <div className="flex items-center gap-3 mb-2">
        <code className="text-sm font-mono text-text-primary flex-1 min-w-0 truncate">{method.qualified}</code>
        {intent && <Badge variant="info">{intent}</Badge>}
      </div>
      {signals && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-text-tertiary w-20 flex-shrink-0">Density</span>
            <div className="flex-1 h-2 rounded-full bg-surface-tertiary overflow-hidden">
              <div
                className={`h-full rounded-full ${density >= 0.7 ? "bg-red-500" : density >= 0.4 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.round(density * 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono text-text-secondary w-10 text-right flex-shrink-0">{density.toFixed(2)}</span>
          </div>
          <div className="flex gap-3 text-xs text-text-tertiary flex-shrink-0">
            {signals.guardClauses !== undefined && (
              <span>{typeof signals.guardClauses === "number" ? signals.guardClauses : signals.guardClauses.length} guard{(typeof signals.guardClauses === "number" ? signals.guardClauses : signals.guardClauses.length) !== 1 ? "s" : ""}</span>
            )}
            {signals.branches !== undefined && (
              <span>{typeof signals.branches === "number" ? signals.branches : signals.branches.length} branch{(typeof signals.branches === "number" ? signals.branches : signals.branches.length) !== 1 ? "es" : ""}</span>
            )}
            {signals.errorHandling?.catchBlocks !== undefined && <span>{signals.errorHandling.catchBlocks} catch</span>}
          </div>
        </div>
      )}
    </div>
  );
}
