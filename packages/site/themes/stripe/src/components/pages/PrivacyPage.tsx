import React from "react";
import type { PrivacyPageData, PrivacyField } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface PrivacyPageProps {
  data: PrivacyPageData;
}

export function PrivacyPage({ data }: PrivacyPageProps) {
  const { fields, artifact } = data;
  const encryptedCount = fields.filter((f) => f.encrypted).length;
  const neverLogCount = fields.filter((f) => f.neverLog).length;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: artifact.label },
          { label: "Privacy" },
        ]}
      />

      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8 }}>Privacy & PII</h1>
      <p style={{ color: T.textMuted, marginBottom: 16 }}>
        Personally identifiable information fields and their handling policies for {artifact.label}.
      </p>

      {/* Summary stats */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
        <div style={{ padding: "12px 16px", borderRadius: 8, background: T.surface, border: "1px solid " + T.surfaceBorder }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{fields.length}</div>
          <div style={{ fontSize: 12, color: T.textDim }}>PII Fields</div>
        </div>
        <div style={{ padding: "12px 16px", borderRadius: 8, background: T.surface, border: "1px solid " + T.surfaceBorder }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{encryptedCount}</div>
          <div style={{ fontSize: 12, color: T.textDim }}>Encrypted</div>
        </div>
        <div style={{ padding: "12px 16px", borderRadius: 8, background: T.surface, border: "1px solid " + T.surfaceBorder }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{neverLogCount}</div>
          <div style={{ fontSize: 12, color: T.textDim }}>Never Logged</div>
        </div>
      </div>

      {/* PII Fields Table */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="pii-fields">
          PII Fields ({fields.length})
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid " + T.surfaceBorder }}>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Field</th>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>PII Type</th>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Retention</th>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>GDPR Basis</th>
                <th style={{ textAlign: "left", padding: "8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Policies</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <PrivacyFieldRow key={field.field} field={field} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PrivacyFieldRow({ field }: { field: PrivacyField }) {
  return (
    <tr style={{ borderBottom: "1px solid " + T.surfaceBorder + "80" }}>
      <td style={{ padding: "8px 16px 8px 0" }}>
        <code style={{ fontFamily: T.mono, fontSize: 14, color: T.text }}>{field.field}</code>
      </td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        {field.piiType ? (
          <Badge variant="warning">{field.piiType}</Badge>
        ) : (
          <span style={{ color: T.textDim }}>\u2014</span>
        )}
      </td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        <span style={{ color: T.textMuted }}>{field.retention || "\u2014"}</span>
      </td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        <span style={{ color: T.textMuted }}>{field.gdprBasis || "\u2014"}</span>
      </td>
      <td style={{ padding: "8px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {field.encrypted && <Badge variant="success">encrypted</Badge>}
          {field.neverLog && <Badge variant="error">never-log</Badge>}
          {field.neverReturn && <Badge variant="error">never-return</Badge>}
          {!field.encrypted && !field.neverLog && !field.neverReturn && (
            <span style={{ color: T.textDim }}>\u2014</span>
          )}
        </div>
      </td>
    </tr>
  );
}
