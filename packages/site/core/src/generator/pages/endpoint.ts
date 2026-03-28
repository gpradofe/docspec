/**
 * Endpoint page generator.
 *
 * Produces a GeneratedPage for a single REST endpoint discovered via
 * a method's `endpointMapping` annotation.
 */

import type { Method } from "../../types/docspec.js";
import type { GeneratedPage, EndpointPageData } from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { endpointPageSlug } from "../slug.js";

export interface EndpointPageInput {
  method: Method;
  /** Fully qualified name of the owning member (e.g. "com.waypoint.api.CurriculumController"). */
  memberQualified: string;
  /** Simple name of the owning member (e.g. "CurriculumController"). */
  memberName: string;
  artifactLabel: string;
  artifactColor?: string;
}

export function generateEndpointPage(input: EndpointPageInput): GeneratedPage {
  const { method, memberQualified, memberName, artifactLabel, artifactColor } = input;
  const mapping = method.endpointMapping!;
  const httpMethod = mapping.method ?? "GET";
  const httpPath = mapping.path ?? "/";

  const data: EndpointPageData = {
    type: PageType.ENDPOINT,
    method,
    memberQualified,
    memberName,
    artifact: { label: artifactLabel, color: artifactColor },
  };

  return {
    type: PageType.ENDPOINT,
    slug: endpointPageSlug(artifactLabel, httpMethod, httpPath),
    title: `${httpMethod} ${httpPath}`,
    description: mapping.description ?? method.description,
    artifactLabel,
    artifactColor,
    data,
  };
}
