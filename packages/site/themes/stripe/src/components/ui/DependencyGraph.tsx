"use client";

import React from "react";
import type { GraphNode, GraphEdge } from "@docspec/core";

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Simple force-directed-ish graph rendered as SVG.
 * Uses a basic circular layout since we don't want heavy dependencies.
 * Can be upgraded to @xyflow/react later for interactivity.
 */
export function DependencyGraph({ nodes, edges }: DependencyGraphProps) {
  if (nodes.length === 0) return null;

  const SIZE = 600;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 80;
  const NODE_RADIUS = 30;

  // Circular layout
  const positions = nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    };
  });

  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

  const TYPE_COLORS: Record<string, string> = {
    artifact: "#4f46e5",
    module: "#0ea5e9",
    class: "#6b7280",
    interface: "#0ea5e9",
    enum: "#f59e0b",
    record: "#10b981",
    annotation: "#ec4899",
  };

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-xl mx-auto">
      {/* Edges */}
      {edges.map((edge, i) => {
        const srcIdx = nodeIndex.get(edge.source);
        const tgtIdx = nodeIndex.get(edge.target);
        if (srcIdx === undefined || tgtIdx === undefined) return null;
        const src = positions[srcIdx];
        const tgt = positions[tgtIdx];
        return (
          <line
            key={i}
            x1={src.x} y1={src.y}
            x2={tgt.x} y2={tgt.y}
            stroke="#d1d5db"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => {
        const pos = positions[i];
        const color = TYPE_COLORS[node.type] || TYPE_COLORS.class;
        return (
          <g key={node.id}>
            <circle
              cx={pos.x} cy={pos.y} r={NODE_RADIUS}
              fill={color}
              opacity={0.9}
            />
            <text
              x={pos.x} y={pos.y + 4}
              fontSize="10"
              fill="white"
              textAnchor="middle"
              fontWeight="600"
            >
              {node.label.length > 12 ? node.label.slice(0, 10) + "..." : node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
