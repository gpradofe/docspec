/**
 * Builds trace view data from flow steps.
 * The trace view shows a call-stack visualization of a flow's execution.
 */

import type { Flow } from "../types/docspec.js";
import type { TraceEntry, GeneratedPage, FlowPageData } from "../types/page.js";
import { PageType } from "../types/page.js";

export function buildTraceView(
  flow: Flow,
  referenceIndex: Record<string, string>,
  artifactLabel: string
): TraceEntry[] {
  return flow.steps.map((step, i) => ({
    actor: step.actor || step.id,
    actorQualified: step.actorQualified,
    actorUrl: step.actorQualified ? referenceIndex[step.actorQualified] : undefined,
    project: artifactLabel,
    description: step.description,
    type: step.type,
    ai: step.ai,
    depth: i === 0 ? 0 : 1,
  }));
}

/**
 * Enrich flow pages with trace view data.
 */
export function enrichFlowTraces(
  pages: GeneratedPage[],
  referenceIndex: Record<string, string>
): GeneratedPage[] {
  return pages.map((page) => {
    if (page.type !== PageType.FLOW) return page;

    const data = page.data as FlowPageData;
    const traceView = buildTraceView(
      data.flow,
      referenceIndex,
      data.artifact.label
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
