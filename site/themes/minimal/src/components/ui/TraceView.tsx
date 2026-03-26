import React from "react";
import type { TraceEntry } from "@docspec/core";

interface TraceViewProps {
  entries: TraceEntry[];
}

export function TraceView({ entries }: TraceViewProps) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden my-4">
      <pre className="p-4 bg-surface-secondary font-mono text-sm">
        {entries.map((entry, i) => {
          const indent = "  ".repeat(entry.depth);
          const prefix = i === 0 ? "" : `${indent}\u2192 `;
          return (
            <div key={i} className="leading-relaxed">
              <span className="text-text-tertiary">{prefix}</span>
              {entry.actorUrl ? (
                <a href={`/${entry.actorUrl}`} className="text-primary-500 hover:underline">{entry.actor}</a>
              ) : (
                <span className="text-text-primary">{entry.actor}</span>
              )}
              {entry.description && <span className="text-text-tertiary ml-2">// {entry.description}</span>}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
