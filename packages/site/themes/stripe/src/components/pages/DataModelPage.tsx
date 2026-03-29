import React from "react";
import type { DataModelPageData } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";
import { ResponsePreview } from "../ui/ResponsePreview.js";

interface DataModelPageProps {
  data: DataModelPageData;
  referenceIndex?: Record<string, string>;
}

export function DataModelPage({ data, referenceIndex }: DataModelPageProps) {
  const { dataModel, artifact } = data;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: "Data Models" },
          { label: dataModel.name },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{dataModel.name}</h1>
        {dataModel.discoveredFrom && <Badge variant="info">{dataModel.discoveredFrom}</Badge>}
      </div>

      <p style={{ fontSize: 14, fontFamily: T.mono, color: T.textDim, marginBottom: 8 }}>{dataModel.qualified}</p>

      {dataModel.description && (
        <p style={{ color: T.textMuted, marginBottom: 16 }}>{dataModel.description}</p>
      )}

      {dataModel.table && (
        <div style={{ fontSize: 14, color: T.textDim, marginBottom: 32 }}>
          Database table: <code style={{ fontFamily: T.mono, background: T.surface, padding: "2px 6px", borderRadius: 4 }}>{dataModel.table}</code>
        </div>
      )}

      {/* Fields */}
      {dataModel.fields && dataModel.fields.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="fields">
            Fields
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid " + T.surfaceBorder }}>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Column</th>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>PK</th>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Nullable</th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Unique</th>
                </tr>
              </thead>
              <tbody>
                {dataModel.fields.map((field) => (
                  <tr key={field.name} style={{ borderBottom: "1px solid " + T.surfaceBorder + "80" }}>
                    <td style={{ padding: "8px 12px 8px 0" }}>
                      <code style={{ fontFamily: T.mono, color: T.text }}>{field.primaryKey ? "PK " : ""}{field.name}</code>
                    </td>
                    <td style={{ padding: "8px 12px 8px 0" }}>
                      <code style={{ fontFamily: T.mono, color: T.accent }}>{field.type}</code>
                      {field.enumType && <Badge variant="info">enum</Badge>}
                    </td>
                    <td style={{ padding: "8px 12px 8px 0", color: T.textDim, fontFamily: T.mono, fontSize: 12 }}>
                      {field.column || "\u2014"}
                    </td>
                    <td style={{ padding: "8px 12px 8px 0" }}>
                      {field.primaryKey ? <Badge variant="primary">PK</Badge> : "\u2014"}
                    </td>
                    <td style={{ padding: "8px 12px 8px 0" }}>
                      {field.nullable === false ? (
                        <Badge variant="warning">NOT NULL</Badge>
                      ) : field.nullable === true ? (
                        <span style={{ color: T.textDim }}>yes</span>
                      ) : "\u2014"}
                    </td>
                    <td style={{ padding: "8px 0" }}>
                      {field.unique ? <Badge variant="info">unique</Badge> : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Relationships */}
      {dataModel.relationships && dataModel.relationships.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="relationships">
            Relationships
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dataModel.relationships.map((rel, i) => {
              const targetUrl = referenceIndex?.[rel.target];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
                  <Badge>{rel.type.replace(/_/g, " ")}</Badge>
                  <span style={{ fontSize: 14, color: T.textDim }}>\u2192</span>
                  {targetUrl ? (
                    <a href={`/${targetUrl}`} style={{ fontSize: 14, fontFamily: T.mono, color: T.accent, textDecoration: "none" }}>
                      {rel.target}
                    </a>
                  ) : (
                    <code style={{ fontSize: 14, fontFamily: T.mono, color: T.textMuted }}>{rel.target}</code>
                  )}
                  {rel.field && (
                    <span style={{ fontSize: 12, color: T.textDim }}>via {rel.field}</span>
                  )}
                  {rel.cascade && (
                    <Badge variant="warning">{rel.cascade}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* JSON Shape */}
      {dataModel.jsonShape && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="json-shape">
            JSON Representation
          </h2>
          <ResponsePreview jsonShape={dataModel.jsonShape} />
        </section>
      )}

      {/* Used By */}
      {dataModel.usedBy && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="used-by">
            Used By
          </h2>
          {dataModel.usedBy.endpoints && dataModel.usedBy.endpoints.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 500, color: T.textMuted, marginBottom: 8 }}>Endpoints</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {dataModel.usedBy.endpoints.map((ep) => (
                  <Badge key={ep}>{ep}</Badge>
                ))}
              </div>
            </div>
          )}
          {dataModel.usedBy.repositories && dataModel.usedBy.repositories.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 500, color: T.textMuted, marginBottom: 8 }}>Repositories</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {dataModel.usedBy.repositories.map((repo) => (
                  <Badge key={repo}>{repo}</Badge>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
