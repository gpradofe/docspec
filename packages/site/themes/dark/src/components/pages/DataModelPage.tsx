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
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: "Data Models" },
          { label: dataModel.name },
        ]}
      />

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-text-primary">{dataModel.name}</h1>
        {dataModel.discoveredFrom && <Badge variant="info">{dataModel.discoveredFrom}</Badge>}
      </div>

      <p className="text-sm font-mono text-text-tertiary mb-2">{dataModel.qualified}</p>

      {dataModel.description && (
        <p className="text-text-secondary mb-4">{dataModel.description}</p>
      )}

      {dataModel.table && (
        <div className="text-sm text-text-tertiary mb-8">
          Database table: <code className="font-mono bg-surface-tertiary px-1.5 py-0.5 rounded">{dataModel.table}</code>
        </div>
      )}

      {dataModel.fields && dataModel.fields.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="fields">Fields</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 text-text-tertiary font-medium text-xs uppercase">Name</th>
                  <th className="text-left py-2 pr-3 text-text-tertiary font-medium text-xs uppercase">Type</th>
                  <th className="text-left py-2 pr-3 text-text-tertiary font-medium text-xs uppercase">Column</th>
                  <th className="text-left py-2 pr-3 text-text-tertiary font-medium text-xs uppercase">PK</th>
                  <th className="text-left py-2 pr-3 text-text-tertiary font-medium text-xs uppercase">Nullable</th>
                  <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Unique</th>
                </tr>
              </thead>
              <tbody>
                {dataModel.fields.map((field) => (
                  <tr key={field.name} className="border-b border-border/50">
                    <td className="py-2 pr-3">
                      <code className="font-mono text-text-primary">{field.primaryKey ? "🔑 " : ""}{field.name}</code>
                    </td>
                    <td className="py-2 pr-3">
                      <code className="font-mono text-primary-500">{field.type}</code>
                      {field.enumType && <Badge className="ml-1" variant="info">enum</Badge>}
                    </td>
                    <td className="py-2 pr-3 text-text-tertiary font-mono text-xs">{field.column || "\u2014"}</td>
                    <td className="py-2 pr-3">{field.primaryKey ? <Badge variant="primary">PK</Badge> : "\u2014"}</td>
                    <td className="py-2 pr-3">
                      {field.nullable === false ? (
                        <Badge variant="warning">NOT NULL</Badge>
                      ) : field.nullable === true ? (
                        <span className="text-text-tertiary">yes</span>
                      ) : "\u2014"}
                    </td>
                    <td className="py-2">{field.unique ? <Badge variant="info">unique</Badge> : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {dataModel.relationships && dataModel.relationships.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="relationships">Relationships</h2>
          <div className="space-y-2">
            {dataModel.relationships.map((rel, i) => {
              const targetUrl = referenceIndex?.[rel.target];
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <Badge>{rel.type.replace(/_/g, " ")}</Badge>
                  <span className="text-sm text-text-tertiary">&rarr;</span>
                  {targetUrl ? (
                    <a href={`/${targetUrl}`} className="text-sm font-mono text-primary-500 hover:underline">
                      {rel.target}
                    </a>
                  ) : (
                    <code className="text-sm font-mono text-text-secondary">{rel.target}</code>
                  )}
                  {rel.field && <span className="text-xs text-text-tertiary">via {rel.field}</span>}
                  {rel.cascade && <Badge variant="warning">{rel.cascade}</Badge>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {dataModel.jsonShape && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="json-shape">JSON Representation</h2>
          <ResponsePreview jsonShape={dataModel.jsonShape} />
        </section>
      )}

      {dataModel.usedBy && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="used-by">Used By</h2>
          {dataModel.usedBy.endpoints && dataModel.usedBy.endpoints.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-medium text-text-secondary mb-2">Endpoints</h3>
              <div className="flex flex-wrap gap-2">
                {dataModel.usedBy.endpoints.map((ep) => <Badge key={ep}>{ep}</Badge>)}
              </div>
            </div>
          )}
          {dataModel.usedBy.repositories && dataModel.usedBy.repositories.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Repositories</h3>
              <div className="flex flex-wrap gap-2">
                {dataModel.usedBy.repositories.map((repo) => <Badge key={repo}>{repo}</Badge>)}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
