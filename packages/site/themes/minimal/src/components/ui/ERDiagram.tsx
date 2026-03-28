import React from "react";
import type { DataModel } from "@docspec/core";

interface ERDiagramProps {
  models: DataModel[];
  referenceIndex?: Record<string, string>;
}

export function ERDiagram({ models }: ERDiagramProps) {
  if (models.length === 0) return null;

  return (
    <div className="space-y-4 my-4">
      {models.map((model) => (
        <div key={model.qualified} className="border border-border rounded-lg overflow-hidden">
          <div className="bg-primary-500 text-white px-3 py-1.5 text-sm font-semibold">{model.name}</div>
          {model.fields && model.fields.length > 0 && (
            <div className="px-3 py-2 space-y-0.5">
              {model.fields.map((field) => (
                <div key={field.name} className="flex justify-between text-xs font-mono">
                  <span className={field.primaryKey ? "text-primary-500 font-semibold" : "text-text-primary"}>
                    {field.primaryKey ? "PK " : ""}{field.name}
                  </span>
                  <span className="text-text-tertiary">{field.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
