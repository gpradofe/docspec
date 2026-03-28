import React from "react";
import type { DataStorePageData, DataStore, DataStoreMigration } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface DataStorePageProps {
  data: DataStorePageData;
}

const STORE_TYPE_VARIANTS: Record<string, "primary" | "info" | "success" | "warning"> = {
  relational: "primary",
  document: "info",
  "key-value": "success",
  "message-queue": "warning",
  cache: "success",
  search: "info",
  graph: "primary",
};

export function DataStorePage({ data }: DataStorePageProps) {
  const { dataStores, artifact } = data;

  return (
    <div>
      <Breadcrumb items={[{ label: "Architecture", href: "/architecture" }, { label: artifact.label }, { label: "Data Stores" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Data Stores</h1>
      <p className="text-text-secondary mb-8">Storage backends used by {artifact.label}.</p>

      <div className="space-y-6">
        {dataStores.map((store) => (
          <DataStoreCard key={store.id} store={store} />
        ))}
      </div>
    </div>
  );
}

function DataStoreCard({ store }: { store: DataStore }) {
  const variant = store.type ? STORE_TYPE_VARIANTS[store.type] || "default" : "default";

  return (
    <div className="p-5 rounded-lg border border-border">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-lg font-semibold text-text-primary">{store.name || store.id}</h2>
        {store.type && <Badge variant={variant as any}>{store.type}</Badge>}
        {store.migrationTool && <Badge variant="info">{store.migrationTool}</Badge>}
      </div>
      {store.schemaSource && (
        <p className="text-xs text-text-tertiary mb-4">Schema source: <code className="font-mono">{store.schemaSource}</code></p>
      )}
      {store.tables && store.tables.length > 0 && (
        <section className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Tables ({store.tables.length})</h3>
          <div className="flex flex-wrap gap-2">
            {store.tables.map((table) => (
              <code key={table} className="px-2 py-1 rounded bg-surface-secondary text-sm font-mono text-text-secondary border border-border">{table}</code>
            ))}
          </div>
        </section>
      )}
      {store.keyPatterns && store.keyPatterns.length > 0 && (
        <section className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Key Patterns</h3>
          <div className="space-y-1">
            {store.keyPatterns.map((pattern, i) => (
              <code key={i} className="block px-3 py-1.5 rounded bg-surface-secondary text-sm font-mono text-text-secondary border border-border">
                {pattern.pattern}{pattern.type ? ` (${pattern.type})` : ""}{pattern.ttl ? ` TTL: ${pattern.ttl}` : ""}
              </code>
            ))}
          </div>
        </section>
      )}
      {store.topics && store.topics.length > 0 && (
        <section className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Topics</h3>
          <div className="flex flex-wrap gap-2">
            {store.topics.map((topic) => <Badge key={topic.name} variant="info">{topic.name}</Badge>)}
          </div>
        </section>
      )}
      {store.buckets && store.buckets.length > 0 && (
        <section className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Buckets</h3>
          <div className="flex flex-wrap gap-2">
            {store.buckets.map((bucket) => <Badge key={bucket.name}>{bucket.name}</Badge>)}
          </div>
        </section>
      )}
      {store.migrations && store.migrations.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Migrations ({store.migrations.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Version</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Description</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Date</th>
                  <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Tables</th>
                </tr>
              </thead>
              <tbody>
                {store.migrations.map((migration) => (
                  <MigrationRow key={migration.version} migration={migration} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function MigrationRow({ migration }: { migration: DataStoreMigration }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4 font-mono text-sm text-text-primary">{migration.version}</td>
      <td className="py-2 pr-4 text-text-secondary">{migration.description || "\u2014"}</td>
      <td className="py-2 pr-4 text-text-tertiary text-xs">{migration.date || "\u2014"}</td>
      <td className="py-2">
        {migration.tables && migration.tables.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {migration.tables.map((t) => <code key={t} className="text-xs font-mono text-text-secondary">{t}</code>)}
          </div>
        ) : (
          <span className="text-text-tertiary">{"\u2014"}</span>
        )}
      </td>
    </tr>
  );
}
