/**
 * Builds trace view data from flow steps.
 *
 * The trace view shows a call-stack visualization of a flow's execution:
 *   depth 0  — trigger (if present) or first step
 *   depth 1  — flow steps (process, external, ai, etc.)
 *   depth 2  — data store operations attached to a step
 */

import type { DocSpec, Flow } from "../types/docspec.js";
import type { TraceEntry, GeneratedPage, FlowPageData } from "../types/page.js";
import { PageType } from "../types/page.js";

export interface TraceBuilderOptions {
  referenceIndex?: Record<string, string>;
}

/**
 * Build a linear trace from a Flow, optionally resolving actor URLs via a
 * reference index. Includes trigger as first entry (depth 0), steps at
 * depth 1, and data store operations as sub-entries at depth 2.
 */
export function buildTrace(
  flow: Flow,
  spec: DocSpec,
  options: TraceBuilderOptions = {},
): TraceEntry[] {
  const trace: TraceEntry[] = [];

  // Add trigger as first entry if present
  if (flow.trigger) {
    trace.push({
      actor: flow.trigger,
      description: `Trigger: ${flow.trigger}`,
      type: "trigger",
      depth: 0,
    });
  }

  // Walk flow steps
  for (const step of flow.steps) {
    const entry: TraceEntry = {
      actor: step.name || step.actor || step.id,
      actorQualified: step.actorQualified,
      actorUrl: step.actorQualified
        ? options.referenceIndex?.[step.actorQualified]
        : undefined,
      description: step.description,
      type: step.type || "process",
      ai: step.ai,
      depth: 1,
    };

    // Derive project from qualified name (first two segments)
    if (step.actorQualified) {
      const parts = step.actorQualified.split(".");
      entry.project = parts.length >= 2 ? parts.slice(0, 2).join(".") : parts[0];
    }

    trace.push(entry);

    // Add data store operations as sub-entries
    if (step.dataStoreOps) {
      for (const op of step.dataStoreOps) {
        trace.push({
          actor: `${op.store ?? "unknown"}: ${op.operation ?? "unknown"} ${op.tables?.join(", ") ?? ""}`.trim(),
          description: op.transactional ? "transactional" : undefined,
          type: "storage",
          depth: 2,
        });
      }
    }
  }

  return trace;
}

/* ── Legacy page-level helper (used by cross-link orchestrator) ─────── */

/**
 * Build a trace using only a Flow and a flat reference index (no full DocSpec).
 * Used during post-generation page enrichment.
 */
export function buildTraceView(
  flow: Flow,
  referenceIndex: Record<string, string>,
  artifactLabel: string,
): TraceEntry[] {
  const trace: TraceEntry[] = [];

  // Add trigger as first entry if present
  if (flow.trigger) {
    trace.push({
      actor: flow.trigger,
      description: `Trigger: ${flow.trigger}`,
      type: "trigger",
      depth: 0,
    });
  }

  for (const step of flow.steps) {
    const entry: TraceEntry = {
      actor: step.name || step.actor || step.id,
      actorQualified: step.actorQualified,
      actorUrl: step.actorQualified ? referenceIndex[step.actorQualified] : undefined,
      project: artifactLabel,
      description: step.description,
      type: step.type || "process",
      ai: step.ai,
      depth: 1,
    };

    trace.push(entry);

    // Data store operations as sub-entries
    if (step.dataStoreOps) {
      for (const op of step.dataStoreOps) {
        trace.push({
          actor: `${op.store ?? "unknown"}: ${op.operation ?? "unknown"} ${op.tables?.join(", ") ?? ""}`.trim(),
          description: op.transactional ? "transactional" : undefined,
          type: "storage",
          depth: 2,
        });
      }
    }
  }

  return trace;
}

/**
 * Enrich flow pages with trace view data.
 */
export function enrichFlowTraces(
  pages: GeneratedPage[],
  referenceIndex: Record<string, string>,
): GeneratedPage[] {
  return pages.map((page) => {
    if (page.type !== PageType.FLOW) return page;

    const data = page.data as FlowPageData;
    const traceView = buildTraceView(
      data.flow,
      referenceIndex,
      data.artifact.label,
    );

    return {
      ...page,
      data: {
        ...data,
        traceView,
      },
    };
  });
}
