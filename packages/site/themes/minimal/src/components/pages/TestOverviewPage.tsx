import React from "react";
import type { TestOverviewPageData, IntentMethod } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface TestOverviewPageProps { data: TestOverviewPageData; }

export function TestOverviewPage({ data }: TestOverviewPageProps) {
  const { intentGraph, artifact } = data;
  const methods = intentGraph.methods || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Test Overview</h1>
      <p className="text-text-secondary mb-6">Intent analysis for {artifact.label} ({methods.length} methods)</p>
      <div className="divide-y divide-border">
        {methods.map((method) => {
          const density = method.intentSignals?.intentDensityScore || 0;
          const intent = method.intentSignals?.nameSemantics?.intent;
          return (
            <div key={method.qualified} className="py-3">
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-text-primary flex-1 truncate">{method.qualified}</code>
                {intent && <Badge variant="info">{intent}</Badge>}
                <span className={`text-xs font-mono ${density >= 0.7 ? "text-error" : density >= 0.4 ? "text-warning" : "text-success"}`}>{density.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
