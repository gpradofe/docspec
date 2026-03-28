import React from "react";
import type { IntentGraphPageData, IntentMethod, IntentSignals } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface IntentGraphPageProps { data: IntentGraphPageData; }

export function IntentGraphPage({ data }: IntentGraphPageProps) {
  const { intentGraph, artifact } = data;
  const methods = intentGraph.methods || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Intent Graph</h1>
      <p className="text-text-secondary mb-6">Detailed intent signals for {artifact.label}</p>
      <div className="divide-y divide-border">
        {methods.map((method) => {
          const signals = method.intentSignals;
          const density = signals?.intentDensityScore || 0;
          return (
            <div key={method.qualified} className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-mono font-semibold text-text-primary flex-1 truncate">{method.qualified}</code>
                <Badge variant={density >= 0.7 ? "error" : density >= 0.4 ? "warning" : "success"}>{density.toFixed(2)}</Badge>
              </div>
              {signals?.nameSemantics && (
                <div className="text-sm text-text-secondary">
                  {signals.nameSemantics.verb && <span className="mr-3">Verb: <strong>{signals.nameSemantics.verb}</strong></span>}
                  {signals.nameSemantics.object && <span className="mr-3">Object: <strong>{signals.nameSemantics.object}</strong></span>}
                  {signals.nameSemantics.intent && <Badge variant="info">{signals.nameSemantics.intent}</Badge>}
                </div>
              )}
              {signals?.dataFlow && (
                <div className="text-xs text-text-tertiary mt-1">
                  {signals.dataFlow.reads?.length ? `Reads: ${signals.dataFlow.reads.join(", ")}` : ""}
                  {signals.dataFlow.writes?.length ? ` Writes: ${signals.dataFlow.writes.join(", ")}` : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
