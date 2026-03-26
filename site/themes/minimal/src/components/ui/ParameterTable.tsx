import React from "react";
import type { MethodParam } from "@docspec/core";
import { TypeLink } from "./TypeLink.js";

interface ParameterTableProps {
  params: MethodParam[];
  referenceIndex?: Record<string, string>;
}

export function ParameterTable({ params, referenceIndex }: ParameterTableProps) {
  if (params.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs">Name</th>
            <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs">Type</th>
            <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs">Required</th>
            <th className="text-left py-2 text-text-tertiary font-medium text-xs">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((param) => (
            <tr key={param.name} className="border-b border-border">
              <td className="py-2 pr-4"><code className="text-sm font-mono">{param.name}</code></td>
              <td className="py-2 pr-4"><TypeLink type={param.type} referenceIndex={referenceIndex} /></td>
              <td className="py-2 pr-4">
                {param.required !== false ? (
                  <span className="text-xs text-warning font-medium">required</span>
                ) : (
                  <span className="text-xs text-text-tertiary">optional</span>
                )}
              </td>
              <td className="py-2 text-text-secondary">{param.description || "\u2014"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
