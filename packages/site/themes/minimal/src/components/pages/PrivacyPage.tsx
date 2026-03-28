import React from "react";
import type { PrivacyPageData, PrivacyField } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface PrivacyPageProps { data: PrivacyPageData; }

export function PrivacyPage({ data }: PrivacyPageProps) {
  const { fields, artifact } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Privacy & PII</h1>
      <p className="text-text-secondary mb-6">{fields.length} PII fields in {artifact.label}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left py-2 pr-3 text-text-tertiary text-xs">Field</th>
            <th className="text-left py-2 pr-3 text-text-tertiary text-xs">Type</th>
            <th className="text-left py-2 text-text-tertiary text-xs">Policies</th>
          </tr></thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field.field} className="border-b border-border">
                <td className="py-2 pr-3 font-mono text-sm">{field.field}</td>
                <td className="py-2 pr-3">{field.piiType ? <Badge variant="warning">{field.piiType}</Badge> : "\u2014"}</td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {field.encrypted && <Badge variant="success">encrypted</Badge>}
                    {field.neverLog && <Badge variant="error">never-log</Badge>}
                    {field.neverReturn && <Badge variant="error">never-return</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
