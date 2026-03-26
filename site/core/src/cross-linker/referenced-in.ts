/**
 * Computes "Referenced In" data for member pages.
 * Uses the `member.referencedBy` fields from docspec.json and resolves them to page URLs.
 */

import type { ReferencedBy } from "../types/docspec.js";
import type {
  ReferencedInData,
  ReferencedInEntry,
  GeneratedPage,
  MemberPageData,
  ConfigurationPageData,
  FlowPageData,
} from "../types/page.js";
import { PageType } from "../types/page.js";

export function computeReferencedIn(
  referencedBy: ReferencedBy | undefined,
  referenceIndex: Record<string, string>,
  flowPages: GeneratedPage[],
  endpointPages: GeneratedPage[]
): ReferencedInData {
  const flows: ReferencedInEntry[] = [];
  const endpoints: ReferencedInEntry[] = [];
  const contexts: ReferencedInEntry[] = [];

  if (!referencedBy) {
    return { flows, endpoints, contexts };
  }

  // Resolve flow references
  if (referencedBy.flows) {
    for (const flowRef of referencedBy.flows) {
      // flowRef format: "flow-id.step-id"
      const [flowId, stepId] = flowRef.split(".");
      const flowPage = flowPages.find((p) => p.title.toLowerCase().includes(flowId.replace(/-/g, " ")));
      flows.push({
        label: flowRef,
        url: flowPage?.slug,
      });
    }
  }

  // Resolve endpoint references
  if (referencedBy.endpoints) {
    for (const epRef of referencedBy.endpoints) {
      const url = referenceIndex[epRef];
      endpoints.push({
        label: epRef,
        url,
      });
    }
  }

  // Resolve context references
  if (referencedBy.contexts) {
    for (const ctxRef of referencedBy.contexts) {
      contexts.push({
        label: ctxRef,
        url: undefined, // contexts don't have individual pages
      });
    }
  }

  return { flows, endpoints, contexts };
}

/**
 * Build a map of member qualified names to configuration keys that reference them.
 */
function buildConfigUsageMap(
  pages: GeneratedPage[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const configPages = pages.filter((p) => p.type === PageType.CONFIGURATION);

  for (const cp of configPages) {
    const configData = cp.data as ConfigurationPageData;
    for (const prop of configData.properties) {
      for (const user of prop.usedBy ?? []) {
        const existing = map.get(user) ?? [];
        existing.push(prop.key);
        map.set(user, existing);
      }
    }
  }

  return map;
}

/**
 * Build a map of member qualified names to data store operations that reference them
 * (via flow step actors whose dataStoreOps mention the member).
 */
function buildDataStoreOpRefs(
  flowPages: GeneratedPage[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const fp of flowPages) {
    const flowData = fp.data as FlowPageData;
    for (const step of flowData.flow.steps) {
      if (!step.actorQualified || !step.dataStoreOps) continue;
      for (const op of step.dataStoreOps) {
        if (op.store) {
          const existing = map.get(step.actorQualified) ?? [];
          existing.push(`${op.store}:${op.operation ?? "unknown"}`);
          map.set(step.actorQualified, existing);
        }
      }
    }
  }

  return map;
}

/**
 * Enrich all member pages with their Referenced In data.
 */
export function enrichReferencedIn(
  pages: GeneratedPage[],
  referenceIndex: Record<string, string>
): GeneratedPage[] {
  const flowPages = pages.filter((p) => p.type === PageType.FLOW);
  const endpointPages = pages.filter((p) => p.type === PageType.ENDPOINT);

  // Build additional reference maps
  const configUsageMap = buildConfigUsageMap(pages);
  const dataStoreOpRefMap = buildDataStoreOpRefs(flowPages);

  return pages.map((page) => {
    if (page.type !== PageType.MEMBER) return page;

    const data = page.data as MemberPageData;
    const referencedIn = computeReferencedIn(
      data.member.referencedBy,
      referenceIndex,
      flowPages,
      endpointPages
    );

    // Add configuration property references
    const configKeys = configUsageMap.get(data.member.qualified);
    if (configKeys && configKeys.length > 0) {
      for (const key of configKeys) {
        referencedIn.contexts.push({
          label: `config: ${key}`,
          url: referenceIndex[key],
        });
      }
    }

    // Add data store operation references from flow steps
    const storeOps = dataStoreOpRefMap.get(data.member.qualified);
    if (storeOps && storeOps.length > 0) {
      for (const opLabel of storeOps) {
        const [storeName] = opLabel.split(":");
        referencedIn.flows.push({
          label: `data-store: ${opLabel}`,
          url: referenceIndex[storeName],
        });
      }
    }

    // Only add if there's actual data
    const hasData = referencedIn.flows.length > 0 || referencedIn.endpoints.length > 0 || referencedIn.contexts.length > 0;

    return {
      ...page,
      data: {
        ...data,
        referencedIn: hasData ? referencedIn : undefined,
      },
    };
  });
}
