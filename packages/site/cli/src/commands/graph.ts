/**
 * Generate dependency graph visualization from cross-references.
 * Outputs DOT format that can be rendered with Graphviz.
 */

import type { GeneratedPage, GraphPageData } from "@docspec/core";
import { PageType } from "@docspec/core";

export function generateDotGraph(pages: GeneratedPage[]): string {
  const graphPages = pages.filter(p => p.type === PageType.GRAPH);
  const lines: string[] = ["digraph DocSpec {", "  rankdir=LR;", "  node [shape=box, style=filled, fillcolor=lightblue];", ""];

  for (const page of graphPages) {
    const data = page.data as GraphPageData;
    for (const node of data.nodes) {
      const color = node.type === "module" ? "lightblue" : node.type === "member" ? "lightyellow" : "lightgreen";
      lines.push(`  "${node.id}" [label="${node.label}", fillcolor=${color}];`);
    }
    for (const edge of data.edges) {
      const label = edge.label ? ` [label="${edge.label}"]` : "";
      lines.push(`  "${edge.source}" -> "${edge.target}"${label};`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}
