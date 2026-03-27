/**
 * Cross-linker orchestrator.
 * Builds a reference index, enriches member pages with "Referenced In" data,
 * and enriches flow pages with trace views.
 */

import type { GeneratedPage } from "../types/page.js";
import { buildReferenceIndex } from "./reference-index.js";
import { enrichReferencedIn } from "./referenced-in.js";
import { enrichFlowTraces } from "./trace-builder.js";
import { enrichSecurityContext } from "./security-enricher.js";
import { enrichConfigReferences } from "./config-enricher.js";

export { buildReferenceIndex } from "./reference-index.js";
export { computeReferencedIn, computeReferencedInFromSpecs, enrichReferencedIn } from "./referenced-in.js";
export type { ReferencedInResult } from "./referenced-in.js";
export { buildTrace, buildTraceView, enrichFlowTraces } from "./trace-builder.js";
export type { TraceBuilderOptions } from "./trace-builder.js";
export { enrichConfig, enrichConfigReferences } from "./config-enricher.js";
export type { ConfigEnrichment } from "./config-enricher.js";
export { enrichSecurity, enrichSecurityContext } from "./security-enricher.js";
export type { SecurityEnrichment, SecurityRule } from "./security-enricher.js";

export interface CrossLinkResult {
  pages: GeneratedPage[];
  referenceIndex: Record<string, string>;
}

export function crossLink(pages: GeneratedPage[]): CrossLinkResult {
  // 1. Build global reference index: qualifiedName → pageSlug
  const referenceIndex = buildReferenceIndex(pages);

  // 2. Enrich member pages with "Referenced In" data
  let enrichedPages = enrichReferencedIn(pages, referenceIndex);

  // 3. Enrich flow pages with trace view data
  enrichedPages = enrichFlowTraces(enrichedPages, referenceIndex);

  // 4. Enrich endpoint pages with security rules
  enrichSecurityContext(enrichedPages);

  // 5. Enrich member pages with configuration dependencies
  enrichConfigReferences(enrichedPages);

  return { pages: enrichedPages, referenceIndex };
}
