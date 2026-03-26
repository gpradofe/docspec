/**
 * Test overview page generator.
 *
 * Produces a GeneratedPage providing a high-level overview of method
 * intent signals and testing recommendations derived from the intent graph.
 */

import type { IntentGraph } from "../../types/docspec.js";
import type { GeneratedPage, TestOverviewPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { testOverviewPageSlug } from "../slug.js";

export interface TestOverviewPageInput {
  intentGraph: IntentGraph;
  artifactLabel: string;
  artifactColor?: string;
}

export function generateTestOverviewPage(input: TestOverviewPageInput): GeneratedPage {
  const { intentGraph, artifactLabel, artifactColor } = input;

  const data: TestOverviewPageData = {
    type: PageType.TEST_OVERVIEW,
    intentGraph,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.TEST_OVERVIEW,
    slug: testOverviewPageSlug(artifactLabel),
    title: "Test Overview",
    description: `Testing overview and intent analysis for ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
