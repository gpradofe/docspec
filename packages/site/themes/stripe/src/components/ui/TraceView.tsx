import React from "react";
import type { TraceEntry } from "@docspec/core";

interface TraceViewProps {
  entries: TraceEntry[];
}

const TYPE_ICONS: Record<string, string> = {
  process: "PROC",
  ai: "AI",
  storage: "DB",
  trigger: "TRIG",
  retry: "RETRY",
  external: "EXT",
  bridge: "BRIDGE",
  observability: "OBS",
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
      <div className="p-4 bg-gray-950 font-mono text-sm">
        {entries.map((entry, i) => {
          const icon = entry.type ? TYPE_ICONS[entry.type] || "→" : "→";
          const indent = "  ".repeat(entry.depth);
          const prefix = i === 0 ? "" : `${indent}→ `;

          return (
            <div key={i} className="leading-relaxed">
              <span className="text-gray-500">{prefix}</span>
              <span className="text-gray-400">{icon} </span>
              {entry.actorUrl ? (
                <a
                  href={`/${entry.actorUrl}`}
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {entry.actor}
                </a>
              ) : (
                <span className="text-gray-200">{entry.actor}</span>
              )}
              {entry.project && (
                <span className="text-gray-600"> [{entry.project}]</span>
              )}
              {entry.ai && <span className="ml-1">[AI]</span>}
              {entry.description && (
                <span className="text-gray-500 ml-2">// {entry.description}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
