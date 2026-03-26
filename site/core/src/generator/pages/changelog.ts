/**
 * Changelog page generator (placeholder).
 *
 * Produces a GeneratedPage with an empty entries array.
 * Actual changelog content will be populated in a future step
 * (e.g. from CHANGELOG.md or git history).
 */

import type { GeneratedPage, ChangelogPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { changelogSlug } from "../slug.js";

export function generateChangelogPage(): GeneratedPage {
  const data: ChangelogPageData = {
    type: PageType.CHANGELOG,
    entries: [],
  };

  return {
    type: PageType.CHANGELOG,
    slug: changelogSlug(),
    title: "Changelog",
    description: "Version history and release notes",
    data,
  };
}
