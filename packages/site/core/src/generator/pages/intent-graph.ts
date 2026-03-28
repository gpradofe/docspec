/**
 * Intent graph page generator.
 *
 * Produces a GeneratedPage visualizing the intent graph — method-level
 * semantic analysis including name semantics, data flow, error handling,
 * and intent density scores.
 */

import type { IntentGraph } from "../../types/docspec.js";
import type { GeneratedPage, IntentGraphPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { intentGraphPageSlug } from "../slug.js";

export interface IntentGraphPageInput {
  intentGraph: IntentGraph;
  artifactLabel: string;
  artifactColor?: string;
}

export function generateIntentGraphPage(input: IntentGraphPageInput): GeneratedPage {
  const { intentGraph, artifactLabel, artifactColor } = input;

  const data: IntentGraphPageData = {
    type: PageType.INTENT_GRAPH,
    intentGraph,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.INTENT_GRAPH,
    slug: intentGraphPageSlug(artifactLabel),
    title: "Intent Graph",
    description: `Method intent analysis and semantic graph for ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
