"use client";

import React, { useState } from "react";
import type { EndpointPageData } from "@docspec/core";
import { T, MC } from "../../lib/tokens.js";

interface EndpointPageProps {
  data: EndpointPageData;
  referenceIndex?: Record<string, string>;
}

function Tag({ children, color = T.accent }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 4,
        background: color + "14",
        color,
        border: `1px solid ${color}30`,
        fontFamily: T.mono,
        letterSpacing: "0.02em",
        lineHeight: "16px",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

export function EndpointPage({ data, referenceIndex }: EndpointPageProps) {
  const { method, memberName, artifact, examples, responseExample, linkedFlowId } = data;
  const mapping = method.endpointMapping!;
  const httpMethod = mapping.method || "GET";
  const colors = MC[httpMethod] || MC.GET;
  const [lang, setLang] = useState<string>(
    examples && Object.keys(examples).length > 0
      ? Object.keys(examples)[0]
      : "cli",
  );
  const langs = examples ? Object.keys(examples) : [];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Method badge + path */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <Tag color={colors.text}>{httpMethod}</Tag>
        <code
          style={{
            fontSize: 15,
            fontWeight: 550,
            fontFamily: T.mono,
            color: T.text,
          }}
        >
          {mapping.path}
        </code>
      </div>
      {/* Title */}
      <h2
        style={{
          fontSize: 22,
          fontWeight: 720,
          color: T.text,
          letterSpacing: "-0.02em",
          margin: "0 0 8px",
        }}
      >
        {method.name}
      </h2>
      {/* Description */}
      {method.description && (
        <p
          style={{
            fontSize: 14,
            color: T.textMuted,
            lineHeight: 1.7,
            margin: "0 0 24px",
            maxWidth: 520,
          }}
        >
          {method.description}
        </p>
      )}

      {/* Split layout */}
      <div
        style={{
          display: "flex",
          border: `1px solid ${T.surfaceBorder}`,
          borderRadius: 10,
          overflow: "hidden",
          minHeight: 500,
        }}
      >
        {/* Left panel: parameters + internal pipeline */}
        <div style={{ flex: 1, padding: "24px 28px", overflow: "auto" }}>
          {/* PARAMETERS section */}
          {method.params && method.params.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: T.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                }}
              >
                Parameters
              </div>
              {method.params.map((p) => (
                <div
                  key={p.name}
                  style={{
                    padding: "10px 0",
                    borderBottom: `1px solid ${T.surfaceBorder}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 3,
                    }}
                  >
                    <code
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: T.text,
                        fontFamily: T.mono,
                      }}
                    >
                      {p.name}
                    </code>
                    <span
                      style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}
                    >
                      {p.type}
                    </span>
                    {p.required && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: T.red,
                          textTransform: "uppercase",
                        }}
                      >
                        required
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <div
                      style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}
                    >
                      {p.description}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ERRORS section */}
          {method.throws && method.throws.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: T.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginTop: 24,
                  marginBottom: 10,
                }}
              >
                Errors
              </div>
              {method.throws.map((t, i) => (
                <div
                  key={i}
                  style={{
                    padding: "6px 0",
                    borderBottom: `1px solid ${T.surfaceBorder}`,
                    fontSize: 12.5,
                  }}
                >
                  <code style={{ color: T.red, fontFamily: T.mono }}>
                    {t.type}
                  </code>
                  {t.description && (
                    <span style={{ color: T.textMuted }}> &mdash; {t.description}</span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ERROR CONDITIONS section */}
          {method.errorConditions && method.errorConditions.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: T.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginTop: 24,
                  marginBottom: 10,
                }}
              >
                Error Conditions
              </div>
              {method.errorConditions.map((ec, i) => (
                <div
                  key={i}
                  style={{
                    padding: "6px 0",
                    borderBottom: `1px solid ${T.surfaceBorder}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    fontSize: 12.5,
                  }}
                >
                  {ec.code && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.red,
                        fontFamily: T.mono,
                        background: T.redBg,
                        padding: "1px 5px",
                        borderRadius: 3,
                      }}
                    >
                      {ec.code}
                    </span>
                  )}
                  {ec.type && (
                    <code style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted }}>
                      {ec.type}
                    </code>
                  )}
                  {ec.description && (
                    <span style={{ color: T.textMuted, flex: "1 0 100%", marginTop: 2 }}>
                      {ec.description}
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* INTERNAL PIPELINE */}
          {linkedFlowId && (
            <>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: T.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginTop: 24,
                  marginBottom: 10,
                }}
              >
                Internal Pipeline
              </div>
              <div
                style={{
                  fontFamily: T.mono,
                  fontSize: 11.5,
                  color: T.textMuted,
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: T.surface,
                  border: `1px solid ${T.surfaceBorder}`,
                  lineHeight: 2,
                }}
              >
                <div>
                  {"\u2192"} {memberName}.{method.name}()
                </div>
                <div style={{ color: T.accent }}>
                  {"  \u2192"} Flow: {linkedFlowId}
                </div>
              </div>
            </>
          )}

          {/* PERFORMANCE */}
          {method.performance && (
            <>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: T.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginTop: 24,
                  marginBottom: 10,
                }}
              >
                Performance
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  fontSize: 12.5,
                }}
              >
                {method.performance.expectedLatency && (
                  <div>
                    <span style={{ color: T.textDim }}>Latency: </span>
                    <span style={{ color: T.text, fontWeight: 500 }}>
                      {method.performance.expectedLatency}
                    </span>
                  </div>
                )}
                {method.performance.bottleneck && (
                  <div>
                    <span style={{ color: T.textDim }}>Bottleneck: </span>
                    <span style={{ color: T.text, fontWeight: 500 }}>
                      {method.performance.bottleneck}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right panel: dark code area */}
        <div
          style={{
            width: 380,
            background: T.codeBg,
            borderLeft: `1px solid ${T.codeBorder}`,
            flexShrink: 0,
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Code examples with language tabs */}
          {langs.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 650,
                  color: T.textFaint,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Usage
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 6,
                  padding: 3,
                }}
              >
                {langs.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      flex: 1,
                      padding: "5px 4px",
                      fontSize: 10.5,
                      fontWeight: lang === l ? 650 : 400,
                      background:
                        lang === l ? "rgba(255,255,255,0.07)" : "transparent",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      color: lang === l ? T.text : "rgba(255,255,255,0.25)",
                      fontFamily: T.mono,
                      transition: "all 0.15s",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div
                style={{
                  borderRadius: 9,
                  overflow: "hidden",
                  border: `1px solid ${T.codeBorder}`,
                  background: T.codeBg,
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    padding: "14px 16px",
                    overflowX: "auto",
                  }}
                >
                  <code
                    style={{
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: T.text,
                      fontFamily: T.mono,
                    }}
                  >
                    {examples?.[lang] || ""}
                  </code>
                </pre>
              </div>
            </>
          )}

          {/* OUTPUT section */}
          {(responseExample || method.returns?.type) && (
            <>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 650,
                  color: T.textFaint,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginTop: 8,
                }}
              >
                Output
              </div>
              <div
                style={{
                  borderRadius: 9,
                  overflow: "hidden",
                  border: `1px solid ${T.codeBorder}`,
                  background: T.codeBg,
                }}
              >
                {method.returns?.type && (
                  <div
                    style={{
                      padding: "6px 14px",
                      borderBottom: `1px solid ${T.codeBorder}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: T.mono,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 3,
                        background: "rgba(52,211,153,0.15)",
                        color: T.green,
                      }}
                    >
                      200
                    </span>
                    <code
                      style={{
                        fontSize: 11,
                        fontFamily: T.mono,
                        color: T.textDim,
                      }}
                    >
                      {method.returns.type}
                    </code>
                  </div>
                )}
                <pre
                  style={{
                    margin: 0,
                    padding: "14px 16px",
                    overflowX: "auto",
                  }}
                >
                  <code
                    style={{
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: T.text,
                      fontFamily: T.mono,
                    }}
                  >
                    {responseExample || method.returns?.type || "void"}
                  </code>
                </pre>
              </div>
            </>
          )}

          {/* Fallback */}
          {langs.length === 0 && !responseExample && !method.returns?.type && (
            <div
              style={{
                padding: 24,
                color: T.textDim,
                fontSize: 13,
                fontFamily: T.mono,
                textAlign: "center",
              }}
            >
              No code examples available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
