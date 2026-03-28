import React from "react";
import type { DataModel } from "@docspec/core";

interface ERDiagramProps {
  models: DataModel[];
  referenceIndex?: Record<string, string>;
}

const BOX_WIDTH = 180;
const BOX_HEADER = 32;
const FIELD_HEIGHT = 22;
const GAP_X = 80;
const GAP_Y = 40;
const PADDING = 30;

export function ERDiagram({ models, referenceIndex }: ERDiagramProps) {
  if (models.length === 0) return null;

  const cols = Math.min(models.length, 3);
  const rows = Math.ceil(models.length / cols);

  const boxHeights = models.map(
    (m) => BOX_HEADER + (m.fields?.length || 1) * FIELD_HEIGHT + 8
  );
  const maxBoxHeight = Math.max(...boxHeights);

  const totalWidth = cols * BOX_WIDTH + (cols - 1) * GAP_X + PADDING * 2;
  const totalHeight = rows * maxBoxHeight + (rows - 1) * GAP_Y + PADDING * 2;

  const positions = models.map((_, i) => ({
    x: PADDING + (i % cols) * (BOX_WIDTH + GAP_X),
    y: PADDING + Math.floor(i / cols) * (maxBoxHeight + GAP_Y),
  }));

  const modelPositions = new Map<string, { x: number; y: number; height: number }>();
  models.forEach((m, i) => {
    modelPositions.set(m.name, { ...positions[i], height: boxHeights[i] });
    modelPositions.set(m.qualified, { ...positions[i], height: boxHeights[i] });
  });

  return (
    <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="w-full" style={{ maxHeight: "500px" }}>
      {models.map((model, mi) =>
        (model.relationships || []).map((rel, ri) => {
          const from = positions[mi];
          const to = modelPositions.get(rel.target);
          if (!from || !to) return null;

          const fromX = from.x + BOX_WIDTH;
          const fromY = from.y + BOX_HEADER + 10;
          const toX = to.x;
          const toY = to.y + BOX_HEADER + 10;

          return (
            <g key={`${mi}-${ri}`}>
              <path
                d={`M ${fromX} ${fromY} C ${fromX + 30} ${fromY}, ${toX - 30} ${toY}, ${toX} ${toY}`}
                stroke="#484f58"
                strokeWidth="1.5"
                fill="none"
              />
              <text
                x={(fromX + toX) / 2}
                y={(fromY + toY) / 2 - 6}
                fontSize="9"
                fill="#8b949e"
                textAnchor="middle"
              >
                {rel.type.replace(/_/g, " ")}
              </text>
            </g>
          );
        })
      )}

      {models.map((model, i) => {
        const pos = positions[i];
        const fields = model.fields || [];
        const height = boxHeights[i];
        const url = referenceIndex?.[model.qualified];

        return (
          <g key={model.qualified}>
            <rect
              x={pos.x} y={pos.y}
              width={BOX_WIDTH} height={height}
              rx={6} ry={6}
              fill="#161b22"
              stroke="#30363d"
              strokeWidth="1.5"
            />
            <rect
              x={pos.x} y={pos.y}
              width={BOX_WIDTH} height={BOX_HEADER}
              rx={6} ry={6}
              fill="#58a6ff"
            />
            <rect
              x={pos.x} y={pos.y + BOX_HEADER - 6}
              width={BOX_WIDTH} height={6}
              fill="#58a6ff"
            />
            {url ? (
              <a href={`/${url}`}>
                <text
                  x={pos.x + BOX_WIDTH / 2} y={pos.y + 21}
                  fontSize="12" fontWeight="600" fill="white"
                  textAnchor="middle"
                  className="cursor-pointer"
                >
                  {model.name}
                </text>
              </a>
            ) : (
              <text
                x={pos.x + BOX_WIDTH / 2} y={pos.y + 21}
                fontSize="12" fontWeight="600" fill="white"
                textAnchor="middle"
              >
                {model.name}
              </text>
            )}
            {fields.map((field, fi) => (
              <g key={field.name}>
                <text
                  x={pos.x + 10}
                  y={pos.y + BOX_HEADER + 16 + fi * FIELD_HEIGHT}
                  fontSize="10"
                  fill={field.primaryKey ? "#58a6ff" : "#e6edf3"}
                >
                  {field.primaryKey ? "🔑 " : ""}{field.name}
                </text>
                <text
                  x={pos.x + BOX_WIDTH - 10}
                  y={pos.y + BOX_HEADER + 16 + fi * FIELD_HEIGHT}
                  fontSize="10"
                  fill="#8b949e"
                  textAnchor="end"
                >
                  {field.type}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
