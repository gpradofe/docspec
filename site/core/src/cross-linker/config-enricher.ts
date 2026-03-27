/**
 * Configuration enrichment for cross-linking.
 *
 * Two modes:
 * 1. `enrichConfig` — pre-generation: walks raw DocSpec[] to build a map from
 *    configuration keys to the qualified method names that consume them.
 * 2. `enrichConfigReferences` — post-generation: enriches member pages with
 *    the config keys they depend on.
 */

import type { DocSpec } from "../types/docspec.js";
import type { GeneratedPage, ConfigurationPageData, MemberPageData } from "../types/page.js";
import { PageType } from "../types/page.js";

/* ── Pre-generation: compute from raw specs ─────────────────────────── */

export interface ConfigEnrichment {
  /** Map from config key to list of qualified method names that read it */
  configConsumers: Map<string, string[]>;
}

/**
 * Walk one or more DocSpec objects and compute, for each configuration key,
 * which qualified methods consume it (via flow step `configDependencies`).
 */
export function enrichConfig(specs: DocSpec[]): ConfigEnrichment {
  const configConsumers = new Map<string, string[]>();

  for (const spec of specs) {
    // Walk configuration properties with usedBy
    if (spec.configuration) {
      for (const prop of spec.configuration) {
        if (prop.usedBy) {
          for (const consumer of prop.usedBy) {
            addConsumer(configConsumers, prop.key, consumer);
          }
        }
      }
    }

    // Walk flows for configDependencies on steps
    for (const flow of spec.flows || []) {
      for (const step of flow.steps) {
        if (step.configDependencies && step.actorQualified) {
          for (const configKey of step.configDependencies) {
            addConsumer(configConsumers, configKey, step.actorQualified);
          }
        }
      }
    }
  }

  return { configConsumers };
}

function addConsumer(map: Map<string, string[]>, key: string, qualified: string): void {
  let consumers = map.get(key);
  if (!consumers) {
    consumers = [];
    map.set(key, consumers);
  }
  if (!consumers.includes(qualified)) {
    consumers.push(qualified);
  }
}

/* ── Post-generation: enrich pages ──────────────────────────────────── */

/**
 * Links configuration properties to the members/flows that use them.
 * Mutates member page data in-place.
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
