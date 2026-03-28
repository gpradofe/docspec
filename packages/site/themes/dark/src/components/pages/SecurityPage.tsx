import React from "react";
import type { SecurityPageData, SecurityEndpointRule } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface SecurityPageProps {
  data: SecurityPageData;
}

export function SecurityPage({ data }: SecurityPageProps) {
  const { security, artifact } = data;
  const endpoints = security.endpoints || [];
  const roles = security.roles || [];
  const scopes = security.scopes || [];

  return (
    <div>
      <Breadcrumb items={[{ label: "Architecture", href: "/architecture" }, { label: artifact.label }, { label: "Security" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Security</h1>
      <p className="text-text-secondary mb-8">Authentication, authorization, and access control for {artifact.label}.</p>

      {security.authMechanism && (
        <section className="mb-8">
          <div className="p-5 rounded-lg border border-border bg-surface-secondary">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-text-primary">Authentication</h2>
              <Badge variant="primary">{security.authMechanism}</Badge>
            </div>
            <p className="text-sm text-text-secondary">
              This service uses <span className="font-medium">{security.authMechanism}</span> as its primary authentication mechanism.
            </p>
          </div>
        </section>
      )}

      {(roles.length > 0 || scopes.length > 0) && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="roles-scopes">Roles & Scopes</h2>
          <div className="p-4 rounded-lg border border-border">
            {roles.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium text-text-tertiary mb-2 uppercase text-xs">Roles</h3>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => <Badge key={role} variant="primary">{role}</Badge>)}
                </div>
              </div>
            )}
            {scopes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text-tertiary mb-2 uppercase text-xs">Scopes</h3>
                <div className="flex flex-wrap gap-2">
                  {scopes.map((scope) => <Badge key={scope} variant="info">{scope}</Badge>)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {endpoints.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="endpoint-rules">Endpoint Rules ({endpoints.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Path</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Rules</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Access</th>
                  <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Rate Limit</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((rule) => <EndpointRuleRow key={rule.path} rule={rule} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function EndpointRuleRow({ rule }: { rule: SecurityEndpointRule }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4"><code className="font-mono text-sm text-text-primary">{rule.path}</code></td>
      <td className="py-2 pr-4">
        {rule.rules && rule.rules.length > 0 ? (
          <div className="flex flex-wrap gap-1">{rule.rules.map((r) => <Badge key={r}>{r}</Badge>)}</div>
        ) : <span className="text-text-tertiary">{"\u2014"}</span>}
      </td>
      <td className="py-2 pr-4">
        {rule.public ? <Badge variant="success">public</Badge> : <Badge variant="warning">protected</Badge>}
      </td>
      <td className="py-2">
        {rule.rateLimit ? (
          <span className="text-xs text-text-secondary">
            {rule.rateLimit.requests && <span>{rule.rateLimit.requests} req</span>}
            {rule.rateLimit.window && <span>/{rule.rateLimit.window}</span>}
          </span>
        ) : <span className="text-text-tertiary">{"\u2014"}</span>}
      </td>
    </tr>
  );
}
