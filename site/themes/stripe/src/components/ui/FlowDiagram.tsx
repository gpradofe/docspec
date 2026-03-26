import React from "react";
import type { FlowStep } from "@docspec/core";

interface FlowDiagramProps {
  steps: FlowStep[];
  referenceIndex?: Record<string, string>;
}

const STEP_TYPE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  process: { bg: "#eef2ff", border: "#818cf8", icon: "⚙️" },
  ai: { bg: "#faf5ff", border: "#a855f7", icon: "🧠" },
  storage: { bg: "#f0fdf4", border: "#22c55e", icon: "💾" },
  trigger: { bg: "#fff7ed", border: "#f97316", icon: "⚡" },
  retry: { bg: "#fef2f2", border: "#ef4444", icon: "🔄" },
  external: { bg: "#f0f9ff", border: "#0ea5e9", icon: "🌐" },
  bridge: { bg: "#fefce8", border: "#eab308", icon: "🌉" },
  observability: { bg: "#f5f3ff", border: "#8b5cf6", icon: "📊" },
};

const BOX_WIDTH = 220;
const BOX_HEIGHT = 60;
const GAP = 24;
const PADDING = 40;

export function FlowDiagram({ steps, referenceIndex }: FlowDiagramProps) {
  if (steps.length === 0) return null;

  const totalWidth = BOX_WIDTH + PADDING * 2;
  const totalHeight = steps.length * (BOX_HEIGHT + GAP) - GAP + PADDING * 2;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="w-full max-w-xs mx-auto"
      style={{ maxHeight: `${Math.min(totalHeight, 600)}px` }}
    >
      {steps.map((step, i) => {
        const x = PADDING;
        const y = PADDING + i * (BOX_HEIGHT + GAP);
        const colors = STEP_TYPE_COLORS[step.type || "process"] || STEP_TYPE_COLORS.process;
        const url = step.actorQualified && referenceIndex?.[step.actorQualified];

        return (
          <React.Fragment key={step.id}>
            {/* Arrow from previous step */}
            {i > 0 && (
              <line
                x1={x + BOX_WIDTH / 2}
                y1={y - GAP}
                x2={x + BOX_WIDTH / 2}
                y2={y}
                stroke="#d1d5db"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            )}

            {/* Box */}
            <g>
              {url ? (
                <a href={`/${url}`}>
                  <rect
                    x={x} y={y}
                    width={BOX_WIDTH} height={BOX_HEIGHT}
                    rx={8} ry={8}
                    fill={colors.bg}
                    stroke={colors.border}
                    strokeWidth="2"
                    className="cursor-pointer"
                  />
                </a>
              ) : (
                <rect
                  x={x} y={y}
                  width={BOX_WIDTH} height={BOX_HEIGHT}
                  rx={8} ry={8}
                  fill={colors.bg}
                  stroke={colors.border}
                  strokeWidth="2"
                />
              )}

              {/* Step name */}
              <text
                x={x + 12}
                y={y + 24}
                fontSize="13"
                fontWeight="600"
                fill="#111827"
              >
                {colors.icon} {step.name || step.actor || step.id}
              </text>

              {/* Actor name */}
              {step.actor && step.name && (
                <text
                  x={x + 12}
                  y={y + 44}
                  fontSize="11"
                  fill="#6b7280"
                >
                  {step.actor}
                </text>
              )}
            </g>

            {/* Retry arrow */}
            {step.retryTarget && (
              <path
                d={`M ${x + BOX_WIDTH} ${y + BOX_HEIGHT / 2} C ${x + BOX_WIDTH + 40} ${y + BOX_HEIGHT / 2}, ${x + BOX_WIDTH + 40} ${y - BOX_HEIGHT}, ${x + BOX_WIDTH} ${y - BOX_HEIGHT / 2 - GAP / 2}`}
                stroke="#ef4444"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="4 3"
                markerEnd="url(#retryArrow)"
              />
            )}
          </React.Fragment>
        );
      })}

      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0 0 L8 3 L0 6 Z" fill="#d1d5db" />
        </marker>
        <marker id="retryArrow" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
          <path d="M0 0 L6 2.5 L0 5 Z" fill="#ef4444" />
        </marker>
      </defs>
    </svg>
  );
}
