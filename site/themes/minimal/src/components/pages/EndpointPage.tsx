import React from "react";
import type { EndpointPageData } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";
import { ParameterTable } from "../ui/ParameterTable.js";

interface EndpointPageProps {
  data: EndpointPageData;
  referenceIndex?: Record<string, string>;
}

export function EndpointPage({ data, referenceIndex }: EndpointPageProps) {
  const { method, memberName, artifact } = data;
  const mapping = method.endpointMapping!;

  return (
    <div>
      <Breadcrumb items={[{ label: "API", href: "/api" }, { label: `${mapping.method} ${mapping.path}` }]} />

      <div className="flex items-center gap-2 mb-4">
        <Badge httpMethod={mapping.method} className="text-sm px-2 py-0.5">{mapping.method}</Badge>
        <code className="text-lg font-mono text-text-primary">{mapping.path}</code>
      </div>

      {method.description && <p className="text-text-secondary mb-6 leading-relaxed">{method.description}</p>}
      <p className="text-xs text-text-tertiary mb-8">Implemented by <code className="font-mono">{memberName}.{method.name}()</code></p>

      {method.params && method.params.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Parameters</h2>
          <ParameterTable params={method.params} referenceIndex={referenceIndex} />
        </section>
      )}

      {method.returns && method.returns.type && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Response</h2>
          <div className="text-sm"><Badge variant="success">200</Badge> <code className="font-mono ml-2">{method.returns.type}</code></div>
        </section>
      )}

      {method.throws && method.throws.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Errors</h2>
          <div className="space-y-2">
            {method.throws.map((t, i) => (
              <div key={i} className="text-sm">
                <code className="font-mono text-error">{t.type}</code>
                {t.description && <span className="text-text-secondary ml-2">&mdash; {t.description}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
