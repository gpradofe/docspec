import React from "react";
import type { DependencyMapPageData, ExternalDependency, ExternalDependencyEndpoint } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface DependencyMapPageProps {
  data: DependencyMapPageData;
}

export function DependencyMapPage({ data }: DependencyMapPageProps) {
  const { dependencies, artifact } = data;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: artifact.label },
          { label: "Dependencies" },
        ]}
      />

      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8 }}>External Dependencies</h1>
      <p style={{ color: T.textMuted, marginBottom: 32 }}>
        External services and APIs consumed by {artifact.label}.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {dependencies.map((dep) => (
          <DependencyCard key={dep.name} dependency={dep} />
        ))}
      </div>
    </div>
  );
}

function DependencyCard({ dependency }: { dependency: ExternalDependency }) {
  const endpoints = dependency.endpoints || [];

  return (
    <div style={{ padding: 20, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text }}>{dependency.name}</h2>
        {dependency.auth && <Badge variant="warning">{dependency.auth}</Badge>}
      </div>

      {dependency.baseUrl && (
        <p style={{ fontSize: 14, fontFamily: T.mono, color: T.textDim, marginBottom: 12 }}>{dependency.baseUrl}</p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        {dependency.sla && (
          <div style={{ fontSize: 14 }}>
            <span style={{ color: T.textDim }}>SLA: </span>
            <span style={{ color: T.textMuted, fontWeight: 500 }}>{dependency.sla}</span>
          </div>
        )}
        {dependency.fallback && (
          <div style={{ fontSize: 14 }}>
            <span style={{ color: T.textDim }}>Fallback: </span>
            <span style={{ color: T.textMuted, fontWeight: 500 }}>{dependency.fallback}</span>
          </div>
        )}
        {dependency.rateLimit && (
          <div style={{ fontSize: 14 }}>
            <span style={{ color: T.textDim }}>Rate limit: </span>
            <span style={{ color: T.textMuted }}>
              {dependency.rateLimit.requests && <span>{dependency.rateLimit.requests} req</span>}
              {dependency.rateLimit.window && <span>/{dependency.rateLimit.window}</span>}
            </span>
          </div>
        )}
      </div>

      {/* Endpoints */}
      {endpoints.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            Endpoints ({endpoints.length})
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid " + T.surfaceBorder }}>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Method</th>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Path</th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Used By</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, i) => (
                  <DependencyEndpointRow key={i} endpoint={ep} />
                ))}
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
    <tr style={{ borderBottom: "1px solid " + T.surfaceBorder + "80" }}>
      <td style={{ padding: "8px 16px 8px 0" }}>
        {endpoint.method ? (
          <Badge httpMethod={endpoint.method}>{endpoint.method}</Badge>
        ) : (
          <span style={{ color: T.textDim }}>\u2014</span>
        )}
      </td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        {endpoint.path ? (
          <code style={{ fontFamily: T.mono, fontSize: 14, color: T.text }}>{endpoint.path}</code>
        ) : (
          <span style={{ color: T.textDim }}>\u2014</span>
        )}
      </td>
      <td style={{ padding: "8px 0" }}>
        {endpoint.usedBy && endpoint.usedBy.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {endpoint.usedBy.map((u) => (
              <code key={u} style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted }}>{u}</code>
            ))}
          </div>
        ) : (
          <span style={{ color: T.textDim }}>\u2014</span>
        )}
      </td>
    </tr>
  );
}
