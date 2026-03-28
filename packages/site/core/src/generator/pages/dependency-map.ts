/**
 * Dependency map page generator.
 *
 * Produces a GeneratedPage listing all external dependencies of an artifact,
 * including base URLs, authentication, rate limits, and SLA information.
 */

import type { ExternalDependency } from "../../types/docspec.js";
import type { GeneratedPage, DependencyMapPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { dependencyMapPageSlug } from "../slug.js";

export interface DependencyMapPageInput {
  dependencies: ExternalDependency[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generateDependencyMapPage(input: DependencyMapPageInput): GeneratedPage {
  const { dependencies, artifactLabel, artifactColor } = input;

  const data: DependencyMapPageData = {
    type: PageType.DEPENDENCY_MAP,
    dependencies,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.DEPENDENCY_MAP,
    slug: dependencyMapPageSlug(),
    title: "External Dependencies",
    description: `External service dependencies for ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
