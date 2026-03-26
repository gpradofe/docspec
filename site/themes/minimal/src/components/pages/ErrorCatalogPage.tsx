"use client";

import React, { useState } from "react";
import type { ErrorCatalogPageData } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface ErrorCatalogPageProps { data: ErrorCatalogPageData; }

export function ErrorCatalogPage({ data }: ErrorCatalogPageProps) {
  const [filter, setFilter] = useState("");
  const { errors, artifact } = data;
  const filtered = filter ? errors.filter((e) => e.code.toLowerCase().includes(filter.toLowerCase()) || e.description?.toLowerCase().includes(filter.toLowerCase())) : errors;

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Error Catalog</h1>
      <p className="text-text-secondary mb-6">Errors from {artifact.label}</p>
      <input type="text" placeholder="Filter errors..." value={filter} onChange={(e) => setFilter(e.target.value)}
        className="w-full px-3 py-2 mb-6 rounded border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary-500" />
      <div className="divide-y divide-border">
        {filtered.map((error) => (
          <div key={error.code} className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <code className="font-mono font-bold text-error text-sm">{error.code}</code>
              {error.httpStatus && <Badge variant="error">{error.httpStatus}</Badge>}
            </div>
            {error.description && <p className="text-sm text-text-secondary">{error.description}</p>}
            {error.resolution && <p className="text-sm text-text-tertiary mt-1">Resolution: {error.resolution}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
