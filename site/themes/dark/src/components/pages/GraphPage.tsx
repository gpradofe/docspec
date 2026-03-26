import React from "react";
import type { GraphPageData } from "@docspec/core";
import { Breadcrumb } from "../layout/Breadcrumb.js";
import { DependencyGraph } from "../ui/DependencyGraph.js";

interface GraphPageProps {
  data: GraphPageData;
}

export function GraphPage({ data }: GraphPageProps) {
  return (
    <div>
      <Breadcrumb items={[{ label: "Architecture", href: "/architecture" }, { label: "Dependency Graph" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Dependency Graph</h1>
      <p className="text-text-secondary mb-6">Cross-references and dependencies between modules and artifacts</p>

      <DependencyGraph nodes={data.nodes} edges={data.edges} />

      {data.nodes.length === 0 && (
        <p className="text-center text-text-tertiary py-12">
          No cross-references found. Add @DocUses annotations to populate this graph.
        </p>
      )}
    </div>
  );
}
