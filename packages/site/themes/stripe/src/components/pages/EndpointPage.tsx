"use client";

import React, { useState } from "react";
import type { EndpointPageData } from "@docspec/core";
import { Breadcrumb } from "../layout/Breadcrumb.js";
import { ParameterTable } from "../ui/ParameterTable.js";
import { LanguageTabs } from "../ui/LanguageTabs.js";

interface EndpointPageProps {
  data: EndpointPageData;
  referenceIndex?: Record<string, string>;
}

const METHOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  POST: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  PUT: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  PATCH: { bg: "#ffedd5", text: "#9a3412", border: "#fdba74" },
  DELETE: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
};

export function EndpointPage({ data, referenceIndex }: EndpointPageProps) {
  const { method, memberName, artifact, examples, responseExample, linkedFlowId } = data;
  const mapping = method.endpointMapping!;
  const httpMethod = mapping.method || "GET";
  const colors = METHOD_COLORS[httpMethod] || METHOD_COLORS.GET;
  const [showFlow, setShowFlow] = useState(false);

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "API Reference", href: "/api" },
          { label: artifact.label },
          { label: `${httpMethod} ${mapping.path}` },
        ]}
      />

      {/* Endpoint header — full width */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
        paddingBottom: 16,
        borderBottom: "1px solid var(--ds-border, #e2e8f0)",
      }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 10px",
          borderRadius: 4,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          letterSpacing: "0.03em",
        }}>
          {httpMethod}
        </span>
        <code style={{
          fontSize: 16,
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          color: "var(--ds-text-primary, #0f172a)",
          fontWeight: 500,
        }}>
          {mapping.path}
        </code>
        {artifact.label && (
          <span style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 4,
            background: "var(--ds-surface-tertiary, #f1f5f9)",
            color: "var(--ds-text-tertiary, #94a3b8)",
            fontFamily: "var(--font-mono)",
          }}>
            {artifact.label}
          </span>
        )}
      </div>

      {/* Two-column split layout */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: 0,
        marginTop: 24,
      }}>
        {/* ═══════ LEFT PANEL (description + parameters) ═══════ */}
        <div style={{ paddingRight: 40 }}>
          {/* Description */}
          {method.description && (
            <p style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--ds-text-secondary, #475569)",
              marginBottom: 32,
            }}>
              {method.description}
            </p>
          )}

          {/* Implementation note */}
          <div style={{
            fontSize: 12,
            color: "var(--ds-text-tertiary, #94a3b8)",
            marginBottom: 32,
            fontFamily: "var(--font-mono)",
          }}>
            Implemented by <code style={{ color: "var(--ds-text-secondary)" }}>{memberName}.{method.name}()</code>
          </div>

          {/* PARAMETERS section */}
          {method.params && method.params.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h3 style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ds-text-tertiary, #94a3b8)",
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: "1px solid var(--ds-border, #e2e8f0)",
              }}>
                Parameters
              </h3>
              <ParameterTable params={method.params} referenceIndex={referenceIndex} />
            </section>
          )}

          {/* ERRORS section */}
          {method.throws && method.throws.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h3 style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ds-text-tertiary, #94a3b8)",
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: "1px solid var(--ds-border, #e2e8f0)",
              }}>
                Errors
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {method.throws.map((t, i) => (
                  <div key={i} style={{
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--ds-border, #e2e8f0)",
                  }}>
                    <code style={{
                      fontSize: 13,
                      fontFamily: "var(--font-mono)",
                      color: "var(--ds-error, #ef4444)",
                    }}>
                      {t.type}
                    </code>
                    {t.description && (
                      <p style={{
                        fontSize: 13,
                        color: "var(--ds-text-secondary, #475569)",
                        marginTop: 4,
                      }}>
                        {t.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ERROR CONDITIONS section */}
          {method.errorConditions && method.errorConditions.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h3 style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ds-text-tertiary, #94a3b8)",
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: "1px solid var(--ds-border, #e2e8f0)",
              }}>
                Error Conditions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {method.errorConditions.map((ec, i) => (
                  <div key={i} style={{
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--ds-border, #e2e8f0)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}>
                    {ec.code && (
                      <span style={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: "var(--ds-error, #ef4444)",
                        background: "#fee2e2",
                        padding: "2px 6px",
                        borderRadius: 3,
                      }}>
                        {ec.code}
                      </span>
                    )}
                    {ec.type && (
                      <code style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ds-text-secondary)" }}>
                        {ec.type}
                      </code>
                    )}
                    {ec.description && (
                      <span style={{ fontSize: 13, color: "var(--ds-text-secondary)", flex: "1 0 100%", marginTop: 4 }}>
                        {ec.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* INTERNAL FLOW (collapsible) */}
          {linkedFlowId && (
            <section style={{ marginBottom: 32 }}>
              <button
                onClick={() => setShowFlow(!showFlow)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ds-text-tertiary, #94a3b8)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  paddingBottom: 8,
                  borderBottom: "1px solid var(--ds-border, #e2e8f0)",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                <svg
                  width="10" height="10" viewBox="0 0 10 10"
                  style={{ transform: showFlow ? "rotate(90deg)" : "none", transition: "transform 0.15s ease" }}
                >
                  <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
                Internal Execution Flow
              </button>
              {showFlow && (
                <div style={{ marginTop: 12 }}>
                  <a
                    href={`/flows/${linkedFlowId}`}
                    style={{
                      fontSize: 13,
                      color: "var(--ds-primary, #6366f1)",
                      textDecoration: "none",
                      transition: "color 0.15s ease",
                    }}
                  >
                    View full flow: {linkedFlowId} →
                  </a>
                </div>
              )}
            </section>
          )}

          {/* PERFORMANCE */}
          {method.performance && (
            <section style={{ marginBottom: 32 }}>
              <h3 style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ds-text-tertiary, #94a3b8)",
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: "1px solid var(--ds-border, #e2e8f0)",
              }}>
                Performance
              </h3>
              <div style={{
                display: "flex",
                gap: 24,
                fontSize: 13,
              }}>
                {method.performance.expectedLatency && (
                  <div>
                    <span style={{ color: "var(--ds-text-tertiary)" }}>Latency: </span>
                    <span style={{ color: "var(--ds-text-primary)", fontWeight: 500 }}>
                      {method.performance.expectedLatency}
                    </span>
                  </div>
                )}
                {method.performance.bottleneck && (
                  <div>
                    <span style={{ color: "var(--ds-text-tertiary)" }}>Bottleneck: </span>
                    <span style={{ color: "var(--ds-text-primary)", fontWeight: 500 }}>
                      {method.performance.bottleneck}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ═══════ RIGHT PANEL (dark, sticky, code examples + response) ═══════ */}
        <div style={{
          position: "sticky",
          top: 68,
          alignSelf: "start",
          background: "var(--ds-code-bg, #0f172a)",
          borderRadius: 8,
          padding: 0,
          maxHeight: "calc(100vh - 84px)",
          overflowY: "auto",
        }}>
          {/* Request examples with language tabs */}
          {examples && Object.keys(examples).length > 0 && (
            <div>
              <LanguageTabs examples={examples} title="Request" />
            </div>
          )}

          {/* Response preview */}
          {(responseExample || (method.returns && method.returns.type)) && (
            <div style={{
              borderTop: examples ? "1px solid var(--ds-code-border, #1e293b)" : "none",
            }}>
              <div style={{
                padding: "8px 16px",
                background: "var(--ds-code-surface, #0c1222)",
                borderBottom: "1px solid var(--ds-code-border, #1e293b)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--ds-text-tertiary, #94a3b8)",
                  letterSpacing: "0.02em",
                }}>
                  Response
                </span>
                <span style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: "#166534",
                  color: "#4ade80",
                }}>
                  200
                </span>
                {method.returns?.type && (
                  <code style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--ds-text-tertiary, #64748b)",
                    marginLeft: "auto",
                  }}>
                    {method.returns.type}
                  </code>
                )}
              </div>
              <div style={{
                padding: 16,
                background: "var(--ds-code-bg, #0f172a)",
                overflowX: "auto",
              }}>
                {responseExample ? (
                  <pre style={{ margin: 0 }}>
                    <code style={{
                      fontSize: 12.5,
                      lineHeight: 1.65,
                      color: "var(--ds-code-text, #e2e8f0)",
                      fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    }}>
                      {responseExample}
                    </code>
                  </pre>
                ) : (
                  <code style={{
                    fontSize: 12.5,
                    color: "var(--ds-text-tertiary, #64748b)",
                    fontFamily: "var(--font-mono)",
                  }}>
                    {method.returns?.type || "void"}
                  </code>
                )}
              </div>
            </div>
          )}

          {/* Fallback: if no examples and no response, show a placeholder */}
          {(!examples || Object.keys(examples).length === 0) && !responseExample && !method.returns?.type && (
            <div style={{
              padding: 24,
              color: "var(--ds-text-tertiary, #64748b)",
              fontSize: 13,
              fontFamily: "var(--font-mono)",
              textAlign: "center",
            }}>
              No code examples available
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Related cross-links */}
      <div style={{
        marginTop: 40,
        paddingTop: 20,
        borderTop: "1px solid var(--ds-border, #e2e8f0)",
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
      }}>
        {method.throws && method.throws.length > 0 && (
          <a href="/errors" style={{
            fontSize: 13,
            color: "var(--ds-primary, #6366f1)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--ds-border, #e2e8f0)",
            transition: "all 0.15s ease",
          }}>
            Related Errors ({method.throws.length})
          </a>
        )}
        {linkedFlowId && (
          <a href={`/flows/${linkedFlowId}`} style={{
            fontSize: 13,
            color: "var(--ds-primary, #6366f1)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--ds-border, #e2e8f0)",
            transition: "all 0.15s ease",
          }}>
            Execution Flow
          </a>
        )}
      </div>
    </div>
  );
}
