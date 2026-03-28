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
      <Breadcrumb
        items={[
          { label: "API Reference", href: "/api" },
          { label: artifact.label },
          { label: `${mapping.method} ${mapping.path}` },
        ]}
      />

      <div className="flex items-center gap-3 mb-4">
        <Badge httpMethod={mapping.method} className="text-base px-3 py-1">
          {mapping.method}
        </Badge>
        <code className="text-lg font-mono text-text-primary">{mapping.path}</code>
      </div>

      {method.description && (
        <p className="text-text-secondary mb-6">{method.description}</p>
      )}

      {mapping.description && mapping.description !== method.description && (
        <p className="text-text-secondary mb-6">{mapping.description}</p>
      )}

      <div className="text-xs text-text-tertiary mb-8">
        Implemented by <code className="font-mono">{memberName}.{method.name}()</code>
      </div>

      {method.params && method.params.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="parameters">
            Parameters
          </h2>
          <ParameterTable params={method.params} referenceIndex={referenceIndex} />
        </section>
      )}

      {method.returns && method.returns.type && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="response">
            Response
          </h2>
          <div className="p-4 rounded-lg border border-border bg-surface-secondary">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success">200</Badge>
              <span className="text-sm text-text-secondary">{method.returns.description || "Success"}</span>
            </div>
            <code className="text-sm font-mono text-text-secondary">{method.returns.type}</code>
          </div>
        </section>
      )}

      {method.throws && method.throws.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="errors">
            Errors
          </h2>
          <div className="space-y-2">
            {method.throws.map((t, i) => (
              <div key={i} className="p-3 rounded-lg border border-border">
                <code className="text-sm font-mono text-error">{t.type}</code>
                {t.description && (
                  <p className="text-sm text-text-secondary mt-1">{t.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {method.errorConditions && method.errorConditions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="error-conditions">
            Error Conditions
          </h2>
          <div className="space-y-2">
            {method.errorConditions.map((ec, i) => (
              <div key={i} className="p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-1">
                  {ec.type && <code className="text-sm font-mono text-error">{ec.type}</code>}
                  {ec.code && <Badge variant="error">{ec.code}</Badge>}
                  {ec.mechanism && <Badge>{ec.mechanism}</Badge>}
                </div>
                {ec.description && (
                  <p className="text-sm text-text-secondary">{ec.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {method.performance && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="performance">
            Performance
          </h2>
          <div className="p-4 rounded-lg border border-border bg-surface-secondary">
            <div className="flex flex-wrap gap-6 text-sm">
              {method.performance.expectedLatency && (
                <div>
                  <span className="text-text-tertiary">Expected latency: </span>
                  <span className="text-text-primary font-medium">{method.performance.expectedLatency}</span>
                </div>
              )}
              {method.performance.bottleneck && (
                <div>
                  <span className="text-text-tertiary">Bottleneck: </span>
                  <span className="text-text-primary font-medium">{method.performance.bottleneck}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
