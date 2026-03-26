import React from "react";
import type { ConfigurationPageData, ConfigurationProperty } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface ConfigurationPageProps { data: ConfigurationPageData; }

export function ConfigurationPage({ data }: ConfigurationPageProps) {
  const { properties, artifact } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Configuration</h1>
      <p className="text-text-secondary mb-6">{properties.length} properties for {artifact.label}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left py-2 pr-3 text-text-tertiary text-xs">Key</th>
            <th className="text-left py-2 pr-3 text-text-tertiary text-xs">Type</th>
            <th className="text-left py-2 pr-3 text-text-tertiary text-xs">Default</th>
            <th className="text-left py-2 text-text-tertiary text-xs">Description</th>
          </tr></thead>
          <tbody>
            {properties.map((prop) => (
              <tr key={prop.key} className="border-b border-border">
                <td className="py-2 pr-3"><code className="font-mono text-sm">{prop.key}</code></td>
                <td className="py-2 pr-3 text-text-tertiary text-xs font-mono">{prop.type || "\u2014"}</td>
                <td className="py-2 pr-3 text-text-tertiary text-xs font-mono">{prop.default || "\u2014"}</td>
                <td className="py-2 text-text-secondary">{prop.description || "\u2014"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
