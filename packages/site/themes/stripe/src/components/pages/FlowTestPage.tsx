import React from "react";
import type { FlowTestPageData, FlowStep, FlowStepDataStoreOp } from "@docspec/core";
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

      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Flow Test: {flow.name || flow.id}
      </h1>
      {flow.description && (
        <p className="text-text-secondary mb-4">{flow.description}</p>
      )}
      <p className="text-xs text-text-tertiary mb-8">
        {steps.length} step{steps.length !== 1 ? "s" : ""} &middot;{" "}
        {stepsWithMocks} mock{stepsWithMocks !== 1 ? "s" : ""} &middot;{" "}
        {stepsWithStubs} stub{stepsWithStubs !== 1 ? "s" : ""}
      </p>

      {/* Flow Diagram */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="flow-diagram">
          Flow Diagram
        </h2>
        <div className="space-y-0">
          {steps.map((step, i) => (
            <FlowStepCard key={step.id} step={step} index={i} isLast={i === steps.length - 1} />
          ))}
        </div>
      </section>

      {/* Mock Boundary Visualization */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="mock-boundaries">
          Mock Boundaries
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Dependencies that would be mocked or stubbed in an integration test.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Step</th>
                <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Type</th>
                <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Dependencies</th>
                <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Boundary</th>
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
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="test-skeleton">
          Integration Test Skeleton
        </h2>
        <CodeBlock
          code={generateTestSkeleton(flow.name || flow.id, steps)}
          language="java"
          title={`${pascalCase(flow.name || flow.id)}_IntegrationTest.java`}
        />
      </section>

      {/* Data Flow Table */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4" id="data-flow">
          Data Flow
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Step</th>
                <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Inputs</th>
                <th className="text-left py-2 pr-4 text-text-tertiary font-medium text-xs uppercase">Outputs</th>
                <th className="text-left py-2 text-text-tertiary font-medium text-xs uppercase">Data Store Ops</th>
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
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-5 top-full w-0.5 h-4 bg-border z-0" />
      )}

      <div className="p-4 rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-text-primary">
            {step.name || step.id}
          </span>
          {step.type && <Badge>{step.type}</Badge>}
          {hasMocks && <Badge variant="warning">Mock</Badge>}
          {hasStubs && <Badge variant="info">Stub</Badge>}
        </div>

        {step.description && (
          <p className="text-sm text-text-secondary ml-8 mb-1">{step.description}</p>
        )}

        {/* Config dependencies */}
        {step.configDependencies && step.configDependencies.length > 0 && (
          <div className="ml-8 mt-1 flex flex-wrap items-center gap-1 text-xs">
            <span className="text-text-tertiary font-medium">Config:</span>
            {step.configDependencies.map((cfg) => (
              <code
                key={cfg}
                className="px-1.5 py-0.5 rounded bg-surface-secondary font-mono text-text-secondary border border-border"
              >
                {cfg}
              </code>
            ))}
          </div>
        )}
      </div>

      {/* Spacer for connector */}
      {!isLast && <div className="h-4" />}
    </div>
  );
}

function MockBoundaryRow({ step }: { step: FlowStep }) {
  const hasMocks = step.dataStoreOps && step.dataStoreOps.length > 0;
  const hasStubs = step.type === "external";
  const hasConfigDeps = step.configDependencies && step.configDependencies.length > 0;

  if (!hasMocks && !hasStubs && !hasConfigDeps) {
    return (
      <tr className="border-b border-border/50">
        <td className="py-2 pr-4 text-text-primary text-sm">{step.name || step.id}</td>
        <td className="py-2 pr-4">
          {step.type ? <Badge>{step.type}</Badge> : <span className="text-text-tertiary">—</span>}
        </td>
        <td className="py-2 pr-4 text-text-tertiary text-sm">None</td>
        <td className="py-2">
          <Badge variant="success">Real</Badge>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4 text-text-primary text-sm">{step.name || step.id}</td>
      <td className="py-2 pr-4">
        {step.type ? <Badge>{step.type}</Badge> : <span className="text-text-tertiary">—</span>}
      </td>
      <td className="py-2 pr-4">
        <div className="space-y-1">
          {step.dataStoreOps?.map((op, i) => (
            <div key={i} className="text-sm text-text-secondary">
              <code className="font-mono">{op.store}</code>
              {op.operation && <span className="text-text-tertiary"> ({op.operation})</span>}
            </div>
          ))}
          {hasConfigDeps && (
            <div className="text-xs text-text-tertiary">
              Config: {step.configDependencies!.join(", ")}
            </div>
          )}
        </div>
      </td>
      <td className="py-2">
        <div className="flex flex-wrap gap-1">
          {hasMocks && <Badge variant="warning">Mock</Badge>}
          {hasStubs && <Badge variant="info">Stub</Badge>}
        </div>
      </td>
    </tr>
  );
}

function DataFlowRow({ step }: { step: FlowStep }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4 text-text-primary text-sm">{step.name || step.id}</td>
      <td className="py-2 pr-4">
        {step.inputs && step.inputs.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {step.inputs.map((input) => (
              <code key={input} className="text-xs font-mono text-text-secondary">{input}</code>
            ))}
          </div>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="py-2 pr-4">
        {step.outputs && step.outputs.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {step.outputs.map((output) => (
              <code key={output} className="text-xs font-mono text-text-secondary">{output}</code>
            ))}
          </div>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="py-2">
        {step.dataStoreOps && step.dataStoreOps.length > 0 ? (
          <div className="space-y-1">
            {step.dataStoreOps.map((op, i) => (
              <div key={i} className="flex items-center gap-1">
                <code className="text-xs font-mono text-text-secondary">{op.store}</code>
                {op.operation && <Badge>{op.operation}</Badge>}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-text-tertiary">—</span>
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
    .map((step, i) => `        // Step ${i + 1}: ${step.name || step.id}${step.description ? " — " + step.description : ""}`)
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
