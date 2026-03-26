/**
 * Search index builder
 *
 * Builds a flat array of SearchEntry objects from generated pages.
 * The output is designed to be serialized to JSON and consumed by
 * a client-side FlexSearch instance in the Next.js app.
 */

import type {
  GeneratedPage,
  ModulePageData,
  MemberPageData,
  EndpointPageData,
  FlowPageData,
  DataModelPageData,
  ErrorCatalogPageData,
  EventCatalogPageData,
  OperationsPageData,
  DataStorePageData,
  ConfigurationPageData,
  SecurityPageData,
  DependencyMapPageData,
  PrivacyPageData,
  TestOverviewPageData,
  IntentGraphPageData,
} from "../types/page.js";
import { PageType } from "../types/page.js";

export interface SearchEntry {
  slug: string;
  title: string;
  type: string;
  description: string;
  keywords: string[];
  artifact?: string;
}

/**
 * Build a search index from generated pages.
 *
 * Iterates through every page, extracts searchable text based on the page
 * type, and returns a flat array suitable for client-side indexing.
 */
export function buildSearchIndex(pages: GeneratedPage[]): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const page of pages) {
    const entry = buildEntry(page);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildEntry(page: GeneratedPage): SearchEntry | null {
  const base: Pick<SearchEntry, "slug" | "title" | "type"> = {
    slug: page.slug,
    title: page.title,
    type: page.type,
  };

  switch (page.type) {
    case PageType.MODULE:
      return buildModuleEntry(base, page.data as ModulePageData);

    case PageType.MEMBER:
      return buildMemberEntry(base, page.data as MemberPageData);

    case PageType.ENDPOINT:
      return buildEndpointEntry(base, page.data as EndpointPageData);

    case PageType.FLOW:
      return buildFlowEntry(base, page.data as FlowPageData);

    case PageType.DATA_MODEL:
      return buildDataModelEntry(base, page.data as DataModelPageData);

    case PageType.ERROR_CATALOG:
      return buildErrorCatalogEntry(base, page.data as ErrorCatalogPageData);

    case PageType.EVENT_CATALOG:
      return buildEventCatalogEntry(base, page.data as EventCatalogPageData);

    case PageType.OPERATIONS:
      return buildOperationsEntry(base, page.data as OperationsPageData);

    case PageType.DATA_STORE:
      return buildDataStoreEntry(base, page.data as DataStorePageData);

    case PageType.CONFIGURATION:
      return buildConfigurationEntry(base, page.data as ConfigurationPageData);

    case PageType.SECURITY:
      return buildSecurityEntry(base, page.data as SecurityPageData);

    case PageType.DEPENDENCY_MAP:
      return buildDependencyMapEntry(base, page.data as DependencyMapPageData);

    case PageType.PRIVACY:
      return buildPrivacyEntry(base, page.data as PrivacyPageData);

    case PageType.TEST_OVERVIEW:
      return buildTestOverviewEntry(base, page.data as TestOverviewPageData);

    case PageType.INTENT_GRAPH:
      return buildIntentGraphEntry(base, page.data as IntentGraphPageData);

    default:
      // LANDING, GUIDE, GRAPH, CHANGELOG, and any future types
      return {
        ...base,
        description: page.description ?? "",
        keywords: extractKeywords(page.title),
        artifact: page.artifactLabel,
      };
  }
}

// -- Per-type builders ------------------------------------------------------

function buildModuleEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: ModulePageData,
): SearchEntry {
  const mod = data.module;
  const description = mod.description ?? "";
  const keywords = [
    ...extractKeywords(base.title),
    ...extractKeywords(mod.id),
  ];

  return {
    ...base,
    description,
    keywords: dedup(keywords),
    artifact: data.artifact.label,
  };
}

function buildMemberEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: MemberPageData,
): SearchEntry {
  const member = data.member;
  const description = member.description ?? "";
  const keywords = [
    ...extractKeywords(base.title),
    ...extractKeywords(member.qualified),
    member.kind,
  ];

  return {
    ...base,
    description,
    keywords: dedup(keywords),
    artifact: data.artifact.label,
  };
}

function buildEndpointEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: EndpointPageData,
): SearchEntry {
  const method = data.method;
  const mapping = method.endpointMapping;
  const httpMethod = mapping?.method ?? "";
  const path = mapping?.path ?? "";
  const description =
    mapping?.description ?? method.description ?? "";
  const keywords = [
    ...extractKeywords(base.title),
    ...extractKeywords(data.memberQualified),
    httpMethod,
    path,
  ].filter(Boolean);

  return {
    ...base,
    title: httpMethod && path ? `${httpMethod} ${path}` : base.title,
    description,
    keywords: dedup(keywords),
    artifact: data.artifact.label,
  };
}

function buildFlowEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: FlowPageData,
): SearchEntry {
  const flow = data.flow;
  const description = flow.description ?? "";
  const stepDescriptions = (flow.steps ?? [])
    .map((s) => s.description ?? s.name ?? "")
    .filter(Boolean);
  const keywords = [
    ...extractKeywords(base.title),
    ...extractKeywords(flow.id),
    ...stepDescriptions,
  ];

  return {
    ...base,
    description,
    keywords: dedup(keywords),
    artifact: data.artifact.label,
  };
}

function buildDataModelEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: DataModelPageData,
): SearchEntry {
  const dm = data.dataModel;
  const description = dm.description ?? "";
  const keywords = [
    ...extractKeywords(base.title),
    ...extractKeywords(dm.qualified),
    dm.table ?? "",
    dm.name,
  ].filter(Boolean);

  return {
    ...base,
    description,
    keywords: dedup(keywords),
    artifact: data.artifact.label,
  };
}

function buildErrorCatalogEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: ErrorCatalogPageData,
): SearchEntry {
  const errors = data.errors ?? [];
  const codes = errors.map((e) => e.code);
  const descriptions = errors
    .map((e) => e.description ?? "")
    .filter(Boolean);
  const description = descriptions.join(" ");

  return {
    ...base,
    description,
    keywords: dedup([...extractKeywords(base.title), ...codes]),
    artifact: data.artifact.label,
  };
}

function buildEventCatalogEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: EventCatalogPageData,
): SearchEntry {
  const events = data.events ?? [];
  const names = events.map((e) => e.name);
  const descriptions = events
    .map((e) => e.description ?? "")
    .filter(Boolean);
  const description = descriptions.join(" ");

  return {
    ...base,
    description,
    keywords: dedup([...extractKeywords(base.title), ...names]),
    artifact: data.artifact.label,
  };
}

function buildOperationsEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: OperationsPageData,
): SearchEntry {
  const contextNames = (data.contexts ?? [])
    .map((c) => c.context.name ?? c.context.id)
    .filter(Boolean);
  const description = contextNames.join(", ");

  return {
    ...base,
    description,
    keywords: dedup([...extractKeywords(base.title), ...contextNames]),
  };
}

function buildDataStoreEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: DataStorePageData,
): SearchEntry {
  const stores = data.dataStores ?? [];
  const names = stores.map((s) => s.name ?? s.id).filter(Boolean);
  const tables = stores.flatMap((s) => s.tables ?? []);
  const topics = stores.flatMap((s) => (s.topics ?? []).map((t) => t.name));
  const description = names.join(", ");

  return {
    ...base,
    description,
    keywords: dedup([
      ...extractKeywords(base.title),
      ...names,
      ...tables,
      ...topics,
    ]),
    artifact: data.artifact.label,
  };
}

function buildConfigurationEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: ConfigurationPageData,
): SearchEntry {
  const props = data.properties ?? [];
  const keys = props.map((p) => p.key);
  const descriptions = props
    .map((p) => p.description ?? "")
    .filter(Boolean);
  const description = descriptions.join(" ");

  return {
    ...base,
    description,
    keywords: dedup([...extractKeywords(base.title), ...keys]),
    artifact: data.artifact.label,
  };
}

function buildSecurityEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: SecurityPageData,
): SearchEntry {
  const sec = data.security;
  const keywords = [
    ...extractKeywords(base.title),
    sec.authMechanism ?? "",
    ...(sec.roles ?? []),
    ...(sec.scopes ?? []),
  ].filter(Boolean);
  const description = sec.authMechanism
    ? `Auth: ${sec.authMechanism}`
    : "";

  return {
    ...base,
    description,
    keywords: dedup(keywords),
    artifact: data.artifact.label,
  };
}

function buildDependencyMapEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: DependencyMapPageData,
): SearchEntry {
  const deps = data.dependencies ?? [];
  const names = deps.map((d) => d.name);
  const baseUrls = deps
    .map((d) => d.baseUrl ?? "")
    .filter(Boolean);
  const description = names.join(", ");

  return {
    ...base,
    description,
    keywords: dedup([
      ...extractKeywords(base.title),
      ...names,
      ...baseUrls,
    ]),
    artifact: data.artifact.label,
  };
}

function buildPrivacyEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: PrivacyPageData,
): SearchEntry {
  const fields = data.fields ?? [];
  const fieldNames = fields.map((f) => f.field);
  const piiTypes = fields
    .map((f) => f.piiType ?? "")
    .filter(Boolean);
  const description = piiTypes.length > 0
    ? `PII types: ${[...new Set(piiTypes)].join(", ")}`
    : "";

  return {
    ...base,
    description,
    keywords: dedup([
      ...extractKeywords(base.title),
      ...fieldNames,
      ...piiTypes,
    ]),
    artifact: data.artifact.label,
  };
}

function buildTestOverviewEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: TestOverviewPageData,
): SearchEntry {
  const methods = data.intentGraph?.methods ?? [];
  const methodNames = methods.map((m) => m.qualified);
  const description = `${methods.length} test methods`;

  return {
    ...base,
    description,
    keywords: dedup([
      ...extractKeywords(base.title),
      ...methodNames.flatMap((n) => extractKeywords(n)),
    ]),
    artifact: data.artifact.label,
  };
}

function buildIntentGraphEntry(
  base: Pick<SearchEntry, "slug" | "title" | "type">,
  data: IntentGraphPageData,
): SearchEntry {
  const methods = data.intentGraph?.methods ?? [];
  const methodNames = methods.map((m) => m.qualified);
  const intentVerbs = methods
    .map((m) => m.intentSignals?.nameSemantics?.verb ?? "")
    .filter(Boolean);
  const description = intentVerbs.length > 0
    ? `Intents: ${[...new Set(intentVerbs)].join(", ")}`
    : "";

  return {
    ...base,
    description,
    keywords: dedup([
      ...extractKeywords(base.title),
      ...methodNames.flatMap((n) => extractKeywords(n)),
      ...intentVerbs,
    ]),
    artifact: data.artifact.label,
  };
}

// -- Keyword extraction -----------------------------------------------------

/**
 * Extract keywords from a string by splitting on dots, slashes, hyphens,
 * and camelCase / PascalCase boundaries.
 *
 * Example:
 *   "com.example.MyService" -> ["com", "example", "My", "Service", "my", "service"]
 */
function extractKeywords(input: string | undefined | null): string[] {
  if (!input) return [];

  // Split on common separators: dots, slashes, hyphens, underscores, spaces
  const parts = input.split(/[./\-_\s]+/).filter(Boolean);

  const words: string[] = [];
  for (const part of parts) {
    words.push(part);

    // Split camelCase / PascalCase into individual words
    const camelParts = part
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .split(/\s+/);

    if (camelParts.length > 1) {
      for (const cp of camelParts) {
        words.push(cp.toLowerCase());
      }
    }
  }

  return words.filter(Boolean);
}

/**
 * Remove duplicate strings (case-insensitive) while preserving order.
 */
function dedup(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const lower = item.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(item);
    }
  }
  return result;
}
