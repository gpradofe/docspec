/**
 * Graph page generator.
 *
 * Produces a GeneratedPage containing a dependency graph built from
 * cross-references between artifacts, modules, and members.
 */

import type { CrossRef, Module } from "../../types/docspec.js";
import type { GeneratedPage, GraphPageData, GraphNode, GraphEdge } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { graphPageSlug } from "../slug.js";

export interface GraphPageInput {
  modules: Module[];
  crossRefs: CrossRef[];
  artifactLabel: string;
}

/**
 * Build a graph from modules and cross-references.
 *
 * Nodes are created for each module and each member. Edges are created
 * from cross-reference entries linking source members to their targets.
 */
function buildGraph(
  modules: Module[],
  crossRefs: CrossRef[],
  artifactLabel: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const nodeIds = new Set<string>();
  const edges: GraphEdge[] = [];

  // Add module nodes and member nodes
  for (const mod of modules) {
    if (!nodeIds.has(mod.id)) {
      nodes.push({
        id: mod.id,
        label: mod.name ?? mod.id,
        type: "module",
        artifact: artifactLabel,
      });
      nodeIds.add(mod.id);
    }

    for (const member of mod.members ?? []) {
      if (!nodeIds.has(member.qualified)) {
        nodes.push({
          id: member.qualified,
          label: member.name,
          type: "member",
          artifact: artifactLabel,
        });
        nodeIds.add(member.qualified);
      }

      // Edge from module to member (containment)
      edges.push({
        source: mod.id,
        target: member.qualified,
        label: "contains",
      });
    }
  }

  // Add edges from cross-refs
  for (const ref of crossRefs) {
    // Ensure source node exists
    if (!nodeIds.has(ref.sourceQualified)) {
      nodes.push({
        id: ref.sourceQualified,
        label: ref.sourceQualified.split(".").pop() ?? ref.sourceQualified,
        type: "member",
        artifact: artifactLabel,
      });
      nodeIds.add(ref.sourceQualified);
    }

    // Determine target id
    const targetId = ref.targetMember ?? ref.targetFlow ?? ref.targetArtifact;

    // Ensure target node exists
    if (!nodeIds.has(targetId)) {
      const isArtifact = targetId === ref.targetArtifact && !ref.targetMember && !ref.targetFlow;
      nodes.push({
        id: targetId,
        label: targetId.split(".").pop() ?? targetId,
        type: isArtifact ? "artifact" : "member",
      });
      nodeIds.add(targetId);
    }

    edges.push({
      source: ref.sourceQualified,
      target: targetId,
      label: ref.description ?? "references",
    });
  }

  return { nodes, edges };
}

export function generateGraphPage(input: GraphPageInput): GeneratedPage {
  const { modules, crossRefs, artifactLabel } = input;
  const { nodes, edges } = buildGraph(modules, crossRefs, artifactLabel);

  const data: GraphPageData = {
    type: PageType.GRAPH,
    nodes,
    edges,
  };

  return {
    type: PageType.GRAPH,
    slug: graphPageSlug(artifactLabel),
    title: `${artifactLabel} — Dependency Graph`,
    description: `Visual dependency graph across modules and artifacts for ${artifactLabel}`,
    artifactLabel,
    data,
  };
}
