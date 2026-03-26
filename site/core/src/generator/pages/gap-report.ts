/**
 * Gap report page generator.
 *
 * Produces a GeneratedPage that highlights documentation gaps,
 * missing annotations, undocumented members, and coverage deficits.
 */

import type { GeneratedPage, GapReportPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { gapReportPageSlug } from "../slug.js";

export interface GapReportPageInput {
  artifactLabel: string;
  artifactColor?: string;
}

export function generateGapReportPage(input: GapReportPageInput): GeneratedPage {
  const { artifactLabel, artifactColor } = input;

  const data: GapReportPageData = {
    type: PageType.GAP_REPORT,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.GAP_REPORT,
    slug: gapReportPageSlug(artifactLabel),
    title: "Gap Report",
    description: `Documentation gap analysis for ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
