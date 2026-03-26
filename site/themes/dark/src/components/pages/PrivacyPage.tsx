import React from "react";
import type { PrivacyPageData, PrivacyField } from "@docspec/core";
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
      <Breadcrumb items={[{ label: "Architecture", href: "/architecture" }, { label: artifact.label }, { label: "Privacy" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Privacy & PII</h1>
      <p className="text-text-secondary mb-4">Personally identifiable information fields and their handling policies for {artifact.label}.</p>

      <div className="flex flex-wrap gap-4 mb-8">
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{fields.length}</div>
          <div className="text-xs text-text-tertiary">PII Fields</div>
        </div>
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{encryptedCount}</div>
          <div className="text-xs text-text-tertiary">Encrypted</div>
        </div>
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{neverLogCount}</div>
          <div className="text-xs text-text-tertiary">Never Logged</div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="pii-fields">PII Fields ({fields.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Field</th>
                <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">PII Type</th>
                <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Retention</th>
                <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">GDPR Basis</th>
                <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Policies</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => <PrivacyFieldRow key={field.field} field={field} />)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PrivacyFieldRow({ field }: { field: PrivacyField }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4"><code className="font-mono text-sm text-text-primary">{field.field}</code></td>
      <td className="py-2 pr-4">{field.piiType ? <Badge variant="warning">{field.piiType}</Badge> : <span className="text-text-tertiary">{"\u2014"}</span>}</td>
      <td className="py-2 pr-4"><span className="text-text-secondary">{field.retention || "\u2014"}</span></td>
      <td className="py-2 pr-4"><span className="text-text-secondary">{field.gdprBasis || "\u2014"}</span></td>
      <td className="py-2">
        <div className="flex flex-wrap gap-1">
          {field.encrypted && <Badge variant="success">encrypted</Badge>}
          {field.neverLog && <Badge variant="error">never-log</Badge>}
          {field.neverReturn && <Badge variant="error">never-return</Badge>}
          {!field.encrypted && !field.neverLog && !field.neverReturn && <span className="text-text-tertiary">{"\u2014"}</span>}
        </div>
      </td>
    </tr>
  );
}
