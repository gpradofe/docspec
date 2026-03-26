/**
 * Module page generator.
 *
 * Produces a GeneratedPage for a single DocSpec module, showing its
 * members, stereotype, and description.
 */

import type { Module } from "../../types/docspec.js";
import type { GeneratedPage, ModulePageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { modulePageSlug } from "../slug.js";

export interface ModulePageInput {
  module: Module;
  artifactLabel: string;
  artifactColor?: string;
}

export function generateModulePage(input: ModulePageInput): GeneratedPage {
  const { module, artifactLabel, artifactColor } = input;

  const data: ModulePageData = {
    type: PageType.MODULE,
    module,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.MODULE,
    slug: modulePageSlug(artifactLabel, module.id),
    title: module.name ?? module.id,
    description: module.description,
    artifactLabel,
    artifactColor,
    data,
  };
}
