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
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-surface-secondary border-b border-border">
        <h4 className="text-sm font-semibold text-text-primary">Referenced In</h4>
      </div>
      <div className="divide-y divide-border/50">
        {hasFlows && (
          <ReferenceSection title="Flows" icon="" entries={data.flows} />
        )}
        {hasEndpoints && (
          <ReferenceSection title="Endpoints" icon="" entries={data.endpoints} />
        )}
        {hasContexts && (
          <ReferenceSection title="Contexts" icon="" entries={data.contexts} />
        )}
      </div>
    </div>
  );
}

function ReferenceSection({
  title,
  icon,
  entries,
}: {
  title: string;
  icon: string;
  entries: { label: string; url?: string }[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="px-4 py-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center w-full text-xs font-medium text-text-secondary hover:text-text-primary"
      >
        <span className="mr-1.5">{icon}</span>
        {title}
        <span className="ml-1 text-text-tertiary">({entries.length})</span>
        <svg
          className={`ml-auto w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {expanded && (
        <ul className="mt-1 space-y-0.5">
          {entries.map((entry, i) => (
            <li key={i} className="text-sm">
              {entry.url ? (
                <a
                  href={`/${entry.url}`}
                  className="text-primary-600 hover:text-primary-800 hover:underline"
                >
                  {entry.label}
                </a>
              ) : (
                <span className="text-text-secondary">{entry.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
