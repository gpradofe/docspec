import React from "react";
import type { DependencyMapPageData, ExternalDependency } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface DependencyMapPageProps { data: DependencyMapPageData; }

export function DependencyMapPage({ data }: DependencyMapPageProps) {
  const { dependencies, artifact } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">External Dependencies</h1>
      <p className="text-text-secondary mb-6">Services consumed by {artifact.label}</p>
      <div className="divide-y divide-border">
        {dependencies.map((dep) => (
          <div key={dep.name} className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-text-primary">{dep.name}</span>
              {dep.auth && <Badge variant="warning">{dep.auth}</Badge>}
            </div>
            {dep.baseUrl && <p className="text-xs font-mono text-text-tertiary">{dep.baseUrl}</p>}
            {dep.endpoints && dep.endpoints.length > 0 && (
              <div className="mt-2 space-y-1">
                {dep.endpoints.map((ep, i) => (
                  <div key={i} className="text-xs">
                    {ep.method && <Badge httpMethod={ep.method} className="mr-1">{ep.method}</Badge>}
                    <code className="font-mono text-text-secondary">{ep.path}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
