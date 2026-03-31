"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { GraphPageData, GraphNode, GraphEdge } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { useLens } from "../../context/LensContext.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "artifact" | "module" | "class";
type EdgeTypeFilter = "all" | "field" | "extends" | "implements" | "parameter" | "returns" | "uses";
type AnimPhase = "idle" | "fadeOut" | "moving" | "fadeIn";

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

/** Timing constants (ms) for the staged animation */
const ANIM = {
  fadeOutDuration: 300,
  moveDuration: 600,
  fadeInDuration: 300,
  zoomTransition: 0.3,
} as const;

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

  // Read selected artifacts from Layout context (synced with project selector)
  let contextArtifacts: Set<string> | null = null;
  try {
    const { selectedArtifacts } = useLens();
    contextArtifacts = selectedArtifacts;
  } catch { /* outside provider — use all */ }
  const scopeFilter = contextArtifacts && contextArtifacts.size > 0
    ? contextArtifacts
    : new Set(allArtifacts);

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [edgeFilter, setEdgeFilter] = useState<Set<EdgeTypeFilter>>(new Set(["all"]));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const animTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear pending animation timers on unmount
  useEffect(() => {
    return () => {
      for (const t of animTimers.current) clearTimeout(t);
    };
  }, []);

  // Scope-filtered data (synced with project selector)
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

  // Focus set — compute which nodes are connected when a node is focused
  const focusSet = useMemo(() => {
    if (!focusedNode) return null;
    const set = new Set<string>([focusedNode]);
    for (const e of filteredEdges) {
      if (e.source === focusedNode) set.add(e.target);
      if (e.target === focusedNode) set.add(e.source);
    }
    return set;
  }, [focusedNode, filteredEdges]);

  // ---------------------------------------------------------------------------
  // Dual layout: always compute BOTH full and focused layouts
  // ---------------------------------------------------------------------------

  // Full layout: all nodes laid out together
  const fullLayout = useMemo(
    () => hierarchicalLayout(viewData.nodes, filteredEdges, allArtifacts),
    [viewData.nodes, filteredEdges, allArtifacts],
  );

  // Focused subset nodes/edges (for focused layout computation)
  const focusedSubsetNodes = useMemo(() => {
    if (!focusSet) return viewData.nodes;
    return viewData.nodes.filter((n) => focusSet.has(n.id));
  }, [focusSet, viewData.nodes]);

  const focusedSubsetEdges = useMemo(() => {
    if (!focusSet) return filteredEdges;
    return filteredEdges.filter((e) => focusSet.has(e.source) && focusSet.has(e.target));
  }, [focusSet, filteredEdges]);

  // Focused layout: only connected nodes, re-laid out
  const focusedLayout = useMemo(
    () => hierarchicalLayout(focusedSubsetNodes, focusedSubsetEdges, allArtifacts),
    [focusedSubsetNodes, focusedSubsetEdges, allArtifacts],
  );

  // Build position lookup maps
  const fullPositions = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of fullLayout) m.set(n.id, { x: n.x, y: n.y });
    return m;
  }, [fullLayout]);

  const focusedPositions = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of focusedLayout) m.set(n.id, { x: n.x, y: n.y });
    return m;
  }, [focusedLayout]);

  // The active position map: nodes read their target position from here
  const activePositions = focusedNode ? focusedPositions : fullPositions;

  // All nodes are always rendered (from fullLayout for metadata). Their positions
  // come from whichever layout is active.
  const allNodes = fullLayout;

  // Visible edges depend on focus state
  const visibleEdges = focusedNode ? focusedSubsetEdges : filteredEdges;

  // ---------------------------------------------------------------------------
  // Auto-zoom to fit a set of nodes
  // ---------------------------------------------------------------------------

  const fitToView = useCallback((positions: Map<string, { x: number; y: number }>) => {
    if (positions.size === 0) return;
    const coords = Array.from(positions.values());
    const minX = Math.min(...coords.map((c) => c.x));
    const maxX = Math.max(...coords.map((c) => c.x));
    const minY = Math.min(...coords.map((c) => c.y));
    const maxY = Math.max(...coords.map((c) => c.y));
    const graphW = maxX - minX + 160;
    const graphH = maxY - minY + 160;
    const containerW = containerRef.current?.clientWidth || 800;
    const containerH = containerRef.current?.clientHeight || 520;
    const newZoom = Math.min(containerW / graphW, containerH / graphH, 2);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setZoom(Math.max(0.3, newZoom));
    setPan({ x: -centerX + containerW / (2 * newZoom), y: -centerY + containerH / (2 * newZoom) });
  }, []);

  // ---------------------------------------------------------------------------
  // Staged animation handler
  // ---------------------------------------------------------------------------

  const handleFocusChange = useCallback((nodeId: string | null) => {
    // Cancel any in-progress animation
    for (const t of animTimers.current) clearTimeout(t);
    animTimers.current = [];

    // Phase 1: Fade out edges (and unconnected nodes for focus, or nothing for unfocus)
    setAnimPhase("fadeOut");

    const t1 = setTimeout(() => {
      // Phase 2: Update the focused node (triggers new layout), move nodes
      setFocusedNode(nodeId);
      setAnimPhase("moving");

      // After a brief frame, auto-zoom to fit the target layout
      const t1b = setTimeout(() => {
        if (nodeId) {
          // Focusing: build a temporary focus set to compute positions
          const tempFocusSet = new Set<string>([nodeId]);
          for (const e of filteredEdges) {
            if (e.source === nodeId) tempFocusSet.add(e.target);
            if (e.target === nodeId) tempFocusSet.add(e.source);
          }
          const tempNodes = viewData.nodes.filter((n) => tempFocusSet.has(n.id));
          const tempEdges = filteredEdges.filter(
            (e) => tempFocusSet.has(e.source) && tempFocusSet.has(e.target),
          );
          const tempLayout = hierarchicalLayout(tempNodes, tempEdges, allArtifacts);
          const posMap = new Map<string, { x: number; y: number }>();
          for (const n of tempLayout) posMap.set(n.id, { x: n.x, y: n.y });
          fitToView(posMap);
        } else {
          // Unfocusing: fit to full layout
          fitToView(fullPositions);
        }
      }, 16);
      animTimers.current.push(t1b);

      // Phase 3: Fade in edges
      const t2 = setTimeout(() => {
        setAnimPhase("fadeIn");

        const t3 = setTimeout(() => {
          setAnimPhase("idle");
        }, ANIM.fadeInDuration);
        animTimers.current.push(t3);
      }, ANIM.moveDuration);
      animTimers.current.push(t2);
    }, ANIM.fadeOutDuration);
    animTimers.current.push(t1);
  }, [filteredEdges, viewData.nodes, allArtifacts, fullPositions, fitToView]);

  // ---------------------------------------------------------------------------
  // Node helpers
  // ---------------------------------------------------------------------------

  const getNodeById = useCallback(
    (id: string) => fullLayout.find((n) => n.id === id),
    [fullLayout],
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

  // ---------------------------------------------------------------------------
  // Artifact cluster bounding boxes (class view only, based on active positions)
  // ---------------------------------------------------------------------------

  const artifactClusters = useMemo(() => {
    if (viewMode !== "class") return [];
    const clusters = new Map<string, { minX: number; maxX: number; minY: number; maxY: number; color: string }>();
    for (const n of allNodes) {
      if (focusedNode && focusSet && !focusSet.has(n.id)) continue;
      const art = n.artifact;
      if (!art) continue;
      const pos = activePositions.get(n.id);
      if (!pos) continue;
      if (!clusters.has(art)) {
        clusters.set(art, {
          minX: pos.x, maxX: pos.x, minY: pos.y, maxY: pos.y,
          color: getArtifactColor(art, allArtifacts),
        });
      } else {
        const c = clusters.get(art)!;
        c.minX = Math.min(c.minX, pos.x);
        c.maxX = Math.max(c.maxX, pos.x);
        c.minY = Math.min(c.minY, pos.y);
        c.maxY = Math.max(c.maxY, pos.y);
      }
    }
    return Array.from(clusters.entries()).map(([art, bounds]) => ({
      artifact: art,
      ...bounds,
    }));
  }, [viewMode, allNodes, allArtifacts, focusedNode, focusSet, activePositions]);

  // ---------------------------------------------------------------------------
  // Legend filtering: only show types/groups present in the current view
  // ---------------------------------------------------------------------------

  const visibleEdgeTypes = useMemo(() => {
    return new Set(visibleEdges.map((e) => e.type).filter(Boolean) as string[]);
  }, [visibleEdges]);

  const visibleArtifactGroups = useMemo(() => {
    if (!focusedNode) return new Set(allArtifacts);
    const groups = new Set<string>();
    for (const n of allNodes) {
      if (focusSet && focusSet.has(n.id) && n.artifact) {
        groups.add(n.artifact);
      }
    }
    return groups;
  }, [focusedNode, focusSet, allNodes, allArtifacts]);

  // ---------------------------------------------------------------------------
  // Mouse handlers for pan
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Compute viewBox from all node positions (full layout — stable viewBox)
  // ---------------------------------------------------------------------------

  const padding = 80;
  const allX = fullLayout.map((n) => n.x);
  const allY = fullLayout.map((n) => n.y);
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

  // ---------------------------------------------------------------------------
  // Animation-derived styles
  // ---------------------------------------------------------------------------

  // Edge opacity: hidden during fadeOut and moving phases, visible during fadeIn and idle
  const edgeOpacity = animPhase === "fadeOut" || animPhase === "moving" ? 0 : 1;

  // Node CSS transition depends on the current phase
  const nodeTransition = animPhase === "moving"
    ? `transform ${ANIM.moveDuration}ms ease, opacity ${ANIM.fadeOutDuration}ms ease`
    : `opacity ${ANIM.fadeOutDuration}ms ease`;

  // SVG-level transform transition: smooth for zoom buttons, off during drag
  const svgTransformTransition = dragging
    ? "none"
    : `transform ${ANIM.zoomTransition}s ease-out`;

  // Detail panel data
  const detailNode = focusedNode || hovered;
  const detailLayout = detailNode ? getNodeById(detailNode) : null;

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
              onClick={() => handleFocusChange(null)}
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

      {/* View mode toggles */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textDim, marginRight: 4 }}>View:</span>
        {(["artifact", "module", "class"] as ViewMode[]).map((mode) => (
          <FilterBtn
            key={mode}
            label={mode.charAt(0).toUpperCase() + mode.slice(1)}
            active={viewMode === mode}
            onClick={() => { setViewMode(mode); setFocusedNode(null); setAnimPhase("idle"); }}
          />
        ))}
      </div>

      {/* Edge type filter */}
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
          {/* Graph canvas */}
          <div
            ref={containerRef}
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
                transition: svgTransformTransition,
              }}
              onClick={(e) => {
                if ((e.target as SVGElement).tagName === "svg") {
                  if (focusedNode) handleFocusChange(null);
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
                  style={{ transition: `all ${ANIM.moveDuration}ms ease` }}
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
                    transition: `all ${ANIM.moveDuration}ms ease`,
                  }}
                >
                  {c.artifact}
                </text>
              ))}

              {/* Edges — rendered from visibleEdges, positions read from active layout */}
              {visibleEdges.map((e, i) => {
                const fPos = activePositions.get(e.source);
                const tPos = activePositions.get(e.target);
                if (!fPos || !tPos) return null;
                const active = !hovered || e.source === hovered || e.target === hovered;
                const style = getEdgeStyle(e.type);
                return (
                  <line
                    key={`${e.source}-${e.target}-${e.type || i}`}
                    x1={fPos.x} y1={fPos.y} x2={tPos.x} y2={tPos.y}
                    stroke={active ? style.stroke : style.stroke + "30"}
                    strokeWidth={active ? style.width : 0.5}
                    strokeDasharray={active ? style.dash : "4,4"}
                    markerEnd={active ? `url(#arrow-${e.type || "uses"})` : undefined}
                    style={{
                      opacity: edgeOpacity,
                      transition: `opacity ${ANIM.fadeOutDuration}ms ease, x1 ${ANIM.moveDuration}ms ease, y1 ${ANIM.moveDuration}ms ease, x2 ${ANIM.moveDuration}ms ease, y2 ${ANIM.moveDuration}ms ease`,
                    }}
                  />
                );
              })}

              {/* Nodes — ALL nodes always rendered; position and opacity driven by animation */}
              {allNodes.map((n) => {
                const connected = isConnected(n.id);
                const isHov = hovered === n.id;
                const isFocused = focusedNode === n.id;
                const isArtifactOrModule = n.nodeType === "artifact" || n.nodeType === "module";
                const r = isArtifactOrModule ? 22 : 16;

                // Read target position from the active layout; fall back to full layout position
                const pos = activePositions.get(n.id) || { x: n.x, y: n.y };

                // Node opacity: fully connected = 1, unconnected during focus = 0
                const nodeOpacity = connected ? 1 : 0;

                return (
                  <g
                    key={n.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (animPhase !== "idle") return; // Ignore clicks during animation
                      handleFocusChange(focusedNode === n.id ? null : n.id);
                    }}
                    style={{
                      cursor: animPhase !== "idle" ? "default" : "pointer",
                      transition: nodeTransition,
                      opacity: nodeOpacity,
                      pointerEvents: connected ? "auto" : "none",
                    }}
                  >
                    {/* Glow */}
                    {(isHov || isFocused) && (
                      <circle cx={0} cy={0} r={r + 10} fill={n.color} opacity={0.15} />
                    )}
                    {/* Shape: rect for artifact/module, circle for class-level */}
                    {isArtifactOrModule ? (
                      <rect
                        x={-r}
                        y={-r}
                        width={r * 2}
                        height={r * 2}
                        rx={6}
                        fill={(isHov || isFocused) ? n.color + "30" : T.bg}
                        stroke={n.color}
                        strokeWidth={isFocused ? 3 : isHov ? 2.5 : 1.5}
                      />
                    ) : (
                      <circle
                        cx={0} cy={0} r={r}
                        fill={(isHov || isFocused) ? n.color + "30" : T.bg}
                        stroke={n.color}
                        strokeWidth={isFocused ? 3 : isHov ? 2.5 : 1.5}
                      />
                    )}
                    {/* Type initial */}
                    <text
                      x={0} y={4}
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
                      x={0} y={r + 14}
                      textAnchor="middle"
                      style={{
                        fontSize: 8.5, fontWeight: isHov || isFocused ? 650 : 400,
                        fill: connected ? T.text : T.textFaint,
                        fontFamily: T.sans, transition: "all 0.3s",
                      }}
                    >
                      {n.label.length > 22 ? n.label.substring(0, 20) + ".." : n.label}
                    </text>
                    {/* Class count for artifact/module nodes */}
                    {n.classCount !== undefined && n.classCount > 0 && (
                      <text
                        x={0} y={r + 25}
                        textAnchor="middle"
                        style={{ fontSize: 7.5, fill: T.textDim, fontFamily: T.mono }}
                      >
                        {n.classCount} classes
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Edge legend — only show types present in visible edges */}
          <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {Object.entries(EDGE_STYLES)
              .filter(([type]) => !focusedNode || visibleEdgeTypes.has(type))
              .map(([type, style]) => (
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

          {/* Artifact color legend — only show artifacts present in visible nodes */}
          {allArtifacts.length > 1 && (
            <div style={{ display: "flex", gap: 14, marginTop: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {allArtifacts
                .filter((art) => visibleArtifactGroups.has(art))
                .map((art) => (
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

          {/* Detail panel */}
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
              .map((e) => getNodeById(e.source))
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
                          const targetNode = getNodeById(t.target);
                          return (
                            <span key={`${t.target}-${i}`}>
                              <span
                                style={{ color: targetNode?.color || T.text, cursor: "pointer", fontWeight: 500 }}
                                onClick={() => {
                                  if (animPhase === "idle") handleFocusChange(t.target);
                                }}
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
                          onClick={() => {
                            if (animPhase === "idle") handleFocusChange(u.id);
                          }}
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
