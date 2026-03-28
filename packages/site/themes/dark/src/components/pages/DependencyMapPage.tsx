import React from "react";
import type { DependencyMapPageData, ExternalDependency, ExternalDependencyEndpoint } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface DependencyMapPageProps {
  data: DependencyMapPageData;
}

export function DependencyMapPage({ data }: DependencyMapPageProps) {
  const { dependencies, artifact } = data;

  return (
    <div>
      <Breadcrumb items={[{ label: "Architecture", href: "/architecture" }, { label: artifact.label }, { label: "Dependencies" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">External Dependencies</h1>
      <p className="text-text-secondary mb-8">External services and APIs consumed by {artifact.label}.</p>

      <div className="space-y-6">
        {dependencies.map((dep) => <DependencyCard key={dep.name} dependency={dep} />)}
      </div>
    </div>
  );
}

function DependencyCard({ dependency }: { dependency: ExternalDependency }) {
  const endpoints = dependency.endpoints || [];

  return (
    <div className="p-5 rounded-lg border border-border">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-lg font-semibold text-text-primary">{dependency.name}</h2>
        {dependency.auth && <Badge variant="warning">{dependency.auth}</Badge>}
      </div>
      {dependency.baseUrl && <p className="text-sm font-mono text-text-tertiary mb-3">{dependency.baseUrl}</p>}
      <div className="flex flex-wrap gap-4 mb-4">
        {dependency.sla && <div className="text-sm"><span className="text-text-tertiary">SLA: </span><span className="text-text-secondary font-medium">{dependency.sla}</span></div>}
        {dependency.fallback && <div className="text-sm"><span className="text-text-tertiary">Fallback: </span><span className="text-text-secondary font-medium">{dependency.fallback}</span></div>}
        {dependency.rateLimit && (
          <div className="text-sm">
            <span className="text-text-tertiary">Rate limit: </span>
            <span className="text-text-secondary">
              {dependency.rateLimit.requests && <span>{dependency.rateLimit.requests} req</span>}
              {dependency.rateLimit.window && <span>/{dependency.rateLimit.window}</span>}
            </span>
          </div>
        )}
      </div>
      {endpoints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Endpoints ({endpoints.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Method</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Path</th>
                  <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Used By</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, i) => <DependencyEndpointRow key={i} endpoint={ep} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DependencyEndpointRow({ endpoint }: { endpoint: ExternalDependencyEndpoint }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4">{endpoint.method ? <Badge httpMethod={endpoint.method}>{endpoint.method}</Badge> : <span className="text-text-tertiary">{"\u2014"}</span>}</td>
      <td className="py-2 pr-4">{endpoint.path ? <code className="font-mono text-sm text-text-primary">{endpoint.path}</code> : <span className="text-text-tertiary">{"\u2014"}</span>}</td>
      <td className="py-2">
        {endpoint.usedBy && endpoint.usedBy.length > 0 ? (
          <div className="flex flex-wrap gap-1">{endpoint.usedBy.map((u) => <code key={u} className="text-xs font-mono text-text-secondary">{u}</code>)}</div>
        ) : <span className="text-text-tertiary">{"\u2014"}</span>}
      </td>
    </tr>
  );
}
