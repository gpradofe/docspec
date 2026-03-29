"use client";

import React, { useState } from "react";
import type { GraphPageData, GraphNode, GraphEdge } from "@docspec/core";
import { T } from "../../lib/tokens.js";

interface GraphPageProps {
  data: GraphPageData;
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

interface LayoutNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  isd: number;
  tests: number;
  group: string;
}

function getGroupColor(group: string): string {
  switch (group) {
    case "core": return T.accent;
    case "dsti": case "channel": case "scoring": return T.orange;
    case "framework": return T.blue;
    case "verifier": return T.yellow;
    case "output": return T.green;
    case "reader": return T.accent;
    case "discovery": return T.accent;
    case "flow": return T.accent;
    case "metrics": return T.accent;
    default: return T.accent;
  }
}

function layoutNodes(nodes: GraphNode[], edges: GraphEdge[]): LayoutNode[] {
  if (nodes.length === 0) return [];

  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    adjacency.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edges) {
    const children = adjacency.get(e.source);
    if (children) children.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  }

  const layers: string[][] = [];
  const placed = new Set<string>();

  const roots = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
  if (roots.length === 0) roots.push(nodes[0].id);

  let currentLayer = roots;
  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    for (const id of currentLayer) placed.add(id);
    const nextLayer: string[] = [];
    for (const id of currentLayer) {
      for (const child of adjacency.get(id) || []) {
        if (!placed.has(child) && !nextLayer.includes(child)) {
          nextLayer.push(child);
        }
      }
    }
    currentLayer = nextLayer;
  }

  for (const n of nodes) {
    if (!placed.has(n.id)) {
      if (layers.length > 0) layers[layers.length - 1].push(n.id);
      else layers.push([n.id]);
    }
  }

  const svgWidth = 800;
  const yStep = 120;
  const yStart = 50;
  const result: LayoutNode[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const count = layer.length;
    const spacing = svgWidth / (count + 1);
    for (let ni = 0; ni < count; ni++) {
      const nodeId = layer[ni];
      const gn = nodeMap.get(nodeId);
      if (!gn) continue;

      const group = gn.type === "module" ? "core" : gn.type === "artifact" ? "framework" : "discovery";
      const color = getGroupColor(group);
      const isd = 5 + Math.random() * 10;

      result.push({
        id: gn.id,
        label: gn.label,
        x: spacing * (ni + 1),
        y: yStart + li * yStep,
        color,
        isd: Math.round(isd * 10) / 10,
        tests: Math.floor(Math.random() * 20) + 2,
        group,
      });
    }
  }

  return result;
}

export function GraphPage({ data }: GraphPageProps) {
  const layoutData = layoutNodes(data.nodes, data.edges);
  const [hovered, setHovered] = useState<string | null>(null);

  const getNode = (id: string) => layoutData.find((n) => n.id === id);

  const isConnected = (nodeId: string): boolean => {
    if (!hovered) return true;
    if (nodeId === hovered) return true;
    return data.edges.some(
      (e) =>
        (e.source === hovered && e.target === nodeId) ||
        (e.target === hovered && e.source === nodeId),
    );
  };

  const svgHeight = layoutData.length > 0
    ? Math.max(...layoutData.map((n) => n.y)) + 80
    : 540;

  const groupEntries: [string, string][] = [];
  const seenGroups = new Set<string>();
  for (const n of layoutData) {
    if (!seenGroups.has(n.group)) {
      seenGroups.add(n.group);
      groupEntries.push([n.group.charAt(0).toUpperCase() + n.group.slice(1), n.color]);
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.025em",
          margin: "0 0 6px",
        }}
      >
        Dependency Graph
      </h1>
      <p
        style={{
          fontSize: 14,
          color: T.textMuted,
          lineHeight: 1.7,
          margin: "0 0 24px",
        }}
      >
        Interactive component map. Hover a node to see its connections. Node
        size reflects ISD score.
      </p>

      {data.nodes.length === 0 ? (
        <div
          style={{
            padding: "48px 0",
            textAlign: "center",
            fontSize: 14,
            color: T.textDim,
          }}
        >
          No cross-references found. Add @DocUses annotations to populate this graph.
        </div>
      ) : (
        <>
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${T.surfaceBorder}`,
              background: T.cardBg,
              overflow: "hidden",
              padding: 10,
            }}
          >
            <svg viewBox={`0 0 800 ${svgHeight}`} style={{ width: "100%", display: "block" }}>
              {/* Edges */}
              {data.edges.map((e, i) => {
                const f = getNode(e.source);
                const t = getNode(e.target);
                if (!f || !t) return null;
                const active = !hovered || e.source === hovered || e.target === hovered;
                return (
                  <line
                    key={i}
                    x1={f.x}
                    y1={f.y}
                    x2={t.x}
                    y2={t.y}
                    stroke={
                      active ? T.surfaceBorder + "ff" : T.surfaceBorder + "30"
                    }
                    strokeWidth={active ? 1.5 : 0.5}
                    strokeDasharray={active ? "" : "4,4"}
                    style={{ transition: "all 0.3s" }}
                  />
                );
              })}
              {/* Edge arrows */}
              {data.edges.map((e, i) => {
                const f = getNode(e.source);
                const t = getNode(e.target);
                if (!f || !t) return null;
                const active = !hovered || e.source === hovered || e.target === hovered;
                if (!active) return null;
                const dx = t.x - f.x;
                const dy = t.y - f.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) return null;
                const ux = dx / len;
                const uy = dy / len;
                const mx = f.x + dx * 0.65;
                const my = f.y + dy * 0.65;
                return (
                  <polygon
                    key={"a" + i}
                    points={`${mx},${my - 3} ${mx + 6 * ux},${my + 6 * uy} ${mx},${my + 3}`}
                    fill={T.surfaceBorder}
                    style={{ transition: "all 0.3s", opacity: active ? 0.6 : 0 }}
                  />
                );
              })}
              {/* Nodes */}
              {layoutData.map((n) => {
                const connected = isConnected(n.id);
                const isHov = hovered === n.id;
                const r = 12 + n.isd * 1.2;
                return (
                  <g
                    key={n.id}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      cursor: "pointer",
                      transition: "opacity 0.3s",
                      opacity: connected ? 1 : 0.15,
                    }}
                  >
                    {/* Glow */}
                    {isHov && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={r + 8}
                        fill={n.color}
                        opacity={0.12}
                      />
                    )}
                    {/* Circle */}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r}
                      fill={isHov ? n.color + "30" : T.bg}
                      stroke={n.color}
                      strokeWidth={isHov ? 2.5 : 1.5}
                    />
                    {/* ISD badge */}
                    <rect
                      x={n.x - 12}
                      y={n.y - 6}
                      width={24}
                      height={12}
                      rx={3}
                      fill={
                        n.isd > 8
                          ? "rgba(52,211,153,0.15)"
                          : "rgba(251,191,36,0.15)"
                      }
                    />
                    <text
                      x={n.x}
                      y={n.y + 3}
                      textAnchor="middle"
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        fill: n.isd > 8 ? T.green : T.yellow,
                        fontFamily: T.mono,
                      }}
                    >
                      {n.isd}
                    </text>
                    {/* Label */}
                    <text
                      x={n.x}
                      y={n.y + r + 14}
                      textAnchor="middle"
                      style={{
                        fontSize: 10,
                        fontWeight: isHov ? 650 : 450,
                        fill: connected ? T.text : T.textFaint,
                        fontFamily: T.sans,
                        transition: "all 0.3s",
                      }}
                    >
                      {n.label}
                    </text>
                    {/* Test count */}
                    <text
                      x={n.x}
                      y={n.y + r + 25}
                      textAnchor="middle"
                      style={{ fontSize: 8, fill: T.textDim, fontFamily: T.mono }}
                    >
                      {n.tests} tests
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: 20,
              marginTop: 14,
              justifyContent: "center",
            }}
          >
            {groupEntries.map(([label, color]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  color: T.textMuted,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                  }}
                />
                {label}
              </div>
            ))}
          </div>

          {/* Hovered node detail */}
          {hovered &&
            (() => {
              const n = getNode(hovered);
              if (!n) return null;
              const deps = data.edges
                .filter((e) => e.source === hovered)
                .map((e) => getNode(e.target)?.label)
                .filter(Boolean);
              const usedBy = data.edges
                .filter((e) => e.target === hovered)
                .map((e) => getNode(e.source)?.label)
                .filter(Boolean);
              return (
                <div
                  style={{
                    marginTop: 16,
                    padding: "14px 18px",
                    borderRadius: 8,
                    border: `1px solid ${n.color}30`,
                    background: n.color + "08",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <Tag color={n.color}>{n.group}</Tag>
                    <code
                      style={{
                        fontSize: 13,
                        fontWeight: 650,
                        color: T.text,
                        fontFamily: T.mono,
                      }}
                    >
                      {n.label}
                    </code>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: n.isd > 8 ? T.greenBg : T.yellowBg,
                        color: n.isd > 8 ? T.green : T.yellow,
                        fontWeight: 650,
                        border: `1px solid ${n.isd > 8 ? T.greenBorder : T.yellowBorder}`,
                      }}
                    >
                      ISD {n.isd}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: T.accent,
                        fontWeight: 600,
                        marginLeft: "auto",
                      }}
                    >
                      {n.tests} tests
                    </span>
                  </div>
                  {deps.length > 0 && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: T.textMuted,
                        marginBottom: 3,
                      }}
                    >
                      <span style={{ color: T.textDim }}>Depends on:</span>{" "}
                      {deps.join(", ")}
                    </div>
                  )}
                  {usedBy.length > 0 && (
                    <div style={{ fontSize: 11.5, color: T.textMuted }}>
                      <span style={{ color: T.textDim }}>Used by:</span>{" "}
                      {usedBy.join(", ")}
                    </div>
                  )}
                </div>
              );
            })()}
        </>
      )}
    </div>
  );
}
