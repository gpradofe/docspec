/**
 * Member page generator.
 *
 * Produces a GeneratedPage for a single class / interface / enum / record /
 * annotation, including cross-reference data (flows, endpoints, contexts that
 * reference this member).
 */

import type { Member, Flow, Context, IntentGraph } from "../../types/docspec.js";
import type {
  GeneratedPage,
  MemberPageData,
  ReferencedInData,
  ReferencedInEntry,
} from "../../types/page.js";
import { PageType } from "../../types/page.js";
import { memberPageSlug, flowPageSlug, endpointPageSlug, operationsPageSlug } from "../slug.js";

export interface MemberPageInput {
  member: Member;
  moduleId: string;
  artifactLabel: string;
  artifactColor?: string;
  flows?: Flow[];
  contexts?: Context[];
  intentGraph?: IntentGraph;
}

/**
 * Build the "referenced in" sidebar data for a member by inspecting its
 * `referencedBy` field and resolving URLs for flows, endpoints, and contexts.
 */
function buildReferencedIn(
  member: Member,
  artifactLabel: string,
  flows: Flow[],
  contexts: Context[],
): ReferencedInData {
  const result: ReferencedInData = {
    flows: [],
    endpoints: [],
    contexts: [],
  };

  const refs = member.referencedBy;
  if (!refs) return result;

  // Flows — each entry is "flowId.stepId"; we link to the flow page.
  if (refs.flows) {
    for (const ref of refs.flows) {
      const flowId = ref.split(".")[0];
      const flow = flows.find((f) => f.id === flowId);
      const entry: ReferencedInEntry = {
        label: flow?.name ?? flowId,
        url: flowPageSlug(flowId),
      };
      // Avoid duplicates
      if (!result.flows.some((e) => e.url === entry.url)) {
        result.flows.push(entry);
      }
    }
  }

  // Endpoints — each entry is "METHOD /path"
  if (refs.endpoints) {
    for (const ref of refs.endpoints) {
      const parts = ref.split(" ", 2);
      if (parts.length === 2) {
        const [method, path] = parts;
        result.endpoints.push({
          label: ref,
          url: endpointPageSlug(artifactLabel, method, path),
        });
      } else {
        result.endpoints.push({ label: ref });
      }
    }
  }

  // Contexts — link to operations page
  if (refs.contexts) {
    for (const ref of refs.contexts) {
      const ctx = contexts.find((c) => c.id === ref);
      result.contexts.push({
        label: ctx?.name ?? ref,
        url: operationsPageSlug(),
      });
    }
  }

  return result;
}

export function generateMemberPage(input: MemberPageInput): GeneratedPage {
  const {
    member,
    moduleId,
    artifactLabel,
    artifactColor,
    flows = [],
    contexts = [],
    intentGraph,
  } = input;

  const referencedIn = buildReferencedIn(member, artifactLabel, flows, contexts);

  // Compute intent data per method
  const methodIntentMap: Record<string, { isd: number; signals: any; qualified: string }> = {};
  if (intentGraph?.methods) {
    for (const im of intentGraph.methods) {
      const methodName = im.qualified.split(".").pop();
      if (im.qualified.startsWith(member.qualified + ".") && methodName) {
        methodIntentMap[methodName] = {
          isd: im.intentSignals?.intentDensityScore ?? 0,
          signals: im.intentSignals,
          qualified: im.qualified,
        };
      }
    }
  }

  const data: MemberPageData = {
    type: PageType.MEMBER,
    member,
    moduleId,
    artifact: { label: artifactLabel, color: artifactColor },
    referencedIn,
    intentData: Object.keys(methodIntentMap).length > 0 ? methodIntentMap : undefined,
  };

  return {
    type: PageType.MEMBER,
    slug: memberPageSlug(artifactLabel, member.qualified),
    title: member.name,
    description: member.description,
    artifactLabel,
    artifactColor,
    data,
  };
}
