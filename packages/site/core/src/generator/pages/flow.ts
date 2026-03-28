/**
 * Flow page generator.
 *
 * Produces a GeneratedPage for a single flow (pipeline / sequence diagram),
 * including a flattened trace view suitable for rendering.
 */

import type { Flow } from "../../types/docspec.js";
import type { GeneratedPage, FlowPageData, TraceEntry } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { flowPageSlug, memberPageSlug } from "../slug.js";

export interface FlowPageInput {
  flow: Flow;
  artifactLabel: string;
  artifactColor?: string;
}

/**
 * Converts flow steps into a flat trace view array for timeline rendering.
 */
function buildTraceView(flow: Flow, artifactLabel: string): TraceEntry[] {
  return flow.steps.map((step, index) => {
    const entry: TraceEntry = {
      actor: step.actor ?? step.name ?? step.id,
      actorQualified: step.actorQualified,
      description: step.description,
      type: step.type,
      ai: step.ai,
      depth: index,
    };

    // If the step has an actorQualified reference, generate a link
    if (step.actorQualified) {
      entry.actorUrl = memberPageSlug(artifactLabel, step.actorQualified);
    }

    return entry;
  });
}

export function generateFlowPage(input: FlowPageInput): GeneratedPage {
  const { flow, artifactLabel, artifactColor } = input;

  const traceView = buildTraceView(flow, artifactLabel);

  const data: FlowPageData = {
    type: PageType.FLOW,
    flow,
    artifact: { label: artifactLabel, color: artifactColor },
    traceView,
  };

  return {
    type: PageType.FLOW,
    slug: flowPageSlug(flow.id),
    title: flow.name ?? flow.id,
    description: flow.description,
    artifactLabel,
    artifactColor,
    data,
  };
}
