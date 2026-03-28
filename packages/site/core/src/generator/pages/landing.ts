/**
 * Landing page generator.
 *
 * Produces a GeneratedPage for the site landing page, summarizing all
 * artifacts registered in the documentation site.
 */

import type { GeneratedPage, LandingPageData, ArtifactSummary } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { landingPageSlug } from "../slug.js";

export interface LandingPageInput {
  artifacts: ArtifactSummary[];
}

export function generateLandingPage(input: LandingPageInput): GeneratedPage {
  const { artifacts } = input;

  const data: LandingPageData = {
    type: PageType.LANDING,
    artifacts,
  };

  return {
    type: PageType.LANDING,
    slug: landingPageSlug(),
    title: "Home",
    description: "Documentation landing page",
    data,
  };
}
