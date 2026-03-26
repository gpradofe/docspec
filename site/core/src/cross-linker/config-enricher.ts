import type { GeneratedPage, ConfigurationPageData, MemberPageData } from "../types/page.js";
import { PageType } from "../types/page.js";

/**
 * Links configuration properties to the members/flows that use them.
 */
export function enrichConfigReferences(pages: GeneratedPage[]): void {
  // Find config pages and build usedBy index
  const configPages = pages.filter(p => p.type === PageType.CONFIGURATION);
  if (configPages.length === 0) return;

  // Build map: memberQualified -> config keys used
  const memberConfigMap = new Map<string, string[]>();
  for (const cp of configPages) {
    const configData = cp.data as ConfigurationPageData;
    for (const prop of configData.properties) {
      for (const user of prop.usedBy ?? []) {
        const existing = memberConfigMap.get(user) ?? [];
        existing.push(prop.key);
        memberConfigMap.set(user, existing);
      }
    }
  }

  // Enrich member pages with config references
  for (const page of pages) {
    if (page.type !== PageType.MEMBER) continue;
    const memberData = page.data as MemberPageData;
    const configs = memberConfigMap.get(memberData.member.qualified);
    if (configs && configs.length > 0) {
      (memberData as any).configDependencies = configs;
    }
  }
}
