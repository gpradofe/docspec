/**
 * Changelog page generator.
 *
 * Produces a GeneratedPage with an empty entries/diffs array.
 * Diffs are populated by the CLI `diff` command which calls
 * `computeDiff()` from the diff engine and injects the results
 * into the ChangelogPageData.diffs field.
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
