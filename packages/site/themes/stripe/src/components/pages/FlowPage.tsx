"use client";

import React, { useState } from "react";
import type { FlowPageData } from "@docspec/core";
import { T, SC } from "../../lib/tokens.js";

interface FlowPageProps {
  data: FlowPageData;
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

export function FlowPage({ data, referenceIndex }: FlowPageProps) {
  const { flow } = data;
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Tag color={T.blue}>FLOW</Tag>
        {flow.trigger && (
          <span style={{ fontSize: 12, color: T.textMuted }}>
            Trigger:{" "}
            <code style={{ fontFamily: T.mono, color: T.accent }}>
              {flow.trigger}
            </code>
          </span>
        )}
      </div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.025em",
          margin: "0 0 6px",
        }}
      >
        {flow.name || flow.id}
      </h1>
      {flow.description && (
        <p
          style={{
            fontSize: 14,
            color: T.textMuted,
            lineHeight: 1.7,
            margin: "0 0 28px",
          }}
        >
          {flow.description}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {flow.steps.map((step, i) => {
          const stepType = step.type || "process";
          const sc = SC[stepType] || SC.process;
          const hovered = hoveredStep === step.id;
          return (
            <div key={step.id}>
              {i > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    height: 16,
                  }}
                >
                  <div
                    style={{
                      width: 2,
                      height: "100%",
                      background: T.surfaceBorder,
                    }}
                  />
                </div>
              )}
              <div
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 20px",
                  borderRadius: 10,
                  border: `2px solid ${hovered ? sc.bd : sc.bd + "40"}`,
                  background: sc.bg,
                  transition: "all 0.2s",
                  cursor: "pointer",
                  maxWidth: 560,
                  transform: hovered ? "translateX(6px)" : "none",
                  boxShadow: hovered ? `0 4px 20px ${sc.bd}15` : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    filter: hovered ? "none" : "grayscale(0.3)",
                    transition: "filter 0.2s",
                  }}
                >
                  {sc.i}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 13.5, fontWeight: 660, color: T.text }}
                  >
                    {step.name || step.id}
                  </div>
                  {step.description && (
                    <div
                      style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}
                    >
                      {step.description}
                    </div>
                  )}
                  {step.actor && (
                    <code
                      style={{
                        fontSize: 11,
                        color: T.textDim,
                        fontFamily: T.mono,
                        display: "block",
                        marginTop: 3,
                      }}
                    >
                      {step.actor}
                    </code>
                  )}
                  {step.dataStoreOps && step.dataStoreOps.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {step.dataStoreOps.map((op, opIdx) => (
                        <div
                          key={opIdx}
                          style={{ fontSize: 10.5, color: T.green }}
                        >
                          {"\uD83D\uDCBE"} {op.operation.toUpperCase()} {op.store}{op.tables ? ` (${op.tables.join(", ")})` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Tag color={sc.bd}>{stepType}</Tag>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
