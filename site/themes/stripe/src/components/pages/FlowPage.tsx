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
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: "Flows" },
          { label: flow.name || flow.id },
        ]}
      />

      <h1 className="text-2xl font-bold text-text-primary mb-2">
        {flow.name || flow.id}
      </h1>

      {flow.description && (
        <p className="text-text-secondary mb-4">{flow.description}</p>
      )}

      {flow.trigger && (
        <div className="flex items-center gap-2 mb-8">
          <span className="text-sm text-text-tertiary">Trigger:</span>
          <Badge variant="info">{flow.trigger}</Badge>
        </div>
      )}

      {/* Flow Diagram */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="diagram">
          Flow Diagram
        </h2>
        <FlowDiagram steps={flow.steps} referenceIndex={referenceIndex} />
      </section>

      {/* Steps Detail */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="steps">
          Steps ({flow.steps.length})
        </h2>
        <div className="space-y-3">
          {flow.steps.map((step, i) => {
            const actorUrl = step.actorQualified && referenceIndex?.[step.actorQualified];
            return (
              <div key={step.id} className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {step.name || step.id}
                  </span>
                  {step.type && <Badge>{step.type}</Badge>}
                  {step.ai && <Badge variant="primary">AI</Badge>}
                </div>

                <div className="ml-8">
                  {step.actor && (
                    <div className="text-sm mb-1">
                      <span className="text-text-tertiary">Actor: </span>
                      {actorUrl ? (
                        <a href={`/${actorUrl}`} className="text-primary-600 hover:underline font-mono">
                          {step.actor}
                        </a>
                      ) : (
                        <code className="font-mono text-text-secondary">{step.actor}</code>
                      )}
                    </div>
                  )}

                  {step.description && (
                    <p className="text-sm text-text-secondary mb-1">{step.description}</p>
                  )}

                  <div className="flex gap-4 text-xs text-text-tertiary">
                    {step.inputs && step.inputs.length > 0 && (
                      <span>In: {step.inputs.join(", ")}</span>
                    )}
                    {step.outputs && step.outputs.length > 0 && (
                      <span>Out: {step.outputs.join(", ")}</span>
                    )}
                    {step.retryTarget && (
                      <span className="text-error">Retries → {step.retryTarget}</span>
                    )}
                  </div>

                  {/* Data Store Operations */}
                  {step.dataStoreOps && step.dataStoreOps.length > 0 && (
                    <div className="mt-2 p-2 rounded bg-surface-secondary text-xs">
                      <span className="text-text-tertiary font-medium">Data Store Ops:</span>
                      <div className="mt-1 space-y-1">
                        {step.dataStoreOps.map((op, j) => (
                          <div key={j} className="flex items-center gap-2">
                            {op.store && (
                              <code className="font-mono text-text-secondary">{op.store}</code>
                            )}
                            {op.operation && (
                              <Badge>{op.operation}</Badge>
                            )}
                            {op.tables && op.tables.length > 0 && (
                              <span className="text-text-tertiary">
                                ({op.tables.join(", ")})
                              </span>
                            )}
                            {op.transactional && (
                              <Badge variant="warning">txn</Badge>
                            )}
                            {op.cascading && (
                              <Badge variant="info">cascade</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Config Dependencies */}
                  {step.configDependencies && step.configDependencies.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                      <span className="text-text-tertiary font-medium">Config:</span>
                      {step.configDependencies.map((cfg) => (
                        <code
                          key={cfg}
                          className="px-1.5 py-0.5 rounded bg-surface-secondary font-mono text-text-secondary border border-border"
                        >
                          {cfg}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trace View */}
      {traceView && traceView.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="trace">
            Trace View
          </h2>
          <TraceView entries={traceView} />
        </section>
      )}
    </div>
  );
}
