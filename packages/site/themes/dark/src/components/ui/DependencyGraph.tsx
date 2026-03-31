"use client";

import React from "react";
import type { GraphNode, GraphEdge } from "@docspec/core";

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function DependencyGraph({ nodes, edges }: DependencyGraphProps) {
  if (nodes.length === 0) return null;

  const SIZE = 600;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 80;
  const NODE_RADIUS = 30;

  const positions = nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    };
  });

  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

  const TYPE_COLORS: Record<string, string> = {
    artifact: "#58a6ff",
    module: "#3fb950",
    class: "#8b949e",
    interface: "#58a6ff",
    enum: "#d29922",
    record: "#3fb950",
    annotation: "#f778ba",
  };

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-xl mx-auto">
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
            stroke="#30363d"
            strokeWidth="1.5"
          />
        );
      })}

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
