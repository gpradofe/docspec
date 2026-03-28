import React from "react";
import type { ObservabilityPageData, ObservabilityMetric, ObservabilityTrace, ObservabilityHealthCheck } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface ObservabilityPageProps {
  data: ObservabilityPageData;
}

const METRIC_TYPE_VARIANTS: Record<string, "primary" | "info" | "success" | "warning"> = {
  counter: "primary",
  gauge: "info",
  timer: "success",
  histogram: "warning",
  summary: "info",
};

export function ObservabilityPage({ data }: ObservabilityPageProps) {
  const { observability, artifact } = data;
  const metrics = observability.metrics || [];
  const healthChecks = observability.healthChecks || [];
  const traces = observability.traces || [];

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: artifact.label },
          { label: "Observability" },
        ]}
      />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Observability</h1>
      <p className="text-text-secondary mb-2">
        Metrics, health checks, and trace instrumentation for {artifact.label}.
      </p>
      <p className="text-xs text-text-tertiary mb-8">
        {metrics.length} metric{metrics.length !== 1 ? "s" : ""} &middot;{" "}
        {healthChecks.length} health check{healthChecks.length !== 1 ? "s" : ""} &middot;{" "}
        {traces.length} trace span{traces.length !== 1 ? "s" : ""}
      </p>

      {/* Metrics Table */}
      {metrics.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="metrics">
            Metrics ({metrics.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Name</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Type</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Labels</th>
                  <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Emitted By</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <MetricRow key={metric.name} metric={metric} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Health Checks */}
      {healthChecks.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="health-checks">
            Health Checks ({healthChecks.length})
          </h2>
          <div className="space-y-3">
            {healthChecks.map((check, i) => (
              <HealthCheckCard key={check.path || i} check={check} />
            ))}
          </div>
        </section>
      )}

      {/* Traces */}
      {traces.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4" id="traces">
            Trace Spans ({traces.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Span Name</th>
                  <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Service</th>
                  <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Parent Span</th>
                </tr>
              </thead>
              <tbody>
                {traces.map((trace) => (
                  <TraceRow key={trace.spanName} trace={trace} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Empty state */}
      {metrics.length === 0 && healthChecks.length === 0 && traces.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary">
            No observability instrumentation detected. Add Micrometer, OpenTelemetry, or health check annotations to populate this page.
          </p>
        </div>
      )}
    </div>
  );
}

function MetricRow({ metric }: { metric: ObservabilityMetric }) {
  const variant = METRIC_TYPE_VARIANTS[metric.type] || "default";

  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4">
        <code className="font-mono text-sm text-text-primary">{metric.name}</code>
      </td>
      <td className="py-2 pr-4">
        <Badge variant={variant}>{metric.type}</Badge>
      </td>
      <td className="py-2 pr-4">
        {metric.labels && metric.labels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {metric.labels.map((label) => (
              <code
                key={label}
                className="px-1.5 py-0.5 rounded bg-surface-secondary text-xs font-mono text-text-secondary border border-border"
              >
                {label}
              </code>
            ))}
          </div>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="py-2">
        {metric.emittedBy && metric.emittedBy.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {metric.emittedBy.map((emitter) => (
              <code
                key={emitter}
                className="text-xs font-mono text-text-secondary"
              >
                {emitter}
              </code>
            ))}
          </div>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
    </tr>
  );
}

function HealthCheckCard({ check }: { check: ObservabilityHealthCheck }) {
  return (
    <div className="p-4 rounded-lg border border-border">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
        {check.path ? (
          <code className="text-sm font-mono font-semibold text-text-primary">{check.path}</code>
        ) : (
          <span className="text-sm font-semibold text-text-primary">Health Check</span>
        )}
        <Badge variant="success">active</Badge>
      </div>

      {check.checks && check.checks.length > 0 && (
        <div className="ml-5">
          <h4 className="text-xs font-medium text-text-tertiary uppercase mb-2">Checks</h4>
          <div className="flex flex-wrap gap-2">
            {check.checks.map((c) => (
              <Badge key={c}>{c}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TraceRow({ trace }: { trace: ObservabilityTrace }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4">
        <code className="font-mono text-sm text-text-primary">{trace.spanName}</code>
      </td>
      <td className="py-2 pr-4">
        {trace.service ? (
          <span className="text-sm text-text-secondary">{trace.service}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="py-2">
        {trace.parentSpan ? (
          <code className="text-xs font-mono text-text-secondary">{trace.parentSpan}</code>
        ) : (
          <Badge variant="primary">root</Badge>
        )}
      </td>
    </tr>
  );
}
