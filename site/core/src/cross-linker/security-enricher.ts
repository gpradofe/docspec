import type { GeneratedPage, EndpointPageData, SecurityPageData } from "../types/page.js";
import { PageType } from "../types/page.js";

/**
 * Enriches endpoint pages with security rules from the SecurityPage.
 * Matches endpoint paths against security endpoint rules.
 */
export function enrichSecurityContext(pages: GeneratedPage[]): void {
  // Find security pages
  const securityPages = pages.filter(p => p.type === PageType.SECURITY);
  if (securityPages.length === 0) return;

  // Collect all security rules
  const rules: Array<{ path: string; rules: string[]; isPublic: boolean; rateLimit?: { requests?: number; window?: string } }> = [];
  for (const sp of securityPages) {
    const secData = sp.data as SecurityPageData;
    for (const endpoint of secData.security.endpoints ?? []) {
      rules.push({
        path: endpoint.path,
        rules: endpoint.rules ?? [],
        isPublic: endpoint.public ?? false,
        rateLimit: endpoint.rateLimit,
      });
    }
  }

  // Enrich endpoint pages
  for (const page of pages) {
    if (page.type !== PageType.ENDPOINT) continue;
    const epData = page.data as EndpointPageData;
    const endpointPath = epData.method.endpointMapping?.path;
    if (!endpointPath) continue;

    // Find matching security rule (exact or prefix match)
    const match = rules.find(r =>
      endpointPath === r.path || endpointPath.startsWith(r.path.replace(/\*\*$/, ''))
    );

    if (match) {
      // Add security metadata to the page data
      (epData as any).securityRules = match.rules;
      (epData as any).isPublic = match.isPublic;
      (epData as any).rateLimit = match.rateLimit;
    }
  }
}
