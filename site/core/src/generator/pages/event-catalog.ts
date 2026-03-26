/**
 * Event catalog page generator.
 *
 * Produces a single GeneratedPage listing all domain events defined in an
 * artifact, including channels, payloads, and delivery guarantees.
 */

import type { DocEvent } from "../../types/docspec.js";
import type { GeneratedPage, EventCatalogPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { eventCatalogSlug } from "../slug.js";

export interface EventCatalogPageInput {
  events: DocEvent[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generateEventCatalogPage(input: EventCatalogPageInput): GeneratedPage {
  const { events, artifactLabel, artifactColor } = input;

  const data: EventCatalogPageData = {
    type: PageType.EVENT_CATALOG,
    events,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.EVENT_CATALOG,
    slug: eventCatalogSlug(),
    title: "Event Catalog",
    description: `All domain events defined in ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
