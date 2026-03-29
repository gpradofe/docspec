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
 * Hierarchical (Sugiyama-style) layout.
 * 1. Assign layers via longest-path from roots (top = orchestrators, bottom = leaves)
 * 2. Order nodes within layers to minimize edge crossings (barycenter heuristic)
 * 3. Position with even spacing
 */
function hierarchicalLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
): { layout: LayoutNode[]; height: number } {
  if (nodes.length === 0) return { layout: [], height: 200 };

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    children.set(n.id, []);
    parents.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of edges) {
    children.get(e.source)?.push(e.target);
    parents.get(e.target)?.push(e.source);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  }

  // --- Step 1: Assign layers via BFS from roots ---
  const layerOf = new Map<string, number>();
  const roots = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
  if (roots.length === 0) roots.push(nodes[0].id);

  const queue = roots.map((id) => ({ id, layer: 0 }));
  const visited = new Set<string>();
  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    if (visited.has(id)) {
      // Update to deeper layer if reached via longer path
      layerOf.set(id, Math.max(layerOf.get(id) || 0, layer));
    } else {
      visited.add(id);
      layerOf.set(id, layer);
    }
    for (const child of children.get(id) || []) {
      queue.push({ id: child, layer: layer + 1 });
    }
  }
  // Place unvisited nodes in the last layer
  for (const n of nodes) {
    if (!layerOf.has(n.id)) {
      layerOf.set(n.id, (Math.max(...layerOf.values()) || 0) + 1);
    }
  }

  // Group by layer
  const layers: string[][] = [];
  for (const [id, layer] of layerOf) {
    while (layers.length <= layer) layers.push([]);
    layers[layer].push(id);
  }

  // --- Step 2: Order within layers to reduce crossings (barycenter, 4 passes) ---
  for (let pass = 0; pass < 4; pass++) {
    for (let li = 1; li < layers.length; li++) {
      const layer = layers[li];
      const prevLayer = layers[li - 1];
      const prevIndex = new Map(prevLayer.map((id, i) => [id, i]));

      layer.sort((a, b) => {
        const aParents = parents.get(a) || [];
        const bParents = parents.get(b) || [];
        const aAvg = aParents.length > 0 ? aParents.reduce((s, p) => s + (prevIndex.get(p) ?? 0), 0) / aParents.length : 0;
        const bAvg = bParents.length > 0 ? bParents.reduce((s, p) => s + (prevIndex.get(p) ?? 0), 0) / bParents.length : 0;
        return aAvg - bAvg;
      });
    }
  }

  // --- Step 3: Position nodes ---
  const layerGap = 100;
  const minNodeSpacing = 100;
  const topPadding = 50;

  const result: LayoutNode[] = [];

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const layerWidth = layer.length * minNodeSpacing;
    const startX = (width - layerWidth) / 2 + minNodeSpacing / 2;
    const y = topPadding + li * layerGap;

    for (let ni = 0; ni < layer.length; ni++) {
      const id = layer[ni];
      const gn = nodeMap.get(id);
      if (!gn) continue;

      const x = startX + ni * minNodeSpacing;
      const label = gn.label.toLowerCase();

      // Derive group from class name
      let group = "core";
      if (/channel|naming|guard|branch|loop|errorhandling|constant|assignment|exception|logging|equality|return/i.test(label)) group = "channel";
      else if (/intent|isd|density|dsti/i.test(label)) group = "dsti";
      else if (/extractor|privacy|security(?!model)|configur|observ|datastore|external/i.test(label)) group = "extractor";
      else if (/spring|jpa|jackson/i.test(label)) group = "framework";
      else if (/serial|output/i.test(label)) group = "output";
      else if (/reader|javadoc|inferrer/i.test(label)) group = "reader";
      else if (/scanner|filter|discovery/i.test(label)) group = "scanner";
      else if (/coverage|metric/i.test(label)) group = "metrics";
      else if (/model/i.test(label)) group = "model";
      else if (/mojo|maven|generate(?!d)|validate|publish|schema|aggregate|check/i.test(label)) group = "maven";

      result.push({
        id: gn.id,
        label: gn.label,
        x: Math.round(x),
        y: Math.round(y),
        color: getGroupColor(group),
        isd: 0,
        tests: 0,
        group,
      });
    }
  }

  const totalHeight = topPadding + layers.length * layerGap + 40;
  return { layout: result, height: totalHeight };
}

export function GraphPage({ data }: GraphPageProps) {
  const svgWidth = 960;

  const { layout: layoutData, height: svgHeight } = useMemo(
    () => hierarchicalLayout(data.nodes, data.edges, svgWidth),
    [data.nodes, data.edges, svgWidth],
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
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
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
