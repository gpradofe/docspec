"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
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
    config: T.yellow, scanner: T.green, maven: T.green,
  };
  return map[group] || T.accent;
}

function classifyNode(label: string): string {
  const l = label.toLowerCase();
  if (/channel|naming|guard|branch|loop|errorhandling|constant|assignment|exception|logging|equality|return/i.test(l)) return "channel";
  if (/intent|isd|density|dsti/i.test(l)) return "dsti";
  if (/extractor|privacy|security(?!model)|configur|observ|datastore|external/i.test(l)) return "extractor";
  if (/spring|jpa|jackson/i.test(l)) return "framework";
  if (/serial|output/i.test(l)) return "output";
  if (/reader|javadoc|inferrer/i.test(l)) return "reader";
  if (/scanner|filter|discovery/i.test(l)) return "scanner";
  if (/coverage|metric/i.test(l)) return "metrics";
  if (/model/i.test(l)) return "model";
  if (/mojo|maven|generate(?!d)|validate|publish|schema|aggregate|check/i.test(l)) return "maven";
  if (/processor/i.test(l)) return "core";
  return "core";
}

/** Hierarchical layout with BFS layers + barycenter ordering */
function hierarchicalLayout(nodes: GraphNode[], edges: GraphEdge[]): LayoutNode[] {
  if (nodes.length === 0) return [];

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

  // Assign layers via BFS
  const layerOf = new Map<string, number>();
  const roots = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
  if (roots.length === 0) roots.push(nodes[0].id);

  const queue = roots.map((id) => ({ id, layer: 0 }));
  const visited = new Set<string>();
  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    if (visited.has(id)) {
      layerOf.set(id, Math.max(layerOf.get(id) || 0, layer));
    } else {
      visited.add(id);
      layerOf.set(id, layer);
    }
    for (const child of children.get(id) || []) {
      queue.push({ id: child, layer: layer + 1 });
    }
  }
  for (const n of nodes) {
    if (!layerOf.has(n.id)) layerOf.set(n.id, (Math.max(0, ...layerOf.values())) + 1);
  }

  // Group by layer
  const layers: string[][] = [];
  for (const [id, layer] of layerOf) {
    while (layers.length <= layer) layers.push([]);
    layers[layer].push(id);
  }

  // Barycenter ordering (4 passes)
  for (let pass = 0; pass < 4; pass++) {
    for (let li = 1; li < layers.length; li++) {
      const prevIndex = new Map(layers[li - 1].map((id, i) => [id, i]));
      layers[li].sort((a, b) => {
        const ap = parents.get(a) || [];
        const bp = parents.get(b) || [];
        const aAvg = ap.length > 0 ? ap.reduce((s, p) => s + (prevIndex.get(p) ?? 0), 0) / ap.length : 0;
        const bAvg = bp.length > 0 ? bp.reduce((s, p) => s + (prevIndex.get(p) ?? 0), 0) / bp.length : 0;
        return aAvg - bAvg;
      });
    }
  }

  // Position
  const nodeSpacing = 110;
  const layerGap = 100;
  const result: LayoutNode[] = [];

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const totalW = layer.length * nodeSpacing;
    const startX = -totalW / 2 + nodeSpacing / 2;

    for (let ni = 0; ni < layer.length; ni++) {
      const gn = nodeMap.get(layer[ni]);
      if (!gn) continue;
      const group = classifyNode(gn.label);
      result.push({
        id: gn.id,
        label: gn.label,
        x: startX + ni * nodeSpacing,
        y: li * layerGap,
        color: getGroupColor(group),
        group,
      });
    }
  }

  return result;
}

export function GraphPage({ data }: GraphPageProps) {
  const layoutData = useMemo(() => hierarchicalLayout(data.nodes, data.edges), [data.nodes, data.edges]);

  // Zoom / pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Focus mode: click a node to show only it + its direct connections
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Compute focus set
  const focusSet = useMemo(() => {
    if (!focusedNode) return null;
    const set = new Set<string>([focusedNode]);
    for (const e of data.edges) {
      if (e.source === focusedNode) set.add(e.target);
      if (e.target === focusedNode) set.add(e.source);
    }
    return set;
  }, [focusedNode, data.edges]);

  const visibleNodes = focusSet ? layoutData.filter((n) => focusSet.has(n.id)) : layoutData;
  const visibleEdges = focusSet
    ? data.edges.filter((e) => focusSet.has(e.source) && focusSet.has(e.target))
    : data.edges;

  const getNode = (id: string) => layoutData.find((n) => n.id === id);

  const isConnected = (nodeId: string): boolean => {
    if (focusSet) return focusSet.has(nodeId);
    if (!hovered) return true;
    if (nodeId === hovered) return true;
    return data.edges.some(
      (e) => (e.source === hovered && e.target === nodeId) || (e.target === hovered && e.source === nodeId),
    );
  };

  // Mouse handlers for pan
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x) / zoom,
      y: dragStart.current.panY + (e.clientY - dragStart.current.y) / zoom,
    });
  }, [dragging, zoom]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.2, Math.min(3, z * delta)));
  }, []);

  // Legend
  const groupEntries: [string, string][] = [];
  const seenGroups = new Set<string>();
  for (const n of layoutData) {
    if (!seenGroups.has(n.group)) {
      seenGroups.add(n.group);
      groupEntries.push([n.group.charAt(0).toUpperCase() + n.group.slice(1), n.color]);
    }
  }

  // Compute viewBox to center the graph
  const minX = Math.min(...layoutData.map((n) => n.x)) - 60;
  const maxX = Math.max(...layoutData.map((n) => n.x)) + 60;
  const minY = Math.min(...layoutData.map((n) => n.y)) - 40;
  const maxY = Math.max(...layoutData.map((n) => n.y)) + 60;
  const vbW = maxX - minX || 600;
  const vbH = maxY - minY || 400;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 750, color: T.text, letterSpacing: "-0.025em", margin: 0 }}>
            Dependency Graph
          </h1>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
            {data.nodes.length} components, {data.edges.length} dependencies.
            {focusedNode ? " Focus mode — click background to exit." : " Scroll to zoom, drag to pan, click a node to focus."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {focusedNode && (
            <button
              onClick={() => { setFocusedNode(null); setZoom(1); setPan({ x: 0, y: 0 }); }}
              style={{
                padding: "5px 12px", fontSize: 11, fontWeight: 600,
                background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}`,
                borderRadius: 6, cursor: "pointer", fontFamily: T.sans,
              }}
            >
              Show all
            </button>
          )}
          <button
            onClick={() => setZoom((z) => Math.min(3, z * 1.3))}
            style={{
              padding: "5px 10px", fontSize: 13, fontWeight: 600,
              background: T.surface, color: T.textMuted, border: `1px solid ${T.surfaceBorder}`,
              borderRadius: 6, cursor: "pointer",
            }}
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.2, z * 0.7))}
            style={{
              padding: "5px 10px", fontSize: 13, fontWeight: 600,
              background: T.surface, color: T.textMuted, border: `1px solid ${T.surfaceBorder}`,
              borderRadius: 6, cursor: "pointer",
            }}
          >
            -
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            style={{
              padding: "5px 10px", fontSize: 11, fontWeight: 600,
              background: T.surface, color: T.textMuted, border: `1px solid ${T.surfaceBorder}`,
              borderRadius: 6, cursor: "pointer", fontFamily: T.sans,
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {data.nodes.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 14, color: T.textDim }}>
          No cross-references found.
        </div>
      ) : (
        <>
          <div
            style={{
              borderRadius: 12, border: `1px solid ${T.surfaceBorder}`,
              background: T.cardBg, overflow: "hidden",
              cursor: dragging ? "grabbing" : "grab",
              height: 500,
              position: "relative",
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
          >
            <svg
              viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
              style={{
                width: "100%", height: "100%", display: "block",
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: "center center",
                transition: dragging ? "none" : "transform 0.15s ease",
              }}
              onClick={(e) => {
                // Click on background exits focus mode
                if ((e.target as SVGElement).tagName === "svg") {
                  setFocusedNode(null);
                }
              }}
            >
              {/* Edges */}
              {visibleEdges.map((e, i) => {
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

              {/* Arrow tips */}
              {visibleEdges.map((e, i) => {
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
                const mx = f.x + dx * 0.7;
                const my = f.y + dy * 0.7;
                return (
                  <polygon
                    key={"a" + i}
                    points={`${mx},${my - 3} ${mx + 6 * ux},${my + 6 * uy} ${mx},${my + 3}`}
                    fill={T.surfaceBorder}
                    opacity={0.6}
                  />
                );
              })}

              {/* Nodes */}
              {visibleNodes.map((n) => {
                const connected = isConnected(n.id);
                const isHov = hovered === n.id;
                const isFocused = focusedNode === n.id;
                const r = 16;

                return (
                  <g
                    key={n.id}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedNode(focusedNode === n.id ? null : n.id);
                    }}
                    style={{
                      cursor: "pointer",
                      transition: "opacity 0.3s",
                      opacity: connected ? 1 : 0.1,
                    }}
                  >
                    {/* Glow */}
                    {(isHov || isFocused) && (
                      <circle cx={n.x} cy={n.y} r={r + 10} fill={n.color} opacity={0.15} />
                    )}
                    {/* Circle */}
                    <circle
                      cx={n.x} cy={n.y} r={r}
                      fill={(isHov || isFocused) ? n.color + "30" : T.bg}
                      stroke={n.color}
                      strokeWidth={isFocused ? 3 : isHov ? 2.5 : 1.5}
                    />
                    {/* Group initial */}
                    <text
                      x={n.x} y={n.y + 4}
                      textAnchor="middle"
                      style={{ fontSize: 9, fontWeight: 700, fill: n.color, fontFamily: T.mono }}
                    >
                      {n.group.substring(0, 3).toUpperCase()}
                    </text>
                    {/* Label */}
                    <text
                      x={n.x} y={n.y + r + 14}
                      textAnchor="middle"
                      style={{
                        fontSize: 8.5, fontWeight: isHov || isFocused ? 650 : 400,
                        fill: connected ? T.text : T.textFaint,
                        fontFamily: T.sans, transition: "all 0.3s",
                      }}
                    >
                      {n.label.length > 20 ? n.label.substring(0, 18) + ".." : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {groupEntries.map(([label, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.textMuted }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                {label}
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {(hovered || focusedNode) && (() => {
            const n = getNode(focusedNode || hovered!);
            if (!n) return null;
            const nId = n.id;
            const deps = data.edges.filter((e) => e.source === nId).map((e) => getNode(e.target)).filter(Boolean) as LayoutNode[];
            const usedBy = data.edges.filter((e) => e.target === nId).map((e) => getNode(e.source)).filter(Boolean) as LayoutNode[];
            return (
              <div style={{
                marginTop: 12, padding: "14px 18px", borderRadius: 8,
                border: `1px solid ${n.color}30`, background: n.color + "08",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
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
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>
                    <span style={{ color: T.textDim, fontWeight: 600 }}>Depends on: </span>
                    {deps.map((d, i) => (
                      <span key={d.id}>
                        <span
                          style={{ color: d.color, cursor: "pointer", fontWeight: 500 }}
                          onClick={() => setFocusedNode(d.id)}
                        >
                          {d.label}
                        </span>
                        {i < deps.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                )}
                {usedBy.length > 0 && (
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    <span style={{ color: T.textDim, fontWeight: 600 }}>Used by: </span>
                    {usedBy.map((u, i) => (
                      <span key={u.id}>
                        <span
                          style={{ color: u.color, cursor: "pointer", fontWeight: 500 }}
                          onClick={() => setFocusedNode(u.id)}
                        >
                          {u.label}
                        </span>
                        {i < usedBy.length - 1 && ", "}
                      </span>
                    ))}
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
