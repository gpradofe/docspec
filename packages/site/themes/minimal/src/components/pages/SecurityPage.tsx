import React from "react";
import type { SecurityPageData, SecurityEndpointRule } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface SecurityPageProps { data: SecurityPageData; }

export function SecurityPage({ data }: SecurityPageProps) {
  const { security, artifact } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Security</h1>
      <p className="text-text-secondary mb-6">Access control for {artifact.label}</p>

      {security.authMechanism && (
        <div className="mb-6 text-sm"><span className="text-text-tertiary">Auth:</span> <Badge variant="primary">{security.authMechanism}</Badge></div>
      )}

      {(security.roles?.length || 0) > 0 && (
        <div className="mb-4"><span className="text-xs text-text-tertiary uppercase font-medium">Roles: </span>{security.roles!.map((r) => <Badge key={r} variant="primary" className="mr-1">{r}</Badge>)}</div>
      )}

      {(security.endpoints?.length || 0) > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Endpoint Rules</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left py-2 pr-3 text-text-tertiary text-xs">Path</th>
                <th className="text-left py-2 pr-3 text-text-tertiary text-xs">Access</th>
                <th className="text-left py-2 text-text-tertiary text-xs">Rules</th>
              </tr></thead>
              <tbody>
                {security.endpoints!.map((rule) => (
                  <tr key={rule.path} className="border-b border-border">
                    <td className="py-2 pr-3 font-mono text-sm">{rule.path}</td>
                    <td className="py-2 pr-3">{rule.public ? <Badge variant="success">public</Badge> : <Badge variant="warning">protected</Badge>}</td>
                    <td className="py-2">{rule.rules?.map((r) => <Badge key={r} className="mr-1">{r}</Badge>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
