/**
 * Flow test page generator.
 *
 * Produces a GeneratedPage for a flow-level test view that shows
 * testing coverage and recommendations for a specific flow.
 */

import type { Flow } from "../../types/docspec.js";
import type { GeneratedPage, FlowTestPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { flowTestPageSlug } from "../slug.js";

export interface FlowTestPageInput {
  flow: Flow;
  artifactLabel: string;
  artifactColor?: string;
}

export function generateFlowTestPage(input: FlowTestPageInput): GeneratedPage {
  const { flow, artifactLabel, artifactColor } = input;

  const data: FlowTestPageData = {
    type: PageType.FLOW_TEST,
    flow,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.FLOW_TEST,
    slug: flowTestPageSlug(artifactLabel, flow.id),
    title: `Flow Test: ${flow.name ?? flow.id}`,
    description: `Test overview for flow ${flow.name ?? flow.id}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
