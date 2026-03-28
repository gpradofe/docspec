"use client";

import React, { useState } from "react";
import type { ErrorCatalogPageData } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface ErrorCatalogPageProps {
  data: ErrorCatalogPageData;
}

export function ErrorCatalogPage({ data }: ErrorCatalogPageProps) {
  const [filter, setFilter] = useState("");
  const { errors, artifact } = data;

  const filtered = filter
    ? errors.filter(
        (e) =>
          e.code.toLowerCase().includes(filter.toLowerCase()) ||
          e.description?.toLowerCase().includes(filter.toLowerCase())
      )
    : errors;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: "Error Catalog" },
        ]}
      />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Error Catalog</h1>
      <p className="text-text-secondary mb-6">
        All documented errors from {artifact.label}
      </p>

      <input
        type="text"
        placeholder="Filter errors..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-4 py-2 mb-6 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      <div className="space-y-4">
        {filtered.map((error) => (
          <div key={error.code} className="p-4 rounded-lg border border-border" id={`error-${error.code}`}>
            <div className="flex items-center gap-3 mb-2">
              <code className="text-sm font-mono font-bold text-error">{error.code}</code>
              {error.httpStatus && (
                <Badge variant="error">{error.httpStatus}</Badge>
              )}
            </div>

            {error.description && (
              <p className="text-sm text-text-secondary mb-3">{error.description}</p>
            )}

            {error.causes && error.causes.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-text-tertiary uppercase mb-1">Causes</h4>
                <ul className="text-sm text-text-secondary list-disc list-inside">
                  {error.causes.map((cause, i) => <li key={i}>{cause}</li>)}
                </ul>
              </div>
            )}

            {error.resolution && (
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-text-tertiary uppercase mb-1">Resolution</h4>
                <p className="text-sm text-text-secondary">{error.resolution}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-text-tertiary">
              {error.thrownBy && error.thrownBy.length > 0 && (
                <span>Thrown by: {error.thrownBy.join(", ")}</span>
              )}
              {error.endpoints && error.endpoints.length > 0 && (
                <span>Endpoints: {error.endpoints.join(", ")}</span>
              )}
              {error.since && <span>Since: {error.since}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
