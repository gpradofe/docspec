import React from "react";
import type { ConfigurationPageData, ConfigurationProperty } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface ConfigurationPageProps {
  data: ConfigurationPageData;
}

export function ConfigurationPage({ data }: ConfigurationPageProps) {
  const { properties, artifact } = data;

  // Group properties by source
  const grouped = new Map<string, ConfigurationProperty[]>();
  for (const prop of properties) {
    const source = prop.source || "Other";
    if (!grouped.has(source)) {
      grouped.set(source, []);
    }
    grouped.get(source)!.push(prop);
  }

  const groups = Array.from(grouped.entries());

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: artifact.label },
          { label: "Configuration" },
        ]}
      />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Configuration</h1>
      <p className="text-text-secondary mb-2">
        Configuration properties for {artifact.label}.
      </p>
      <p className="text-xs text-text-tertiary mb-8">
        {properties.length} propert{properties.length === 1 ? "y" : "ies"} across {groups.length} source{groups.length !== 1 ? "s" : ""}
      </p>

      {groups.map(([source, props]) => (
        <section key={source} className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-text-primary" id={`source-${slugify(source)}`}>
              {source}
            </h2>
            <Badge variant="info">{props.length}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Key</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Type</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Default</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Environment</th>
                  <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Description</th>
                </tr>
              </thead>
              <tbody>
                {props.map((prop) => (
                  <PropertyRow key={prop.key} property={prop} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function PropertyRow({ property }: { property: ConfigurationProperty }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4">
        <code className="font-mono text-sm text-text-primary">{property.key}</code>
      </td>
      <td className="py-2 pr-4">
        {property.type ? (
          <code className="font-mono text-xs text-text-secondary">{property.type}</code>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="py-2 pr-4">
        {property.default ? (
          <code className="font-mono text-xs text-text-secondary">{property.default}</code>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="py-2 pr-4">
        {property.environment ? (
          <Badge variant="primary">{property.environment}</Badge>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="py-2">
        <div>
          <span className="text-text-secondary">{property.description || "—"}</span>
          {property.validRange && (
            <div className="mt-1 text-xs text-text-tertiary">
              {property.validRange.min !== undefined && property.validRange.max !== undefined && (
                <span>Range: {property.validRange.min}–{property.validRange.max}</span>
              )}
            </div>
          )}
          {property.affectsFlow && (
            <div className="mt-1 text-xs text-text-tertiary">
              Affects flow: <span className="font-medium">{Array.isArray(property.affectsFlow) ? property.affectsFlow.join(", ") : property.affectsFlow}</span>
            </div>
          )}
          {property.usedBy && property.usedBy.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {property.usedBy.map((u) => (
                <Badge key={u}>{u}</Badge>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
