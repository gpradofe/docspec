/**
 * Graph page generator.
 *
 * Produces GeneratedPage instances containing dependency graphs built
 * from structural relationships between members: extends, implements,
 * field types, method parameter types, return types, constructor
 * parameter types, and cross-reference annotations.
 *
 * Generates:
 *  - One combined graph at /architecture/graph with ALL artifacts
 *  - Per-artifact graphs at /architecture/{artifact-slug}/graph
 */

import type { Module, CrossRef } from "../../types/docspec.js";
import type { GeneratedPage, GraphPageData, GraphNode, GraphEdge } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { graphPageSlug } from "../slug.js";

// ---------------------------------------------------------------------------
// Public input types
// ---------------------------------------------------------------------------

export interface GraphPageInput {
  modules: Module[];
  crossRefs: CrossRef[];
  artifactLabel: string;
}

export interface CombinedGraphPageInput {
  artifacts: { modules: Module[]; crossRefs: CrossRef[]; artifactLabel: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the base type from a possibly-generic type string.
 *
 * - "List<io.docspec.Foo>"           -> "io.docspec.Foo"
 * - "Map<String, io.docspec.Bar>"    -> "Map" (multi-param generic, skip)
 * - "io.docspec.Foo"                 -> "io.docspec.Foo"
 * - "Optional<io.docspec.Baz>"       -> "io.docspec.Baz"
 * - "String"                         -> "String"
 *
 * For single-param generics (List, Set, Optional, Collection, etc.), we
 * extract the inner type. For multi-param generics (Map), we return the
 * outer type so it won't match any documented member.
 */
function extractBaseType(type: string): string {
  if (!type) return type;

  // Check for single-parameter generic: SomeType<InnerType>
  const genericMatch = type.match(/^([a-zA-Z0-9_.]+)<\s*([a-zA-Z0-9_.]+)\s*>$/);
  if (genericMatch) {
    // Single type param -- return the inner type
    return genericMatch[2];
  }

  // If it has angle brackets but more complex (Map<K,V>, etc.), return outer
  const simpleMatch = type.match(/^([a-zA-Z0-9_.]+)/);
  return simpleMatch ? simpleMatch[1] : type;
}

/**
 * Derive a package-level group from a qualified name.
 * e.g. "io.docspec.processor.dsti.NamingAnalyzer" -> "dsti"
 *      "io.docspec.annotation.DocModule" -> "annotation"
 */
function deriveGroup(qualified: string): string {
  const parts = qualified.split(".");
  if (parts.length >= 2) {
    // Use the second-to-last segment (the immediate package)
    return parts[parts.length - 2];
  }
  return parts[0] || "default";
}

/**
 * Map a member kind to a GraphNode type.
 */
function memberKindToNodeType(kind: string): GraphNode["type"] {
  switch (kind) {
    case "class": return "class";
    case "interface": return "interface";
    case "enum": return "enum";
    case "record": return "record";
    case "annotation": return "annotation";
    default: return "class";
  }
}

// ---------------------------------------------------------------------------
// Edge extraction
// ---------------------------------------------------------------------------

interface BuildGraphOptions {
  modules: Module[];
  crossRefs: CrossRef[];
  artifactLabel: string;
}

function buildNodesAndEdges(
  inputs: BuildGraphOptions[],
): { nodes: GraphNode[]; edges: GraphEdge[]; artifactLabels: string[] } {
  const nodes: GraphNode[] = [];
  const nodeIds = new Set<string>();
  const edges: GraphEdge[] = [];
  const qualifiedNames = new Set<string>();
  const artifactLabels: string[] = [];

  // First pass: collect all qualified names + build simple-to-qualified lookup
  const simpleToQualified = new Map<string, string>();
  for (const { modules, artifactLabel } of inputs) {
    if (!artifactLabels.includes(artifactLabel)) {
      artifactLabels.push(artifactLabel);
    }
    for (const mod of modules) {
      for (const member of mod.members ?? []) {
        qualifiedNames.add(member.qualified);
        // Map simple name → qualified (last one wins if ambiguous)
        simpleToQualified.set(member.name, member.qualified);
      }
    }
  }

  // Helper: resolve a type name (simple or qualified) to a known qualified name
  function resolveType(name: string): string | null {
    if (!name) return null;
    // Direct match on qualified name
    if (qualifiedNames.has(name)) return name;
    // Try simple name lookup
    const fromSimple = simpleToQualified.get(name);
    if (fromSimple) return fromSimple;
    // Try extracting simple name from qualified and matching
    const simpleName = name.includes(".") ? name.split(".").pop()! : name;
    const fromExtracted = simpleToQualified.get(simpleName);
    if (fromExtracted) return fromExtracted;
    return null;
  }

  // Second pass: build nodes and extract edges
  for (const { modules, crossRefs, artifactLabel } of inputs) {
    for (const mod of modules) {
      for (const member of mod.members ?? []) {
        const sourceId = member.qualified;

        // Add node if not yet present
        if (!nodeIds.has(sourceId)) {
          nodes.push({
            id: sourceId,
            label: member.name,
            type: memberKindToNodeType(member.kind),
            artifact: artifactLabel,
            module: mod.id,
            group: deriveGroup(sourceId),
          });
          nodeIds.add(sourceId);
        }

        // ── Extends edge ──────────────────────────────────────────
        if (member.extends) {
          const target = resolveType(member.extends);
          if (target && target !== sourceId) {
            edges.push({ source: sourceId, target, type: "extends" });
          }
        }

        // ── Implements edges ──────────────────────────────────────
        for (const iface of member.implements ?? []) {
          const target = resolveType(iface);
          if (target && target !== sourceId) {
            edges.push({ source: sourceId, target, type: "implements" });
          }
        }

        // ── Field type edges ──────────────────────────────────────
        for (const field of member.fields ?? []) {
          const fieldType = extractBaseType(field.type);
          const resolvedField = fieldType ? resolveType(fieldType) : null;
          if (resolvedField && resolvedField !== sourceId) {
            edges.push({ source: sourceId, target: resolvedField, type: "field", detail: field.name });
          }
        }

        // ── Method params + returns edges ─────────────────────────
        for (const method of member.methods ?? []) {
          for (const param of method.params ?? []) {
            const paramType = extractBaseType(param.type);
            const resolved = paramType ? resolveType(paramType) : null;
            if (resolved && resolved !== sourceId) {
              edges.push({ source: sourceId, target: resolved, type: "parameter", detail: method.name });
            }
          }
          if (method.returns?.type) {
            const retType = extractBaseType(method.returns.type);
            const resolved = retType ? resolveType(retType) : null;
            if (resolved && resolved !== sourceId) {
              edges.push({ source: sourceId, target: resolved, type: "returns", detail: method.name });
            }
          }
        }

        // ── Constructor param edges ───────────────────────────────
        for (const ctor of member.constructors ?? []) {
          for (const param of ctor.params ?? []) {
            const paramType = extractBaseType(param.type);
            const resolved = paramType ? resolveType(paramType) : null;
            if (resolved && resolved !== sourceId) {
              edges.push({ source: sourceId, target: resolved, type: "parameter", detail: "(constructor)" });
            }
          }
        }
      }
    }

    // ── Cross-reference edges ───────────────────────────────────────
    for (const ref of crossRefs) {
      const targetId = ref.targetMember ?? ref.targetFlow ?? ref.targetArtifact;

      // Ensure source node exists
      if (!nodeIds.has(ref.sourceQualified)) {
        nodes.push({
          id: ref.sourceQualified,
          label: ref.sourceQualified.split(".").pop() ?? ref.sourceQualified,
          type: "class",
          artifact: artifactLabel,
          group: deriveGroup(ref.sourceQualified),
        });
        nodeIds.add(ref.sourceQualified);
      }

      // Ensure target node exists
      if (!nodeIds.has(targetId)) {
        const isArtifact = targetId === ref.targetArtifact && !ref.targetMember && !ref.targetFlow;
        nodes.push({
          id: targetId,
          label: targetId.split(".").pop() ?? targetId,
          type: isArtifact ? "artifact" : "class",
        });
        nodeIds.add(targetId);
      }

      edges.push({
        source: ref.sourceQualified,
        target: targetId,
        type: "uses",
        label: ref.description ?? "references",
        detail: ref.description,
      });
    }
  }

  // Deduplicate edges: same source+target+type should only appear once
  const edgeKey = (e: GraphEdge): string =>
    `${e.source}|${e.target}|${e.type ?? ""}|${e.detail ?? ""}`;
  const seenEdges = new Set<string>();
  const dedupedEdges: GraphEdge[] = [];
  for (const edge of edges) {
    const key = edgeKey(edge);
    if (!seenEdges.has(key)) {
      seenEdges.add(key);
      dedupedEdges.push(edge);
    }
  }

  return { nodes, edges: dedupedEdges, artifactLabels };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a graph page for a single artifact.
 */
export function generateGraphPage(input: GraphPageInput): GeneratedPage {
  const { modules, crossRefs, artifactLabel } = input;
  const { nodes, edges, artifactLabels } = buildNodesAndEdges([
    { modules, crossRefs, artifactLabel },
  ]);

  const data: GraphPageData = {
    type: PageType.GRAPH,
    nodes,
    edges,
    artifacts: artifactLabels,
  };

  return {
    type: PageType.GRAPH,
    slug: graphPageSlug(artifactLabel),
    title: `${artifactLabel} — Dependency Graph`,
    description: `Visual dependency graph for ${artifactLabel}`,
    artifactLabel,
    data,
  };
}

/**
 * Generate a combined graph page across all artifacts.
 */
export function generateCombinedGraphPage(input: CombinedGraphPageInput): GeneratedPage {
  const { nodes, edges, artifactLabels } = buildNodesAndEdges(input.artifacts);

  const data: GraphPageData = {
    type: PageType.GRAPH,
    nodes,
    edges,
    artifacts: artifactLabels,
  };

  return {
    type: PageType.GRAPH,
    slug: graphPageSlug(),
    title: "Architecture — Dependency Graph",
    description: `Combined dependency graph across ${artifactLabels.length} artifacts`,
    data,
  };
}
