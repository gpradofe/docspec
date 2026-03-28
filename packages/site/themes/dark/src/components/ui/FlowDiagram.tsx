import React from "react";
import type { FlowStep } from "@docspec/core";

interface FlowDiagramProps {
  steps: FlowStep[];
  referenceIndex?: Record<string, string>;
}

const STEP_TYPE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  process: { bg: "#1c2333", border: "#58a6ff", icon: "⚙️" },
  ai: { bg: "#2d1b4e", border: "#a855f7", icon: "🧠" },
  storage: { bg: "#0d2818", border: "#3fb950", icon: "💾" },
  trigger: { bg: "#2d1a00", border: "#d29922", icon: "⚡" },
  retry: { bg: "#2d0c0c", border: "#f85149", icon: "🔄" },
  external: { bg: "#0c2d3d", border: "#0ea5e9", icon: "🌐" },
  bridge: { bg: "#2d2a00", border: "#eab308", icon: "🌉" },
  observability: { bg: "#1f1b33", border: "#8b5cf6", icon: "📊" },
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
            {i > 0 && (
              <line
                x1={x + BOX_WIDTH / 2}
                y1={y - GAP}
                x2={x + BOX_WIDTH / 2}
                y2={y}
                stroke="#30363d"
                strokeWidth="2"
                markerEnd="url(#arrowhead-dark)"
              />
            )}

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

              <text
                x={x + 12}
                y={y + 24}
                fontSize="13"
                fontWeight="600"
                fill="#e6edf3"
              >
                {colors.icon} {step.name || step.actor || step.id}
              </text>

              {step.actor && step.name && (
                <text
                  x={x + 12}
                  y={y + 44}
                  fontSize="11"
                  fill="#8b949e"
                >
                  {step.actor}
                </text>
              )}
            </g>

            {step.retryTarget && (
              <path
                d={`M ${x + BOX_WIDTH} ${y + BOX_HEIGHT / 2} C ${x + BOX_WIDTH + 40} ${y + BOX_HEIGHT / 2}, ${x + BOX_WIDTH + 40} ${y - BOX_HEIGHT}, ${x + BOX_WIDTH} ${y - BOX_HEIGHT / 2 - GAP / 2}`}
                stroke="#f85149"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="4 3"
                markerEnd="url(#retryArrow-dark)"
              />
            )}
          </React.Fragment>
        );
      })}

      <defs>
        <marker id="arrowhead-dark" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0 0 L8 3 L0 6 Z" fill="#30363d" />
        </marker>
        <marker id="retryArrow-dark" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
          <path d="M0 0 L6 2.5 L0 5 Z" fill="#f85149" />
        </marker>
      </defs>
    </svg>
  );
}
