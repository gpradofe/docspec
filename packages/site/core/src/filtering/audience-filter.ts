/**
 * Audience filter — filters pages and content based on audience level.
 */

import type { GeneratedPage } from "../types/page.js";

export type AudienceLevel = "beginner" | "intermediate" | "advanced" | "internal";

export interface AudienceFilterConfig {
  /** The audience level to filter for. Pages at or below this level are shown. */
  level: AudienceLevel;
  /** If true, show all pages but mark hidden ones as restricted. */
  softFilter?: boolean;
}

const AUDIENCE_ORDER: AudienceLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "internal",
];

/**
 * Filter pages based on audience level.
 * Pages without an explicit audience are treated as "intermediate".
 */
export function filterByAudience(
  pages: GeneratedPage[],
  config: AudienceFilterConfig,
): GeneratedPage[] {
  const maxLevel = AUDIENCE_ORDER.indexOf(config.level);

  return pages.filter((page) => {
    const pageAudience = getPageAudience(page);
    const pageLevel = AUDIENCE_ORDER.indexOf(pageAudience);
    return pageLevel <= maxLevel;
  });
}

/**
 * Get the audience level of a page from its data.
 */
function getPageAudience(page: GeneratedPage): AudienceLevel {
  const data = page.data as unknown as Record<string, unknown> | undefined;
  if (data && typeof data.audience === "string") {
    const audience = data.audience as AudienceLevel;
    if (AUDIENCE_ORDER.includes(audience)) return audience;
  }
  return "intermediate";
}

/**
 * Group pages by audience level.
 */
export function groupByAudience(
  pages: GeneratedPage[],
): Record<AudienceLevel, GeneratedPage[]> {
  const groups: Record<AudienceLevel, GeneratedPage[]> = {
    beginner: [],
    intermediate: [],
    advanced: [],
    internal: [],
  };

  for (const page of pages) {
    const audience = getPageAudience(page);
    groups[audience].push(page);
  }

  return groups;
}
