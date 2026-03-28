import React from "react";
import type { FlowStep } from "@docspec/core";

interface FlowDiagramProps {
  steps: FlowStep[];
  referenceIndex?: Record<string, string>;
}

export function FlowDiagram({ steps, referenceIndex }: FlowDiagramProps) {
  if (steps.length === 0) return null;

  return (
    <div className="space-y-2 my-4">
      {steps.map((step, i) => {
        const url = step.actorQualified && referenceIndex?.[step.actorQualified];
        return (
          <div key={step.id} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-surface-tertiary text-text-secondary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">
                {step.name || step.id}
              </div>
              {step.actor && (
                <div className="text-xs text-text-tertiary">
                  {url ? (
                    <a href={`/${url}`} className="text-primary-500 hover:underline">{step.actor}</a>
                  ) : step.actor}
                </div>
              )}
              {step.description && (
                <div className="text-sm text-text-secondary mt-0.5">{step.description}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
