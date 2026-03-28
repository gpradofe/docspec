/**
 * Configuration page generator.
 *
 * Produces a GeneratedPage listing all configuration properties defined
 * in an artifact, including defaults, valid ranges, and environments.
 */

import type { ConfigurationProperty } from "../../types/docspec.js";
import type { GeneratedPage, ConfigurationPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { configurationPageSlug } from "../slug.js";

export interface ConfigurationPageInput {
  properties: ConfigurationProperty[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generateConfigurationPage(input: ConfigurationPageInput): GeneratedPage {
  const { properties, artifactLabel, artifactColor } = input;

  const data: ConfigurationPageData = {
    type: PageType.CONFIGURATION,
    properties,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.CONFIGURATION,
    slug: configurationPageSlug(artifactLabel),
    title: "Configuration",
    description: `Configuration properties for ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
