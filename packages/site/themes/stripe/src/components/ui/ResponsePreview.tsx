import React from "react";
import type { JsonShape } from "@docspec/core";

interface ResponsePreviewProps {
  jsonShape: JsonShape;
}

export function ResponsePreview({ jsonShape }: ResponsePreviewProps) {
  if (!jsonShape.fields || jsonShape.fields.length === 0) return null;

  const jsonExample = buildJsonExample(jsonShape);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-surface-secondary">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          JSON Shape
        </h4>
        {jsonShape.description && (
          <p className="text-xs text-text-tertiary mt-0.5">{jsonShape.description}</p>
        )}
      </div>
      <pre className="p-4 bg-gray-950 overflow-x-auto">
        <code className="text-sm font-mono text-gray-200 leading-relaxed">
          {jsonExample}
        </code>
      </pre>
    </div>
  );
}

function buildJsonExample(shape: JsonShape): string {
  if (!shape.fields) return "{}";

  const obj: Record<string, unknown> = {};
  for (const field of shape.fields) {
    if (field.enum && field.enum.length > 0) {
      obj[field.jsonProperty || field.name] = field.enum[0];
    } else {
      obj[field.jsonProperty || field.name] = getExampleValue(field.type);
    }
  }
  return JSON.stringify(obj, null, 2);
}

function getExampleValue(type: string): unknown {
  if (type.includes("String") || type === "string") return "...";
  if (type.includes("int") || type.includes("Integer") || type === "number") return 0;
  if (type.includes("long") || type.includes("Long")) return 0;
  if (type.includes("double") || type.includes("Double") || type.includes("float")) return 0.0;
  if (type.includes("boolean") || type.includes("Boolean")) return false;
  if (type.includes("UUID")) return "00000000-0000-0000-0000-000000000000";
  if (type.startsWith("List<") || type.startsWith("Set<")) return ["..."];
  if (type.startsWith("Map<")) return {};
  return "...";
}
