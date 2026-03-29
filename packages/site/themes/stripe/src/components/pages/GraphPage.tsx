"use client";

import React, { useState, useMemo } from "react";
import type { GraphPageData, GraphNode, GraphEdge } from "@docspec/core";
import { T } from "../../lib/tokens.js";

interface GraphPageProps {
  data: GraphPageData;
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
  const map: Record<string, string> = {
    core: T.accent, processor: T.accent, discovery: T.accent,
    dsti: T.orange, channel: T.orange, scoring: T.orange,
    framework: T.blue, reader: "#a78bfa",
    verifier: T.yellow, output: T.green,
    metrics: "#22d3ee", flow: T.blue,
    extractor: "#fb923c", model: T.textDim,
    config: T.yellow, scanner: T.green,
    maven: T.green,
  };
  return map[group] || T.accent;
}

/**
 * Force-directed layout simulation.
 * Runs N iterations of: repulsion between all node pairs + attraction along edges + centering.
 */
function forceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
): LayoutNode[] {
  if (nodes.length === 0) return [];

  // Initialize positions: spread in a grid to avoid overlap
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const cellW = width / (cols + 1);
  const cellH = height / (Math.ceil(nodes.length / cols) + 1);

  const positions: Array<{ x: number; y: number; vx: number; vy: number }> = nodes.map((_, i) => ({
    x: cellW * ((i % cols) + 1) + (Math.random() - 0.5) * 20,
    y: cellH * (Math.floor(i / cols) + 1) + (Math.random() - 0.5) * 20,
    vx: 0,
    vy: 0,
  }));

  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));

  // Simulation parameters
  const repulsion = 8000;
  const attraction = 0.005;
  const damping = 0.85;
  const centerForce = 0.01;
  const iterations = 200;
  const padding = 60;
  const centerX = width / 2;
  const centerY = height / 2;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion: every pair pushes apart
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        let dx = positions[j].x - positions[i].x;
        let dy = positions[j].y - positions[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        positions[i].vx -= fx;
        positions[i].vy -= fy;
        positions[j].vx += fx;
        positions[j].vy += fy;
      }
    }

    // Attraction: connected nodes pull together
    for (const edge of edges) {
      const si = nodeIndex.get(edge.source);
      const ti = nodeIndex.get(edge.target);
      if (si === undefined || ti === undefined) continue;
      const dx = positions[ti].x - positions[si].x;
      const dy = positions[ti].y - positions[si].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      positions[si].vx += fx;
      positions[si].vy += fy;
      positions[ti].vx -= fx;
      positions[ti].vy -= fy;
    }

    // Centering force
    for (const p of positions) {
      p.vx += (centerX - p.x) * centerForce;
      p.vy += (centerY - p.y) * centerForce;
    }

    // Apply velocity + damping
    for (const p of positions) {
      p.vx *= damping;
      p.vy *= damping;
      p.x += p.vx;
      p.y += p.vy;
      // Clamp to bounds
      p.x = Math.max(padding, Math.min(width - padding, p.x));
      p.y = Math.max(padding, Math.min(height - padding, p.y));
    }
  }

  return nodes.map((n, i) => {
    // Derive group from the node's label or artifact type
    const label = n.label.toLowerCase();
    let group = "core";
    if (label.includes("channel") || label.includes("naming") || label.includes("guard") || label.includes("branch") || label.includes("loop") || label.includes("error") || label.includes("constant") || label.includes("assignment") || label.includes("exception") || label.includes("logging") || label.includes("equality") || label.includes("return")) group = "channel";
    else if (label.includes("intent") || label.includes("isd") || label.includes("density") || label.includes("dsti")) group = "dsti";
    else if (label.includes("extractor") || label.includes("privacy") || label.includes("security") || label.includes("config") || label.includes("observ") || label.includes("datastore") || label.includes("external")) group = "extractor";
    else if (label.includes("spring") || label.includes("jpa") || label.includes("jackson")) group = "framework";
    else if (label.includes("serial") || label.includes("output")) group = "output";
    else if (label.includes("reader") || label.includes("javadoc") || label.includes("inferrer")) group = "reader";
    else if (label.includes("scanner") || label.includes("filter") || label.includes("discovery")) group = "scanner";
    else if (label.includes("coverage") || label.includes("metric")) group = "metrics";
    else if (label.includes("model")) group = "model";
    else if (label.includes("mojo") || label.includes("maven") || label.includes("generate") || label.includes("validate") || label.includes("publish") || label.includes("schema") || label.includes("aggregate") || label.includes("check")) group = "maven";
    else if (label.includes("processor")) group = "core";

    const color = getGroupColor(group);

    return {
      id: n.id,
      label: n.label,
      x: Math.round(positions[i].x),
      y: Math.round(positions[i].y),
      color,
      isd: 0, // Will be enriched if data available
      tests: 0,
      group,
    };
  });
}

export function GraphPage({ data }: GraphPageProps) {
  const svgWidth = 900;
  const svgHeight = Math.max(500, Math.ceil(data.nodes.length / 3) * 80 + 100);

  const layoutData = useMemo(
    () => forceLayout(data.nodes, data.edges, svgWidth, svgHeight),
    [data.nodes, data.edges, svgWidth, svgHeight],
  );

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

  // Collect legend entries
  const groupEntries: [string, string][] = [];
  const seenGroups = new Set<string>();
  for (const n of layoutData) {
    if (!seenGroups.has(n.group)) {
      seenGroups.add(n.group);
      groupEntries.push([n.group.charAt(0).toUpperCase() + n.group.slice(1), n.color]);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 750, color: T.text, letterSpacing: "-0.025em", margin: "0 0 6px" }}>
        Dependency Graph
      </h1>
      <p style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.7, margin: "0 0 24px" }}>
        Interactive component map. Hover a node to see its connections. {data.nodes.length} components, {data.edges.length} dependencies.
      </p>

      {data.nodes.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 14, color: T.textDim }}>
          No cross-references found. Add @DocUses annotations to populate this graph.
        </div>
      ) : (
        <>
          <div style={{ borderRadius: 12, border: `1px solid ${T.surfaceBorder}`, background: T.cardBg, overflow: "hidden", padding: 10 }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", display: "block" }}>
              {/* Edges */}
              {data.edges.map((e, i) => {
                const f = getNode(e.source);
                const t = getNode(e.target);
                if (!f || !t) return null;
                const active = !hovered || e.source === hovered || e.target === hovered;
                return (
                  <line
                    key={i}
                    x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                    stroke={active ? T.surfaceBorder : T.surfaceBorder + "30"}
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
                    style={{ transition: "all 0.3s", opacity: 0.6 }}
                  />
                );
              })}

              {/* Nodes */}
              {layoutData.map((n) => {
                const connected = isConnected(n.id);
                const isHov = hovered === n.id;
                const r = 14 + (n.label.length > 20 ? 4 : 0);

                return (
                  <g
                    key={n.id}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: "pointer", transition: "opacity 0.3s", opacity: connected ? 1 : 0.12 }}
                  >
                    {/* Glow */}
                    {isHov && (
                      <circle cx={n.x} cy={n.y} r={r + 10} fill={n.color} opacity={0.15} />
                    )}
                    {/* Circle */}
                    <circle
                      cx={n.x} cy={n.y} r={r}
                      fill={isHov ? n.color + "30" : T.bg}
                      stroke={n.color}
                      strokeWidth={isHov ? 2.5 : 1.5}
                    />
                    {/* Group initial */}
                    <text
                      x={n.x} y={n.y + 4}
                      textAnchor="middle"
                      style={{ fontSize: 10, fontWeight: 700, fill: n.color, fontFamily: T.mono }}
                    >
                      {n.group.substring(0, 2).toUpperCase()}
                    </text>
                    {/* Label */}
                    <text
                      x={n.x} y={n.y + r + 14}
                      textAnchor="middle"
                      style={{
                        fontSize: 9,
                        fontWeight: isHov ? 650 : 400,
                        fill: connected ? T.text : T.textFaint,
                        fontFamily: T.sans,
                        transition: "all 0.3s",
                      }}
                    >
                      {n.label.length > 22 ? n.label.substring(0, 20) + ".." : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
            {groupEntries.map(([label, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.textMuted }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                {label}
              </div>
            ))}
          </div>

          {/* Hover detail */}
          {hovered && (() => {
            const n = getNode(hovered);
            if (!n) return null;
            const deps = data.edges.filter((e) => e.source === hovered).map((e) => getNode(e.target)?.label).filter(Boolean);
            const usedBy = data.edges.filter((e) => e.target === hovered).map((e) => getNode(e.source)?.label).filter(Boolean);
            return (
              <div style={{
                marginTop: 16, padding: "14px 18px", borderRadius: 8,
                border: `1px solid ${n.color}30`, background: n.color + "08",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                    background: n.color + "14", color: n.color, border: `1px solid ${n.color}30`,
                    fontFamily: T.mono,
                  }}>
                    {n.group}
                  </span>
                  <code style={{ fontSize: 13, fontWeight: 650, color: T.text, fontFamily: T.mono }}>
                    {n.label}
                  </code>
                </div>
                {deps.length > 0 && (
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 3 }}>
                    <span style={{ color: T.textDim }}>Depends on:</span> {deps.join(", ")}
                  </div>
                )}
                {usedBy.length > 0 && (
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    <span style={{ color: T.textDim }}>Used by:</span> {usedBy.join(", ")}
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
