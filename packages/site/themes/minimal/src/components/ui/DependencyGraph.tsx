"use client";

import React from "react";
import type { GraphNode, GraphEdge } from "@docspec/core";

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function DependencyGraph({ nodes, edges }: DependencyGraphProps) {
  if (nodes.length === 0) return null;

  const SIZE = 500;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 70;
  const NODE_RADIUS = 28;

  const positions = nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return { x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle) };
  });

  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-md mx-auto my-4">
      {edges.map((edge, i) => {
        const srcIdx = nodeIndex.get(edge.source);
        const tgtIdx = nodeIndex.get(edge.target);
        if (srcIdx === undefined || tgtIdx === undefined) return null;
        return (
          <line key={i} x1={positions[srcIdx].x} y1={positions[srcIdx].y} x2={positions[tgtIdx].x} y2={positions[tgtIdx].y} stroke="#eeeeee" strokeWidth="1.5" />
        );
      })}
      {nodes.map((node, i) => {
        const pos = positions[i];
        return (
          <g key={node.id}>
            <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS} fill="#0070f3" opacity={0.85} />
            <text x={pos.x} y={pos.y + 4} fontSize="10" fill="white" textAnchor="middle" fontWeight="600">
              {node.label.length > 12 ? node.label.slice(0, 10) + "..." : node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
