/**
 * Privacy page generator.
 *
 * Produces a GeneratedPage listing all privacy-sensitive fields in an
 * artifact, including PII types, retention policies, and GDPR basis.
 */

import type { PrivacyField } from "../../types/docspec.js";
import type { GeneratedPage, PrivacyPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { privacyPageSlug } from "../slug.js";

export interface PrivacyPageInput {
  fields: PrivacyField[];
  artifactLabel: string;
  artifactColor?: string;
}

export function generatePrivacyPage(input: PrivacyPageInput): GeneratedPage {
  const { fields, artifactLabel, artifactColor } = input;

  const data: PrivacyPageData = {
    type: PageType.PRIVACY,
    fields,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.PRIVACY,
    slug: privacyPageSlug(),
    title: "Privacy",
    description: `Privacy-sensitive fields and data handling in ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
