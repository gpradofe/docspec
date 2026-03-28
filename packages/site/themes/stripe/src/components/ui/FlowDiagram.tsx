import React from "react";
import type { FlowStep } from "@docspec/core";

interface FlowDiagramProps {
  steps: FlowStep[];
  referenceIndex?: Record<string, string>;
}

const STEP_TYPE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  process: { bg: "#eef2ff", border: "#818cf8", icon: "\u2699\uFE0F" },
  ai: { bg: "#faf5ff", border: "#a855f7", icon: "\uD83E\uDDE0" },
  storage: { bg: "#f0fdf4", border: "#22c55e", icon: "\uD83D\uDCBE" },
  trigger: { bg: "#fff7ed", border: "#f97316", icon: "\u26A1" },
  retry: { bg: "#fef2f2", border: "#ef4444", icon: "\uD83D\uDD04" },
  external: { bg: "#f0f9ff", border: "#0ea5e9", icon: "\uD83C\uDF10" },
  bridge: { bg: "#fefce8", border: "#eab308", icon: "\uD83C\uDF09" },
  observability: { bg: "#f5f3ff", border: "#8b5cf6", icon: "\uD83D\uDCCA" },
};

const PROJECT_PALETTE = ["#818cf8", "#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ef4444"];

const BOX_WIDTH = 320;
const BOX_HEIGHT_BASE = 64;
const BOX_HEIGHT_WITH_DS = 80;
const GAP = 28;
const PADDING = 40;

const STEP_NUMBER_RADIUS = 11;

function stepBoxHeight(step: FlowStep): number {
  return step.dataStoreOps && step.dataStoreOps.length > 0 ? BOX_HEIGHT_WITH_DS : BOX_HEIGHT_BASE;
}

function deriveProjectFromActorQualified(actorQualified?: string): string | null {
  if (!actorQualified) return null;
  const parts = actorQualified.split(".");
  if (parts.length >= 2) {
    return parts.slice(0, Math.min(parts.length - 1, 3)).join(".");
  }
  return actorQualified;
}

function buildProjectColorMap(steps: FlowStep[]): Map<string, string> {
  const map = new Map<string, string>();
  let colorIdx = 0;
  for (const step of steps) {
    const project = deriveProjectFromActorQualified(step.actorQualified);
    if (project && !map.has(project)) {
      map.set(project, PROJECT_PALETTE[colorIdx % PROJECT_PALETTE.length]);
      colorIdx++;
    }
  }
  return map;
}

function getProjectColor(step: FlowStep, projectColorMap: Map<string, string>): string | null {
  const project = deriveProjectFromActorQualified(step.actorQualified);
  if (!project) return null;
  return projectColorMap.get(project) ?? null;
}

export function FlowDiagram({ steps, referenceIndex }: FlowDiagramProps) {
  if (steps.length === 0) return null;

  const projectColorMap = buildProjectColorMap(steps);

  const yPositions: number[] = [];
  let currentY = PADDING;
  for (let i = 0; i < steps.length; i++) {
    yPositions.push(currentY);
    currentY += stepBoxHeight(steps[i]) + GAP;
  }

  const retryOverhang = steps.some((s) => s.retryTarget) ? 60 : 0;
  const totalWidth = BOX_WIDTH + PADDING * 2 + retryOverhang;
  const totalHeight = currentY - GAP + PADDING;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      style={{ width: "100%", maxWidth: 520, margin: "0 auto", maxHeight: `${Math.min(totalHeight, 700)}px` }}
      role="img"
      aria-label="Flow diagram"
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0 0 L8 3 L0 6 Z" fill="var(--ds-border, #d1d5db)" />
        </marker>
        <marker id="retryArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0 0 L8 3 L0 6 Z" fill="var(--ds-error, #ef4444)" />
        </marker>
        <filter id="dropShadow" x="-4%" y="-4%" width="108%" height="112%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.08" />
        </filter>
      </defs>

      {steps.map((step, i) => {
        const x = PADDING;
        const y = yPositions[i];
        const boxH = stepBoxHeight(step);
        const colors = STEP_TYPE_COLORS[step.type || "process"] || STEP_TYPE_COLORS.process;
        const url = step.actorQualified && referenceIndex?.[step.actorQualified];
        const projectColor = getProjectColor(step, projectColorMap);
        const tooltipText = step.description || step.name || step.id;
        const hasDataStoreOps = step.dataStoreOps && step.dataStoreOps.length > 0;
        const stepNumber = i + 1;

        return (
          <React.Fragment key={step.id}>
            {/* Arrow from previous step */}
            {i > 0 && (
              <line
                x1={x + BOX_WIDTH / 2}
                y1={yPositions[i - 1] + stepBoxHeight(steps[i - 1])}
                x2={x + BOX_WIDTH / 2}
                y2={y}
                stroke="var(--ds-border, #d1d5db)"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            )}

            {/* Step group with tooltip */}
            <g filter="url(#dropShadow)">
              <title>{tooltipText}</title>

              {/* Main box */}
              {url ? (
                <a href={`/${url}`}>
                  <rect
                    x={x} y={y}
                    width={BOX_WIDTH} height={boxH}
                    rx={10} ry={10}
                    fill={colors.bg}
                    stroke={colors.border}
                    strokeWidth="1.5"
                    style={{ cursor: "pointer" }}
                  />
                </a>
              ) : (
                <rect
                  x={x} y={y}
                  width={BOX_WIDTH} height={boxH}
                  rx={10} ry={10}
                  fill={colors.bg}
                  stroke={colors.border}
                  strokeWidth="1.5"
                />
              )}

              {/* Project color left-border accent */}
              {projectColor && (
                <rect
                  x={x} y={y + 4}
                  width={4} height={boxH - 8}
                  rx={2} ry={2}
                  fill={projectColor}
                />
              )}

              {/* Step number circle */}
              <circle
                cx={x + STEP_NUMBER_RADIUS + 2}
                cy={y - STEP_NUMBER_RADIUS + 4}
                r={STEP_NUMBER_RADIUS}
                fill={colors.border}
              />
              <text
                x={x + STEP_NUMBER_RADIUS + 2}
                y={y - STEP_NUMBER_RADIUS + 4}
                fontSize="10"
                fontWeight="700"
                fill="#fff"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {stepNumber}
              </text>

              {/* Step name with type icon */}
              <text
                x={x + 16}
                y={y + 26}
                fontSize="13"
                fontWeight="600"
                fill="var(--ds-text-primary, #111827)"
              >
                {colors.icon} {step.name || step.actor || step.id}
              </text>

              {/* Actor name */}
              {step.actor && step.name && (
                <text
                  x={x + 16}
                  y={y + 46}
                  fontSize="11"
                  fill="var(--ds-text-tertiary, #6b7280)"
                >
                  {step.actor}
                </text>
              )}

              {/* Data store operations indicator */}
              {hasDataStoreOps && (
                <text
                  x={x + 16}
                  y={step.actor && step.name ? y + 66 : y + 46}
                  fontSize="10"
                  fill="#22c55e"
                >
                  {"\uD83D\uDCBE"} {step.dataStoreOps!.length} data store op{step.dataStoreOps!.length > 1 ? "s" : ""}
                </text>
              )}

              {/* Data store badge at top-right when ops present */}
              {hasDataStoreOps && (
                <>
                  <rect
                    x={x + BOX_WIDTH - 32}
                    y={y + 6}
                    width={24}
                    height={18}
                    rx={4}
                    fill="#dcfce7"
                    stroke="#22c55e"
                    strokeWidth="0.5"
                  />
                  <text
                    x={x + BOX_WIDTH - 20}
                    y={y + 15}
                    fontSize="10"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {"\uD83D\uDCBE"}
                  </text>
                </>
              )}
            </g>

            {/* Retry loop arrow */}
            {step.retryTarget && (() => {
              const targetIdx = steps.findIndex((s) => s.id === step.retryTarget);
              const retryTargetY = targetIdx >= 0 ? yPositions[targetIdx] : y - boxH - GAP;
              const retryTargetBoxH = targetIdx >= 0 ? stepBoxHeight(steps[targetIdx]) : BOX_HEIGHT_BASE;
              const curveX = x + BOX_WIDTH + 48;

              return (
                <g>
                  <title>Retry: returns to {step.retryTarget}</title>
                  <path
                    d={`M ${x + BOX_WIDTH} ${y + boxH / 2} C ${curveX} ${y + boxH / 2}, ${curveX} ${retryTargetY + retryTargetBoxH / 2}, ${x + BOX_WIDTH} ${retryTargetY + retryTargetBoxH / 2}`}
                    stroke="var(--ds-error, #ef4444)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray="6 4"
                    markerEnd="url(#retryArrow)"
                  />
                  <text
                    x={curveX + 2}
                    y={(y + boxH / 2 + retryTargetY + retryTargetBoxH / 2) / 2}
                    fontSize="9"
                    fontWeight="600"
                    fill="var(--ds-error, #ef4444)"
                    textAnchor="start"
                  >
                    retry
                  </text>
                </g>
              );
            })()}
          </React.Fragment>
        );
      })}
    </svg>
  );
}
