"use client";

import React, { useState } from "react";
import type { ReferencedInData } from "@docspec/core";

interface ReferencedInPanelProps {
  data: ReferencedInData;
}

export function ReferencedInPanel({ data }: ReferencedInPanelProps) {
  const hasFlows = data.flows.length > 0;
  const hasEndpoints = data.endpoints.length > 0;
  const hasContexts = data.contexts.length > 0;

  if (!hasFlows && !hasEndpoints && !hasContexts) return null;

  return (
    <div className="border-t border-border pt-6 mt-8">
      <h4 className="text-sm font-semibold text-text-primary mb-3">Referenced In</h4>
      <div className="space-y-3">
        {hasFlows && <ReferenceSection title="Flows" entries={data.flows} />}
        {hasEndpoints && <ReferenceSection title="Endpoints" entries={data.endpoints} />}
        {hasContexts && <ReferenceSection title="Contexts" entries={data.contexts} />}
      </div>
    </div>
  );
}

function ReferenceSection({
  title,
  entries,
}: {
  title: string;
  entries: { label: string; url?: string }[];
}) {
  return (
    <div>
      <h5 className="text-xs font-medium text-text-tertiary uppercase mb-1">{title}</h5>
      <ul className="space-y-0.5">
        {entries.map((entry, i) => (
          <li key={i} className="text-sm">
            {entry.url ? (
              <a href={`/${entry.url}`} className="text-primary-500 hover:underline">{entry.label}</a>
            ) : (
              <span className="text-text-secondary">{entry.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
