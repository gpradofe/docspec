/**
 * Security page generator.
 *
 * Produces a GeneratedPage describing the security configuration of an
 * artifact, including authentication mechanisms, endpoint rules, and roles.
 */

import type { Security } from "../../types/docspec.js";
import type { GeneratedPage, SecurityPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { securityPageSlug } from "../slug.js";

export interface SecurityPageInput {
  security: Security;
  artifactLabel: string;
  artifactColor?: string;
}

export function generateSecurityPage(input: SecurityPageInput): GeneratedPage {
  const { security, artifactLabel, artifactColor } = input;

  const data: SecurityPageData = {
    type: PageType.SECURITY,
    security,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.SECURITY,
    slug: securityPageSlug(artifactLabel),
    title: "Security",
    description: `Security configuration for ${artifactLabel}`,
    artifactLabel,
    artifactColor,
    data,
  };
}
