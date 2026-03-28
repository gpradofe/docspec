import React from "react";
import type { DataStorePageData, DataStore } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface DataStorePageProps { data: DataStorePageData; }

export function DataStorePage({ data }: DataStorePageProps) {
  const { dataStores, artifact } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Data Stores</h1>
      <p className="text-text-secondary mb-6">Storage backends for {artifact.label}</p>
      <div className="divide-y divide-border">
        {dataStores.map((store) => (
          <div key={store.id} className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-text-primary">{store.name || store.id}</span>
              {store.type && <Badge variant="info">{store.type}</Badge>}
            </div>
            {store.tables && store.tables.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {store.tables.map((t) => <code key={t} className="text-xs font-mono bg-surface-secondary px-1.5 py-0.5 rounded border border-border">{t}</code>)}
              </div>
            )}
            {store.topics && store.topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {store.topics.map((topic) => <Badge key={topic.name} variant="info">{topic.name}</Badge>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
