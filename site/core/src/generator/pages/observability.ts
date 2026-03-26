/**
 * Observability page generator.
 *
 * Produces a GeneratedPage summarising the observability instrumentation
 * for an artifact — metrics, trace spans, and health checks.
 */

import type { Observability } from "../../types/docspec.js";
import type { GeneratedPage, ObservabilityPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { observabilityPageSlug } from "../slug.js";

export interface ObservabilityPageInput {
  observability: Observability;
  artifactLabel: string;
  artifactColor?: string;
}

export function generateObservabilityPage(input: ObservabilityPageInput): GeneratedPage {
  const { observability, artifactLabel, artifactColor } = input;

  const data: ObservabilityPageData = {
    type: PageType.OBSERVABILITY,
    observability,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.OBSERVABILITY,
    slug: observabilityPageSlug(artifactLabel),
    title: "Observability",
    description: `Observability instrumentation for ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
