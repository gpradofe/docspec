/**
 * Operations page generator.
 *
 * Produces a GeneratedPage listing all operational contexts defined in an
 * artifact (scheduled jobs, batch processes, infrastructure operations).
 */

import type { Context } from "../../types/docspec.js";
import type {
  GeneratedPage,
  OperationsPageData,
  ContextWithMeta,
} from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { operationsPageSlug } from "../slug.js";

export interface OperationsPageInput {
  contexts: Context[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generateOperationsPage(input: OperationsPageInput): GeneratedPage {
  const { contexts, artifactLabel, artifactColor } = input;

  const contextsWithMeta: ContextWithMeta[] = contexts.map((context) => ({
    context,
    artifact: { label: artifactLabel, color: artifactColor },
  }));

  const data: OperationsPageData = {
    type: PageType.OPERATIONS,
    contexts: contextsWithMeta,
  };

  return {
    type: PageType.OPERATIONS,
    slug: operationsPageSlug(),
    title: "Operations",
    description: "Operational contexts, scheduled jobs, and batch processes",
    artifactLabel,
    artifactColor,
    data,
  };
}
