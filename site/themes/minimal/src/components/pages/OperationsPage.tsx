import React from "react";
import type { OperationsPageData } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface OperationsPageProps { data: OperationsPageData; }

export function OperationsPage({ data }: OperationsPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Operations</h1>
      <p className="text-text-secondary mb-6">Runtime contexts and scheduled jobs</p>
      <div className="divide-y divide-border">
        {data.contexts.map(({ context, artifact }) => (
          <div key={context.id} className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-text-primary text-sm">{context.name || context.id}</span>
              <Badge>{artifact.label}</Badge>
            </div>
            {context.flow && <p className="text-sm text-text-secondary whitespace-pre-line">{context.flow}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
