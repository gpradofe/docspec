import React from "react";
import type { OperationsPageData } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface OperationsPageProps {
  data: OperationsPageData;
}

export function OperationsPage({ data }: OperationsPageProps) {
  const { contexts } = data;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: "Operations" },
        ]}
      />

      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8 }}>Operations</h1>
      <p style={{ color: T.textMuted, marginBottom: 24 }}>
        Runtime contexts, scheduled jobs, and system-level operations
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {contexts.map(({ context, artifact }) => (
          <div key={context.id} style={{ padding: 16, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{context.name || context.id}</h3>
              <Badge>{artifact.label}</Badge>
            </div>

            {context.attachedTo && (
              <div style={{ fontSize: 12, color: T.textDim, marginBottom: 8 }}>
                Attached to: <code style={{ fontFamily: T.mono }}>{context.attachedTo}</code>
              </div>
            )}

            {context.flow && (
              <div style={{ marginBottom: 12, padding: 12, borderRadius: 4, background: T.surface, fontSize: 14, color: T.textMuted, whiteSpace: "pre-line" }}>
                {context.flow}
              </div>
            )}

            {context.inputs && context.inputs.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: T.textDim, textTransform: "uppercase", marginBottom: 4 }}>Inputs</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {context.inputs.map((input) => (
                    <div key={input.name} style={{ fontSize: 14 }}>
                      <span style={{ fontWeight: 500, color: T.text }}>{input.name}</span>
                      {input.source && (
                        <span style={{ color: T.textDim }}> from {input.source}</span>
                      )}
                      {input.items && input.items.length > 0 && (
                        <span style={{ color: T.textDim }}> [{input.items.join(", ")}]</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {context.uses && context.uses.length > 0 && (
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: T.textDim, textTransform: "uppercase", marginBottom: 4 }}>Uses</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {context.uses.map((use, i) => (
                    <div key={i} style={{ fontSize: 14 }}>
                      <code style={{ fontFamily: T.mono, color: T.accent }}>{use.artifact}</code>
                      <span style={{ color: T.textDim }}> \u2014 </span>
                      <span style={{ color: T.textMuted }}>{use.what}</span>
                      {use.why && (
                        <span style={{ color: T.textDim }}> ({use.why})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
