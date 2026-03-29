import React from "react";
import type { ObservabilityPageData, ObservabilityMetric, ObservabilityTrace, ObservabilityHealthCheck } from "@docspec/core";
import { T } from "../../lib/tokens.js";
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

      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8 }}>Observability</h1>
      <p style={{ color: T.textMuted, marginBottom: 8 }}>
        Metrics, health checks, and trace instrumentation for {artifact.label}.
      </p>
      <p style={{ fontSize: 12, color: T.textDim, marginBottom: 32 }}>
        {metrics.length} metric{metrics.length !== 1 ? "s" : ""} &middot;{" "}
        {healthChecks.length} health check{healthChecks.length !== 1 ? "s" : ""} &middot;{" "}
        {traces.length} trace span{traces.length !== 1 ? "s" : ""}
      </p>

      {/* Metrics Table */}
      {metrics.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="metrics">
            Metrics ({metrics.length})
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid " + T.surfaceBorder }}>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Labels</th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Emitted By</th>
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
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="health-checks">
            Health Checks ({healthChecks.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {healthChecks.map((check, i) => (
              <HealthCheckCard key={check.path || i} check={check} />
            ))}
          </div>
        </section>
      )}

      {/* Traces */}
      {traces.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="traces">
            Trace Spans ({traces.length})
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid " + T.surfaceBorder }}>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Span Name</th>
                  <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Service</th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Parent Span</th>
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
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ color: T.textMuted }}>
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
    <tr style={{ borderBottom: "1px solid " + T.surfaceBorder + "80" }}>
      <td style={{ padding: "8px 16px 8px 0" }}>
        <code style={{ fontFamily: T.mono, fontSize: 14, color: T.text }}>{metric.name}</code>
      </td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        <Badge variant={variant}>{metric.type}</Badge>
      </td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        {metric.labels && metric.labels.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {metric.labels.map((label) => (
              <code
                key={label}
                style={{ padding: "2px 6px", borderRadius: 4, background: T.surface, fontSize: 12, fontFamily: T.mono, color: T.textMuted, border: "1px solid " + T.surfaceBorder }}
              >
                {label}
              </code>
            ))}
          </div>
        ) : (
          <span style={{ color: T.textDim }}>\u2014</span>
        )}
      </td>
      <td style={{ padding: "8px 0" }}>
        {metric.emittedBy && metric.emittedBy.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {metric.emittedBy.map((emitter) => (
              <code
                key={emitter}
                style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted }}
              >
                {emitter}
              </code>
            ))}
          </div>
        ) : (
          <span style={{ color: T.textDim }}>\u2014</span>
        )}
      </td>
    </tr>
  );
}

function HealthCheckCard({ check }: { check: ObservabilityHealthCheck }) {
  return (
    <div style={{ padding: 16, borderRadius: 8, border: "1px solid " + T.surfaceBorder }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.green, flexShrink: 0 }} />
        {check.path ? (
          <code style={{ fontSize: 14, fontFamily: T.mono, fontWeight: 600, color: T.text }}>{check.path}</code>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Health Check</span>
        )}
        <Badge variant="success">active</Badge>
      </div>

      {check.checks && check.checks.length > 0 && (
        <div style={{ marginLeft: 20 }}>
          <h4 style={{ fontSize: 12, fontWeight: 500, color: T.textDim, textTransform: "uppercase", marginBottom: 8 }}>Checks</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
    <tr style={{ borderBottom: "1px solid " + T.surfaceBorder + "80" }}>
      <td style={{ padding: "8px 16px 8px 0" }}>
        <code style={{ fontFamily: T.mono, fontSize: 14, color: T.text }}>{trace.spanName}</code>
      </td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        {trace.service ? (
          <span style={{ fontSize: 14, color: T.textMuted }}>{trace.service}</span>
        ) : (
          <span style={{ color: T.textDim }}>\u2014</span>
        )}
      </td>
      <td style={{ padding: "8px 0" }}>
        {trace.parentSpan ? (
          <code style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted }}>{trace.parentSpan}</code>
        ) : (
          <Badge variant="primary">root</Badge>
        )}
      </td>
    </tr>
  );
}
