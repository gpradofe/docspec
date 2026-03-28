import React from "react";
import type { FlowPageData } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";
import { FlowDiagram } from "../ui/FlowDiagram.js";
import { TraceView } from "../ui/TraceView.js";

function getStoreIcon(store: string): string {
  const s = store.toLowerCase();
  if (s.includes("postgres") || s.includes("mysql") || s.includes("sql")) return "\uD83D\uDCBE";
  if (s.includes("redis") || s.includes("cache") || s.includes("memcached")) return "\u26A1";
  if (s.includes("kafka") || s.includes("rabbit") || s.includes("sqs")) return "\uD83D\uDCE8";
  if (s.includes("mongo") || s.includes("dynamo") || s.includes("cosmos")) return "\uD83D\uDDC4\uFE0F";
  if (s.includes("elastic") || s.includes("solr")) return "\uD83D\uDD0D";
  if (s.includes("s3") || s.includes("blob") || s.includes("gcs")) return "\uD83D\uDCE6";
  return "\uD83D\uDCBE";
}

function getOpColor(op: string): { bg: string; text: string } {
  const o = op.toUpperCase();
  if (o === "INSERT" || o === "CREATE" || o === "PUBLISH") return { bg: "#dcfce7", text: "#166534" };
  if (o === "SELECT" || o === "READ" || o === "GET") return { bg: "#dbeafe", text: "#1d4ed8" };
  if (o === "UPDATE" || o === "PATCH") return { bg: "#fef3c7", text: "#92400e" };
  if (o === "DELETE" || o === "DROP") return { bg: "#fee2e2", text: "#991b1b" };
  return { bg: "#f1f5f9", text: "#475569" };
}

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
                    <div style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: "var(--ds-surface-secondary, #f8fafc)",
                      border: "1px solid var(--ds-border, #e2e8f0)",
                    }}>
                      {step.dataStoreOps.map((op, opIdx) => (
                        <div key={opIdx} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 0",
                          fontSize: 13,
                        }}>
                          {/* Store icon */}
                          <span style={{ fontSize: 14 }}>
                            {getStoreIcon(op.store)}
                          </span>
                          {/* Store name */}
                          <span style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 500,
                            color: "var(--ds-text-primary)",
                            fontSize: 12,
                          }}>
                            {op.store}:
                          </span>
                          {/* Operation badge */}
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            fontFamily: "var(--font-mono)",
                            padding: "1px 5px",
                            borderRadius: 3,
                            background: getOpColor(op.operation).bg,
                            color: getOpColor(op.operation).text,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}>
                            {op.operation}
                          </span>
                          {/* Tables */}
                          {op.tables && (
                            <span style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              color: "var(--ds-text-secondary)",
                            }}>
                              {op.tables.join(", ")}
                            </span>
                          )}
                          {/* Transaction badge */}
                          {op.transactional && (
                            <span style={{
                              fontSize: 10,
                              fontFamily: "var(--font-mono)",
                              padding: "1px 5px",
                              borderRadius: 3,
                              background: "#fef3c7",
                              color: "#92400e",
                            }}>
                              @Transactional
                            </span>
                          )}
                          {/* Cascading badge */}
                          {op.cascading && (
                            <span style={{
                              fontSize: 10,
                              fontFamily: "var(--font-mono)",
                              padding: "1px 5px",
                              borderRadius: 3,
                              background: "#dbeafe",
                              color: "#1d4ed8",
                            }}>
                              cascade
                            </span>
                          )}
                        </div>
                      ))}
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
