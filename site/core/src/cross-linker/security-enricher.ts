/**
 * Security enrichment for cross-linking.
 *
 * Two modes:
 * 1. `enrichSecurity` — pre-generation: walks raw DocSpec[] to build a map
 *    from endpoint paths to their security rules.
 * 2. `enrichSecurityContext` — post-generation: enriches endpoint pages with
 *    security metadata from SecurityPage data.
 */

import type { DocSpec } from "../types/docspec.js";
import type { GeneratedPage, EndpointPageData, SecurityPageData } from "../types/page.js";
import { PageType } from "../types/page.js";

/* ── Pre-generation: compute from raw specs ─────────────────────────── */

export interface SecurityEnrichment {
  /** Map from endpoint path to security rules */
  endpointSecurity: Map<string, SecurityRule[]>;
}

export interface SecurityRule {
  type: "role" | "permission" | "expression";
  value: string;
  source: string; // annotation name
}

/**
 * Walk one or more DocSpec objects and compute, for each secured endpoint,
 * its list of security rules (roles, permissions, expressions).
 */
export function enrichSecurity(specs: DocSpec[]): SecurityEnrichment {
  const endpointSecurity = new Map<string, SecurityRule[]>();

  for (const spec of specs) {
    const security = spec.security;
    if (!security) continue;

    // Map security endpoint rules to their paths
    if (security.endpoints) {
      for (const se of security.endpoints) {
        const rules: SecurityRule[] = [];

        if (se.rules) {
          for (const rule of se.rules) {
            // Determine the type from the rule string pattern
            if (rule.startsWith("hasRole(") || rule.startsWith("ROLE_")) {
              rules.push({ type: "role", value: rule, source: "@Secured" });
            } else if (rule.startsWith("hasAuthority(") || rule.startsWith("hasPermission(")) {
              rules.push({ type: "permission", value: rule, source: "@PreAuthorize" });
            } else {
              rules.push({ type: "expression", value: rule, source: "@PreAuthorize" });
            }
          }
        }

        if (rules.length > 0) {
          endpointSecurity.set(se.path, rules);
        }
      }
    }
  }

  return { endpointSecurity };
}

/* ── Post-generation: enrich pages ──────────────────────────────────── */

/**
 * Enriches endpoint pages with security rules from the SecurityPage.
 * Matches endpoint paths against security endpoint rules.
 * Mutates endpoint page data in-place.
 */
export function enrichSecurityContext(pages: GeneratedPage[]): void {
  // Find security pages
  const securityPages = pages.filter(p => p.type === PageType.SECURITY);
  if (securityPages.length === 0) return;

  // Collect all security rules
  const rules: Array<{
    path: string;
    rules: string[];
    isPublic: boolean;
    rateLimit?: { requests?: number; window?: string };
  }> = [];

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
      (epData as any).securityRules = match.rules;
      (epData as any).isPublic = match.isPublic;
      (epData as any).rateLimit = match.rateLimit;
    }
  }
}
