import React from "react";
import type { OperationsPageData } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface OperationsPageProps {
  data: OperationsPageData;
}

export function OperationsPage({ data }: OperationsPageProps) {
  const { contexts } = data;

  return (
    <div>
      <Breadcrumb items={[{ label: "Architecture", href: "/architecture" }, { label: "Operations" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Operations</h1>
      <p className="text-text-secondary mb-6">Runtime contexts, scheduled jobs, and system-level operations</p>

      <div className="space-y-4">
        {contexts.map(({ context, artifact }) => (
          <div key={context.id} className="p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-sm font-bold text-text-primary">{context.name || context.id}</h3>
              <Badge>{artifact.label}</Badge>
            </div>
            {context.attachedTo && (
              <div className="text-xs text-text-tertiary mb-2">
                Attached to: <code className="font-mono">{context.attachedTo}</code>
              </div>
            )}
            {context.flow && (
              <div className="mb-3 p-3 rounded bg-surface-secondary text-sm text-text-secondary whitespace-pre-line">{context.flow}</div>
            )}
            {context.inputs && context.inputs.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-text-tertiary uppercase mb-1">Inputs</h4>
                <div className="space-y-1">
                  {context.inputs.map((input) => (
                    <div key={input.name} className="text-sm">
                      <span className="font-medium text-text-primary">{input.name}</span>
                      {input.source && <span className="text-text-tertiary"> from {input.source}</span>}
                      {input.items && input.items.length > 0 && <span className="text-text-tertiary"> [{input.items.join(", ")}]</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {context.uses && context.uses.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-text-tertiary uppercase mb-1">Uses</h4>
                <div className="space-y-1">
                  {context.uses.map((use, i) => (
                    <div key={i} className="text-sm">
                      <code className="font-mono text-primary-500">{use.artifact}</code>
                      <span className="text-text-tertiary"> &mdash; </span>
                      <span className="text-text-secondary">{use.what}</span>
                      {use.why && <span className="text-text-tertiary"> ({use.why})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
