import React from "react";
import type { DataModelPageData } from "@docspec/core";
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
      <Breadcrumb items={[{ label: "Data Models" }, { label: dataModel.name }]} />
      <h1 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">{dataModel.name}</h1>
      <p className="text-sm font-mono text-text-tertiary mb-4">{dataModel.qualified}</p>
      {dataModel.description && <p className="text-text-secondary mb-6 leading-relaxed">{dataModel.description}</p>}

      {dataModel.fields && dataModel.fields.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Fields</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left py-2 pr-3 text-text-tertiary text-xs">Name</th>
                <th className="text-left py-2 pr-3 text-text-tertiary text-xs">Type</th>
                <th className="text-left py-2 text-text-tertiary text-xs">Info</th>
              </tr></thead>
              <tbody>
                {dataModel.fields.map((field) => (
                  <tr key={field.name} className="border-b border-border">
                    <td className="py-2 pr-3 font-mono text-sm">{field.primaryKey ? "PK " : ""}{field.name}</td>
                    <td className="py-2 pr-3 font-mono text-sm text-primary-500">{field.type}</td>
                    <td className="py-2 text-text-tertiary text-xs">
                      {field.nullable === false && "NOT NULL "}
                      {field.unique && "UNIQUE "}
                      {field.column && `col: ${field.column}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {dataModel.relationships && dataModel.relationships.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Relationships</h2>
          <div className="space-y-1">
            {dataModel.relationships.map((rel, i) => (
              <div key={i} className="text-sm">
                <Badge>{rel.type.replace(/_/g, " ")}</Badge>
                <span className="text-text-tertiary mx-1">&rarr;</span>
                <code className="font-mono text-text-secondary">{rel.target}</code>
              </div>
            ))}
          </div>
        </section>
      )}

      {dataModel.jsonShape && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">JSON Shape</h2>
          <ResponsePreview jsonShape={dataModel.jsonShape} />
        </section>
      )}
    </div>
  );
}
