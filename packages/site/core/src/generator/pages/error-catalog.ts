/**
 * Error catalog page generator.
 *
 * Produces a single GeneratedPage listing all errors defined in an artifact,
 * including HTTP status codes, causes, and resolution advice.
 */

import type { DocError } from "../../types/docspec.js";
import type { GeneratedPage, ErrorCatalogPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { errorCatalogSlug } from "../slug.js";

export interface ErrorCatalogPageInput {
  errors: DocError[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generateErrorCatalogPage(input: ErrorCatalogPageInput): GeneratedPage {
  const { errors, artifactLabel, artifactColor } = input;

  const data: ErrorCatalogPageData = {
    type: PageType.ERROR_CATALOG,
    errors,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.ERROR_CATALOG,
    slug: errorCatalogSlug(),
    title: "Error Catalog",
    description: `All error codes defined in ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
