import React from "react";
import type { TraceEntry } from "@docspec/core";

interface TraceViewProps {
  entries: TraceEntry[];
}

const TYPE_ICONS: Record<string, string> = {
  process: "⚙️",
  ai: "🧠",
  storage: "💾",
  trigger: "⚡",
  retry: "🔄",
  external: "🌐",
  bridge: "🌉",
  observability: "📊",
};

export function TraceView({ entries }: TraceViewProps) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-surface-secondary">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Trace View
        </h4>
      </div>
      <div className="p-4 bg-surface font-mono text-sm">
        {entries.map((entry, i) => {
          const icon = entry.type ? TYPE_ICONS[entry.type] || "\u2192" : "\u2192";
          const indent = "  ".repeat(entry.depth);
          const prefix = i === 0 ? "" : `${indent}\u2192 `;

          return (
            <div key={i} className="leading-relaxed">
              <span className="text-text-tertiary">{prefix}</span>
              <span className="text-text-tertiary">{icon} </span>
              {entry.actorUrl ? (
                <a
                  href={`/${entry.actorUrl}`}
                  className="text-primary-500 hover:text-primary-400 hover:underline"
                >
                  {entry.actor}
                </a>
              ) : (
                <span className="text-text-primary">{entry.actor}</span>
              )}
              {entry.project && (
                <span className="text-text-tertiary"> [{entry.project}]</span>
              )}
              {entry.ai && <span className="ml-1">🧠</span>}
              {entry.description && (
                <span className="text-text-tertiary ml-2">// {entry.description}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
