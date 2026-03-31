"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import type { GraphPageData, GraphNode, GraphEdge } from "@docspec/core";
import { T } from "../../lib/tokens.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "artifact" | "module" | "class";
type EdgeTypeFilter = "all" | "field" | "extends" | "implements" | "parameter" | "returns" | "uses";

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
  artifact?: string;
  module?: string;
  nodeType: GraphNode["type"];
  classCount?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARTIFACT_COLORS: string[] = [
  T.accent, T.green, T.orange, T.blue, T.pink, T.yellow, "#22d3ee", "#a78bfa",
];

const EDGE_STYLES: Record<string, { stroke: string; dash: string; width: number; label: string }> = {
  field:      { stroke: T.accent,  dash: "",       width: 2,   label: "Field dependency" },
  extends:    { stroke: T.green,   dash: "",       width: 2,   label: "Extends (inheritance)" },
  implements: { stroke: T.blue,    dash: "6,3",    width: 1.5, label: "Implements (interface)" },
  parameter:  { stroke: T.textDim, dash: "3,3",    width: 1,   label: "Parameter type" },
  returns:    { stroke: T.orange,  dash: "3,3",    width: 1,   label: "Return type" },
  uses:       { stroke: T.pink,    dash: "",       width: 2,   label: "Uses (@DocUses / cross-ref)" },
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getArtifactColor(artifact: string, allArtifacts: string[]): string {
  const idx = allArtifacts.indexOf(artifact);
  return ARTIFACT_COLORS[idx % ARTIFACT_COLORS.length];
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
    annotation: T.pink,
  };
  return map[group] || T.accent;
}

/** Hierarchical layout with BFS layers + barycenter ordering */
function hierarchicalLayout(nodes: GraphNode[], edges: GraphEdge[], allArtifacts: string[]): LayoutNode[] {
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
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      children.get(e.source)?.push(e.target);
      parents.get(e.target)?.push(e.source);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
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
  const nodeSpacing = 120;
  const layerGap = 110;
  const result: LayoutNode[] = [];

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const totalW = layer.length * nodeSpacing;
    const startX = -totalW / 2 + nodeSpacing / 2;

    for (let ni = 0; ni < layer.length; ni++) {
      const gn = nodeMap.get(layer[ni]);
      if (!gn) continue;
      const group = gn.group || "core";
      result.push({
        id: gn.id,
        label: gn.label,
        x: startX + ni * nodeSpacing,
        y: li * layerGap,
        color: gn.artifact ? getArtifactColor(gn.artifact, allArtifacts) : getGroupColor(group),
        group,
        artifact: gn.artifact,
        module: gn.module,
        nodeType: gn.type,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Aggregation for Artifact / Module views
// ---------------------------------------------------------------------------

function buildArtifactView(
  nodes: GraphNode[],
  edges: GraphEdge[],
  allArtifacts: string[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Group nodes by artifact
  const artifactMap = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const art = n.artifact || "unknown";
    if (!artifactMap.has(art)) artifactMap.set(art, []);
    artifactMap.get(art)!.push(n);
  }

  const aggregatedNodes: GraphNode[] = [];
  for (const [art, members] of artifactMap) {
    aggregatedNodes.push({
      id: `artifact:${art}`,
      label: `${art} (${members.length})`,
      type: "artifact",
      artifact: art,
    });
  }

  // Build node-to-artifact map
  const nodeArtifact = new Map<string, string>();
  for (const n of nodes) {
    nodeArtifact.set(n.id, n.artifact || "unknown");
  }

  // Aggregate and deduplicate cross-artifact edges
  const edgeSet = new Set<string>();
  const aggregatedEdges: GraphEdge[] = [];
  for (const e of edges) {
    const srcArt = nodeArtifact.get(e.source) || "unknown";
    const tgtArt = nodeArtifact.get(e.target) || "unknown";
    if (srcArt !== tgtArt) {
      const key = `artifact:${srcArt}|artifact:${tgtArt}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        aggregatedEdges.push({
          source: `artifact:${srcArt}`,
          target: `artifact:${tgtArt}`,
          type: "uses",
          label: "cross-artifact",
        });
      }
    }
  }

  return { nodes: aggregatedNodes, edges: aggregatedEdges };
}

function buildModuleView(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Group nodes by module+artifact
  const moduleMap = new Map<string, { artifact?: string; members: GraphNode[] }>();
  for (const n of nodes) {
    const key = `${n.artifact || ""}::${n.module || n.id}`;
    if (!moduleMap.has(key)) moduleMap.set(key, { artifact: n.artifact, members: [] });
    moduleMap.get(key)!.members.push(n);
  }

  const aggregatedNodes: GraphNode[] = [];
  const nodeToModule = new Map<string, string>();

  for (const [key, { artifact, members }] of moduleMap) {
    const moduleId = `module:${key}`;
    const moduleName = members[0]?.module || key.split("::")[1] || key;
    aggregatedNodes.push({
      id: moduleId,
      label: `${moduleName} (${members.length})`,
      type: "module",
      artifact,
      module: moduleName,
    });
    for (const m of members) {
      nodeToModule.set(m.id, moduleId);
    }
  }

  // Aggregate inter-module edges
  const edgeSet = new Set<string>();
  const aggregatedEdges: GraphEdge[] = [];
  for (const e of edges) {
    const srcMod = nodeToModule.get(e.source);
    const tgtMod = nodeToModule.get(e.target);
    if (srcMod && tgtMod && srcMod !== tgtMod) {
      const key = `${srcMod}|${tgtMod}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        aggregatedEdges.push({
          source: srcMod,
          target: tgtMod,
          type: e.type,
        });
      }
    }
  }

  return { nodes: aggregatedNodes, edges: aggregatedEdges };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Filter button */
function FilterBtn({
  label, active, onClick, color,
}: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        fontSize: 11,
        fontWeight: active ? 650 : 500,
        background: active ? (color ? color + "18" : T.accentBg) : T.surface,
        color: active ? (color || T.accent) : T.textMuted,
        border: `1px solid ${active ? (color ? color + "40" : T.accentBorder) : T.surfaceBorder}`,
        borderRadius: 6,
        cursor: "pointer",
        fontFamily: T.sans,
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

/** Kind badge */
function KindBadge({ kind, color }: { kind: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        padding: "1px 6px",
        borderRadius: 4,
        background: color + "18",
        color,
        border: `1px solid ${color}30`,
        fontFamily: T.mono,
        textTransform: "uppercase",
      }}
    >
      {kind}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GraphPage({ data }: GraphPageProps) {
  const allArtifacts = useMemo(() => data.artifacts || [], [data.artifacts]);

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [scopeFilter, setScopeFilter] = useState<Set<string>>(new Set(allArtifacts));
  const [edgeFilter, setEdgeFilter] = useState<Set<EdgeTypeFilter>>(new Set(["all"]));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Scope-filtered data
  const scopedData = useMemo(() => {
    const nodes = data.nodes.filter((n) =>
      !n.artifact || scopeFilter.has(n.artifact),
    );
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter((e) =>
      nodeIds.has(e.source) && nodeIds.has(e.target),
    );
    return { nodes, edges };
  }, [data.nodes, data.edges, scopeFilter]);

  // View-mode transformed data
  const viewData = useMemo(() => {
    if (viewMode === "artifact") {
      return buildArtifactView(scopedData.nodes, scopedData.edges, allArtifacts);
    }
    if (viewMode === "module") {
      return buildModuleView(scopedData.nodes, scopedData.edges);
    }
    return scopedData;
  }, [viewMode, scopedData, allArtifacts]);

  // Edge-type filtered edges
  const filteredEdges = useMemo(() => {
    if (edgeFilter.has("all")) return viewData.edges;
    return viewData.edges.filter((e) => e.type && edgeFilter.has(e.type as EdgeTypeFilter));
  }, [viewData.edges, edgeFilter]);

  // Focus set — compute which nodes are in scope when a node is clicked
  const focusSet = useMemo(() => {
    if (!focusedNode) return null;
    const set = new Set<string>([focusedNode]);
    for (const e of filteredEdges) {
      if (e.source === focusedNode) set.add(e.target);
      if (e.target === focusedNode) set.add(e.source);
    }
    return set;
  }, [focusedNode, filteredEdges]);

  // When focused: filter nodes/edges THEN re-layout (so nodes spread out)
  // When unfocused: layout all nodes
  const focusedNodes = focusSet
    ? viewData.nodes.filter((n) => focusSet.has(n.id))
    : viewData.nodes;
  const focusedEdges = focusSet
    ? filteredEdges.filter((e) => focusSet.has(e.source) && focusSet.has(e.target))
    : filteredEdges;

  // Layout runs on the FOCUSED set (re-organizes when focus changes)
  const layoutData = useMemo(
    () => hierarchicalLayout(focusedNodes, focusedEdges, allArtifacts),
    [focusedNodes, focusedEdges, allArtifacts],
  );

  const visibleNodes = layoutData;
  const visibleEdges = focusedEdges;

  const getNode = useCallback(
    (id: string) => layoutData.find((n) => n.id === id),
    [layoutData],
  );

  const isConnected = useCallback(
    (nodeId: string): boolean => {
      if (focusSet) return focusSet.has(nodeId);
      if (!hovered) return true;
      if (nodeId === hovered) return true;
      return filteredEdges.some(
        (e) => (e.source === hovered && e.target === nodeId) || (e.target === hovered && e.source === nodeId),
      );
    },
    [focusSet, hovered, filteredEdges],
  );

  // Artifact clusters (bounding boxes for Class view)
  const artifactClusters = useMemo(() => {
    if (viewMode !== "class") return [];
    const clusters = new Map<string, { minX: number; maxX: number; minY: number; maxY: number; color: string }>();
    for (const n of visibleNodes) {
      const art = n.artifact;
      if (!art) continue;
      if (!clusters.has(art)) {
        clusters.set(art, {
          minX: n.x, maxX: n.x, minY: n.y, maxY: n.y,
          color: getArtifactColor(art, allArtifacts),
        });
      } else {
        const c = clusters.get(art)!;
        c.minX = Math.min(c.minX, n.x);
        c.maxX = Math.max(c.maxX, n.x);
        c.minY = Math.min(c.minY, n.y);
        c.maxY = Math.max(c.maxY, n.y);
      }
    }
    return Array.from(clusters.entries()).map(([art, bounds]) => ({
      artifact: art,
      ...bounds,
    }));
  }, [viewMode, visibleNodes, allArtifacts]);

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

  // Scope toggle
  const toggleScope = useCallback((art: string) => {
    setScopeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(art)) {
        if (next.size > 1) next.delete(art);
      } else {
        next.add(art);
      }
      return next;
    });
  }, []);

  // Edge filter toggle
  const toggleEdgeFilter = useCallback((type: EdgeTypeFilter) => {
    if (type === "all") {
      setEdgeFilter(new Set(["all"]));
      return;
    }
    setEdgeFilter((prev) => {
      const next = new Set(prev);
      next.delete("all");
      if (next.has(type)) {
        next.delete(type);
        if (next.size === 0) next.add("all");
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Compute viewBox to center the graph
  const padding = 80;
  const allX = layoutData.map((n) => n.x);
  const allY = layoutData.map((n) => n.y);
  const minX = (allX.length > 0 ? Math.min(...allX) : 0) - padding;
  const maxX = (allX.length > 0 ? Math.max(...allX) : 0) + padding;
  const minY = (allY.length > 0 ? Math.min(...allY) : 0) - padding;
  const maxY = (allY.length > 0 ? Math.max(...allY) : 0) + padding;
  const vbW = maxX - minX || 600;
  const vbH = maxY - minY || 400;

  // Edge style helper
  const getEdgeStyle = (type?: string) => {
    return EDGE_STYLES[type || "uses"] || EDGE_STYLES.uses;
  };

  // Detail panel data
  const detailNode = focusedNode || hovered;
  const detailLayout = detailNode ? getNode(detailNode) : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 750, color: T.text, letterSpacing: "-0.025em", margin: 0 }}>
            Dependency Graph
          </h1>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
            {viewData.nodes.length} nodes, {filteredEdges.length} edges.
            {focusedNode ? " Focus mode active." : " Scroll to zoom, drag to pan, click a node to focus."}
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

      {/* ── View mode toggles ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textDim, marginRight: 4 }}>View:</span>
        {(["artifact", "module", "class"] as ViewMode[]).map((mode) => (
          <FilterBtn
            key={mode}
            label={mode.charAt(0).toUpperCase() + mode.slice(1)}
            active={viewMode === mode}
            onClick={() => { setViewMode(mode); setFocusedNode(null); }}
          />
        ))}
      </div>

      {/* Scope is controlled by the project selector in the header — no separate scope filter here */}

      {/* ── Edge type filter ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textDim, marginRight: 4 }}>Edges:</span>
        <FilterBtn label="All" active={edgeFilter.has("all")} onClick={() => toggleEdgeFilter("all")} />
        {(["field", "extends", "implements", "parameter", "returns", "uses"] as EdgeTypeFilter[]).map((et) => (
          <FilterBtn
            key={et}
            label={et.charAt(0).toUpperCase() + et.slice(1)}
            active={edgeFilter.has(et)}
            onClick={() => toggleEdgeFilter(et)}
            color={EDGE_STYLES[et]?.stroke}
          />
        ))}
      </div>

      {viewData.nodes.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 14, color: T.textDim }}>
          No components found for the selected scope.
        </div>
      ) : (
        <>
          {/* ── Graph canvas ────────────────────────────────────────── */}
          <div
            style={{
              borderRadius: 12, border: `1px solid ${T.surfaceBorder}`,
              background: T.cardBg, overflow: "hidden",
              cursor: dragging ? "grabbing" : "grab",
              height: 520,
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
                if ((e.target as SVGElement).tagName === "svg") {
                  setFocusedNode(null);
                }
              }}
            >
              {/* Arrow marker definitions */}
              <defs>
                {Object.entries(EDGE_STYLES).map(([type, style]) => (
                  <React.Fragment key={type}>
                    <marker
                      id={`arrow-${type}`}
                      viewBox="0 0 10 7"
                      refX="10"
                      refY="3.5"
                      markerWidth="8"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill={type === "implements" ? "none" : style.stroke}
                        stroke={style.stroke}
                        strokeWidth={type === "implements" ? 1 : 0}
                      />
                    </marker>
                  </React.Fragment>
                ))}
              </defs>

              {/* Artifact cluster backgrounds (class view only) */}
              {artifactClusters.map((c) => (
                <rect
                  key={c.artifact}
                  x={c.minX - 40}
                  y={c.minY - 30}
                  width={c.maxX - c.minX + 80}
                  height={c.maxY - c.minY + 70}
                  rx={12}
                  fill={c.color + "0D"}
                  stroke={c.color + "15"}
                  strokeWidth={1}
                />
              ))}

              {/* Cluster labels */}
              {artifactClusters.map((c) => (
                <text
                  key={`label-${c.artifact}`}
                  x={c.minX - 32}
                  y={c.minY - 14}
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    fill: c.color + "60",
                    fontFamily: T.sans,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {c.artifact}
                </text>
              ))}

              {/* Edges */}
              {visibleEdges.map((e, i) => {
                const f = getNode(e.source);
                const t = getNode(e.target);
                if (!f || !t) return null;
                const active = !hovered || e.source === hovered || e.target === hovered;
                const style = getEdgeStyle(e.type);
                return (
                  <line
                    key={i}
                    x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                    stroke={active ? style.stroke : style.stroke + "30"}
                    strokeWidth={active ? style.width : 0.5}
                    strokeDasharray={active ? style.dash : "4,4"}
                    markerEnd={active ? `url(#arrow-${e.type || "uses"})` : undefined}
                    style={{ transition: "all 0.3s" }}
                  />
                );
              })}

              {/* Nodes */}
              {visibleNodes.map((n) => {
                const connected = isConnected(n.id);
                const isHov = hovered === n.id;
                const isFocused = focusedNode === n.id;
                const isArtifactOrModule = n.nodeType === "artifact" || n.nodeType === "module";
                const r = isArtifactOrModule ? 22 : 16;

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
                    {/* Shape: rect for artifact/module, circle for class-level */}
                    {isArtifactOrModule ? (
                      <rect
                        x={n.x - r}
                        y={n.y - r}
                        width={r * 2}
                        height={r * 2}
                        rx={6}
                        fill={(isHov || isFocused) ? n.color + "30" : T.bg}
                        stroke={n.color}
                        strokeWidth={isFocused ? 3 : isHov ? 2.5 : 1.5}
                      />
                    ) : (
                      <circle
                        cx={n.x} cy={n.y} r={r}
                        fill={(isHov || isFocused) ? n.color + "30" : T.bg}
                        stroke={n.color}
                        strokeWidth={isFocused ? 3 : isHov ? 2.5 : 1.5}
                      />
                    )}
                    {/* Type initial */}
                    <text
                      x={n.x} y={n.y + 4}
                      textAnchor="middle"
                      style={{ fontSize: 9, fontWeight: 700, fill: n.color, fontFamily: T.mono }}
                    >
                      {n.nodeType === "artifact" ? "ART"
                        : n.nodeType === "module" ? "MOD"
                        : n.nodeType === "interface" ? "I"
                        : n.nodeType === "enum" ? "E"
                        : n.nodeType === "record" ? "R"
                        : n.nodeType === "annotation" ? "@"
                        : "C"}
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
                      {n.label.length > 22 ? n.label.substring(0, 20) + ".." : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ── Edge legend ─────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {Object.entries(EDGE_STYLES).map(([type, style]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.textMuted }}>
                <svg width={24} height={8}>
                  <line
                    x1={0} y1={4} x2={24} y2={4}
                    stroke={style.stroke}
                    strokeWidth={style.width}
                    strokeDasharray={style.dash}
                  />
                </svg>
                {style.label}
              </div>
            ))}
          </div>

          {/* ── Artifact color legend ──────────────────────────────── */}
          {allArtifacts.length > 1 && (
            <div style={{ display: "flex", gap: 14, marginTop: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {allArtifacts.map((art) => (
                <div key={art} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.textMuted }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: getArtifactColor(art, allArtifacts),
                  }} />
                  {art}
                </div>
              ))}
            </div>
          )}

          {/* ── Detail panel ───────────────────────────────────────── */}
          {detailLayout && (() => {
            const n = detailLayout;
            const nId = n.id;

            // Compute deps with edge types
            const depsEdges = data.edges.filter((e) => e.source === nId);
            const usedByEdges = data.edges.filter((e) => e.target === nId);

            // Group deps by edge type
            const depsByType = new Map<string, { target: string; detail?: string }[]>();
            for (const e of depsEdges) {
              const t = e.type || "uses";
              if (!depsByType.has(t)) depsByType.set(t, []);
              depsByType.get(t)!.push({ target: e.target, detail: e.detail });
            }

            const usedByNames = usedByEdges
              .map((e) => getNode(e.source))
              .filter(Boolean) as LayoutNode[];

            return (
              <div style={{
                marginTop: 12, padding: "14px 18px", borderRadius: 8,
                border: `1px solid ${n.color}30`, background: n.color + "08",
              }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <KindBadge kind={n.nodeType} color={n.color} />
                  {n.artifact && (
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                      background: getArtifactColor(n.artifact, allArtifacts) + "18",
                      color: getArtifactColor(n.artifact, allArtifacts),
                      border: `1px solid ${getArtifactColor(n.artifact, allArtifacts)}30`,
                      fontFamily: T.sans,
                    }}>
                      {n.artifact}
                    </span>
                  )}
                  {n.module && (
                    <span style={{
                      fontSize: 9, fontWeight: 500, padding: "1px 6px", borderRadius: 4,
                      background: T.surface, color: T.textMuted,
                      border: `1px solid ${T.surfaceBorder}`,
                      fontFamily: T.mono,
                    }}>
                      {n.module}
                    </span>
                  )}
                  <code style={{ fontSize: 13, fontWeight: 650, color: T.text, fontFamily: T.mono }}>
                    {n.label}
                  </code>
                </div>

                {/* Dependency breakdown */}
                {depsByType.size > 0 && (
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>
                    <span style={{ color: T.textDim, fontWeight: 600 }}>Depends on: </span>
                    {Array.from(depsByType.entries()).map(([type, targets], ti) => (
                      <span key={type}>
                        {ti > 0 && " | "}
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: EDGE_STYLES[type]?.stroke || T.textDim,
                        }}>
                          {type}:
                        </span>{" "}
                        {targets.map((t, i) => {
                          const targetNode = getNode(t.target);
                          return (
                            <span key={`${t.target}-${i}`}>
                              <span
                                style={{ color: targetNode?.color || T.text, cursor: "pointer", fontWeight: 500 }}
                                onClick={() => setFocusedNode(t.target)}
                              >
                                {targetNode?.label || t.target.split(".").pop()}
                              </span>
                              {t.detail && (
                                <span style={{ fontSize: 10, color: T.textDim }}> ({t.detail})</span>
                              )}
                              {i < targets.length - 1 && ", "}
                            </span>
                          );
                        })}
                      </span>
                    ))}
                  </div>
                )}

                {/* Used by */}
                {usedByNames.length > 0 && (
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>
                    <span style={{ color: T.textDim, fontWeight: 600 }}>Used by: </span>
                    {usedByNames.map((u, i) => (
                      <span key={u.id}>
                        <span
                          style={{ color: u.color, cursor: "pointer", fontWeight: 500 }}
                          onClick={() => setFocusedNode(u.id)}
                        >
                          {u.label}
                        </span>
                        {i < usedByNames.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                )}

                {/* Summary counts */}
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>
                  {depsEdges.length} total dependencies, {usedByEdges.length} dependents
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
