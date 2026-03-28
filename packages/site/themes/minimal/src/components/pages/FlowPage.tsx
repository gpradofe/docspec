import React from "react";
import type { FlowPageData } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";
import { FlowDiagram } from "../ui/FlowDiagram.js";
import { TraceView } from "../ui/TraceView.js";

interface FlowPageProps {
  data: FlowPageData;
  referenceIndex?: Record<string, string>;
}

export function FlowPage({ data, referenceIndex }: FlowPageProps) {
  const { flow, artifact, traceView } = data;

  return (
    <div>
      <Breadcrumb items={[{ label: "Flows" }, { label: flow.name || flow.id }]} />
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">{flow.name || flow.id}</h1>
      {flow.description && <p className="text-text-secondary mb-4 leading-relaxed">{flow.description}</p>}
      {flow.trigger && <div className="mb-6 text-sm"><span className="text-text-tertiary">Trigger:</span> <Badge variant="info">{flow.trigger}</Badge></div>}

      <h2 className="text-lg font-semibold text-text-primary mb-3">Steps</h2>
      <FlowDiagram steps={flow.steps} referenceIndex={referenceIndex} />

      {traceView && traceView.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Trace</h2>
          <TraceView entries={traceView} />
        </section>
      )}
    </div>
  );
}
