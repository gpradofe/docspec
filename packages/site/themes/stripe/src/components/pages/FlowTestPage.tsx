import React from "react";
import type { FlowTestPageData, FlowStep, FlowStepDataStoreOp } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Badge } from "../ui/Badge.js";
import { CodeBlock } from "../ui/CodeBlock.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface FlowTestPageProps {
  data: FlowTestPageData;
}

export function FlowTestPage({ data }: FlowTestPageProps) {
  const { flow, artifact } = data;
  const steps = flow.steps || [];

  // Compute mock/stub summary
  const stepsWithMocks = steps.filter(
    (s) => s.dataStoreOps && s.dataStoreOps.length > 0,
  ).length;
  const stepsWithStubs = steps.filter(
    (s) => s.type === "external",
  ).length;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Architecture", href: "/architecture" },
          { label: artifact.label },
          { label: "Flows", href: `/${slugify(artifact.label)}/flows` },
          { label: `${flow.name || flow.id} Test` },
        ]}
      />

      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 8 }}>
        Flow Test: {flow.name || flow.id}
      </h1>
      {flow.description && (
        <p style={{ color: T.textMuted, marginBottom: 16 }}>{flow.description}</p>
      )}
      <p style={{ fontSize: 12, color: T.textDim, marginBottom: 32 }}>
        {steps.length} step{steps.length !== 1 ? "s" : ""} &middot;{" "}
        {stepsWithMocks} mock{stepsWithMocks !== 1 ? "s" : ""} &middot;{" "}
        {stepsWithStubs} stub{stepsWithStubs !== 1 ? "s" : ""}
      </p>

      {/* Flow Diagram */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="flow-diagram">
          Flow Diagram
        </h2>
        <div>
          {steps.map((step, i) => (
            <FlowStepCard key={step.id} step={step} index={i} isLast={i === steps.length - 1} />
          ))}
        </div>
      </section>

      {/* Mock Boundary Visualization */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="mock-boundaries">
          Mock Boundaries
        </h2>
        <p style={{ fontSize: 14, color: T.textMuted, marginBottom: 16 }}>
          Dependencies that would be mocked or stubbed in an integration test.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid " + T.surfaceBorder }}>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Step</th>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Type</th>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Dependencies</th>
                <th style={{ textAlign: "left", padding: "8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Boundary</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <MockBoundaryRow key={step.id} step={step} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Integration Test Skeleton */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="test-skeleton">
          Integration Test Skeleton
        </h2>
        <CodeBlock
          code={generateTestSkeleton(flow.name || flow.id, steps)}
          language="java"
          title={`${pascalCase(flow.name || flow.id)}_IntegrationTest.java`}
        />
      </section>

      {/* Data Flow Table */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="data-flow">
          Data Flow
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid " + T.surfaceBorder }}>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Step</th>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Inputs</th>
                <th style={{ textAlign: "left", padding: "8px 16px 8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Outputs</th>
                <th style={{ textAlign: "left", padding: "8px 0", color: T.textDim, fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Data Store Ops</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <DataFlowRow key={step.id} step={step} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FlowStepCard({ step, index, isLast }: { step: FlowStep; index: number; isLast: boolean }) {
  const hasMocks = step.dataStoreOps && step.dataStoreOps.length > 0;
  const hasStubs = step.type === "external";

  return (
    <div style={{ position: "relative" }}>
      {/* Connector line */}
      {!isLast && (
        <div style={{ position: "absolute", left: 20, top: "100%", width: 2, height: 16, background: T.surfaceBorder, zIndex: 0 }} />
      )}

      <div style={{ padding: 16, borderRadius: 8, border: "1px solid " + T.surfaceBorder, background: T.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: T.accentBg,
            color: T.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {index + 1}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
            {step.name || step.id}
          </span>
          {step.type && <Badge>{step.type}</Badge>}
          {hasMocks && <Badge variant="warning">Mock</Badge>}
          {hasStubs && <Badge variant="info">Stub</Badge>}
        </div>

        {step.description && (
          <p style={{ fontSize: 14, color: T.textMuted, marginLeft: 32, marginBottom: 4 }}>{step.description}</p>
        )}

        {/* Config dependencies */}
        {step.configDependencies && step.configDependencies.length > 0 && (
          <div style={{ marginLeft: 32, marginTop: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, fontSize: 12 }}>
            <span style={{ color: T.textDim, fontWeight: 500 }}>Config:</span>
            {step.configDependencies.map((cfg) => (
              <code
                key={cfg}
                style={{ padding: "2px 6px", borderRadius: 4, background: T.surface, fontFamily: T.mono, color: T.textMuted, border: "1px solid " + T.surfaceBorder }}
              >
                {cfg}
              </code>
            ))}
          </div>
        )}
      </div>

      {/* Spacer for connector */}
      {!isLast && <div style={{ height: 16 }} />}
    </div>
  );
}

function MockBoundaryRow({ step }: { step: FlowStep }) {
  const hasMocks = step.dataStoreOps && step.dataStoreOps.length > 0;
  const hasStubs = step.type === "external";
  const hasConfigDeps = step.configDependencies && step.configDependencies.length > 0;

  if (!hasMocks && !hasStubs && !hasConfigDeps) {
    return (
      <tr style={{ borderBottom: "1px solid " + T.surfaceBorder + "80" }}>
        <td style={{ padding: "8px 16px 8px 0", color: T.text, fontSize: 14 }}>{step.name || step.id}</td>
        <td style={{ padding: "8px 16px 8px 0" }}>
          {step.type ? <Badge>{step.type}</Badge> : <span style={{ color: T.textDim }}>\u2014</span>}
        </td>
        <td style={{ padding: "8px 16px 8px 0", color: T.textDim, fontSize: 14 }}>None</td>
        <td style={{ padding: "8px 0" }}>
          <Badge variant="success">Real</Badge>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: "1px solid " + T.surfaceBorder + "80" }}>
      <td style={{ padding: "8px 16px 8px 0", color: T.text, fontSize: 14 }}>{step.name || step.id}</td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        {step.type ? <Badge>{step.type}</Badge> : <span style={{ color: T.textDim }}>\u2014</span>}
      </td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {step.dataStoreOps?.map((op, i) => (
            <div key={i} style={{ fontSize: 14, color: T.textMuted }}>
              <code style={{ fontFamily: T.mono }}>{op.store}</code>
              {op.operation && <span style={{ color: T.textDim }}> ({op.operation})</span>}
            </div>
          ))}
          {hasConfigDeps && (
            <div style={{ fontSize: 12, color: T.textDim }}>
              Config: {step.configDependencies!.join(", ")}
            </div>
          )}
        </div>
      </td>
      <td style={{ padding: "8px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {hasMocks && <Badge variant="warning">Mock</Badge>}
          {hasStubs && <Badge variant="info">Stub</Badge>}
        </div>
      </td>
    </tr>
  );
}

function DataFlowRow({ step }: { step: FlowStep }) {
  return (
    <tr style={{ borderBottom: "1px solid " + T.surfaceBorder + "80" }}>
      <td style={{ padding: "8px 16px 8px 0", color: T.text, fontSize: 14 }}>{step.name || step.id}</td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        {step.inputs && step.inputs.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {step.inputs.map((input) => (
              <code key={input} style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted }}>{input}</code>
            ))}
          </div>
        ) : (
          <span style={{ color: T.textDim }}>\u2014</span>
        )}
      </td>
      <td style={{ padding: "8px 16px 8px 0" }}>
        {step.outputs && step.outputs.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {step.outputs.map((output) => (
              <code key={output} style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted }}>{output}</code>
            ))}
          </div>
        ) : (
          <span style={{ color: T.textDim }}>\u2014</span>
        )}
      </td>
      <td style={{ padding: "8px 0" }}>
        {step.dataStoreOps && step.dataStoreOps.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {step.dataStoreOps.map((op, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <code style={{ fontSize: 12, fontFamily: T.mono, color: T.textMuted }}>{op.store}</code>
                {op.operation && <Badge>{op.operation}</Badge>}
              </div>
            ))}
          </div>
        ) : (
          <span style={{ color: T.textDim }}>\u2014</span>
        )}
      </td>
    </tr>
  );
}

function generateTestSkeleton(flowName: string, steps: FlowStep[]): string {
  const className = pascalCase(flowName);
  const mockBeans = new Set<string>();

  for (const step of steps) {
    if (step.dataStoreOps) {
      for (const op of step.dataStoreOps) {
        if (op.store) {
          mockBeans.add(op.store);
        }
      }
    }
  }

  const mockDeclarations = Array.from(mockBeans)
    .map((store) => `    @MockBean ${pascalCase(store)}Repository ${camelCase(store)}Repo;`)
    .join("\n");

  const stepComments = steps
    .map((step, i) => `        // Step ${i + 1}: ${step.name || step.id}${step.description ? " \u2014 " + step.description : ""}`)
    .join("\n");

  return `@SpringBootTest
class ${className}_IntegrationTest {
${mockDeclarations ? mockDeclarations + "\n" : ""}
    @Test
    void testFullFlow() {
${stepComments}

        // Assert: final state
    }
}`;
}

function pascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function camelCase(str: string): string {
  const pascal = pascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
