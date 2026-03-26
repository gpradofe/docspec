/**
 * Markdown export — converts DocSpec site data to a directory of markdown files.
 *
 * Produces one markdown file per page with YAML front matter for metadata, plus
 * a table-of-contents file (`_toc.md`) that links to all generated pages.
 *
 * Supports all 19+ DocSpec page types.
 */

import type {
  SiteData,
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
  IntentGraphPageData,
  TestOverviewPageData,
  GuidePageData,
  LandingPageData,
  GraphPageData,
  ChangelogPageData,
  TestDetailPageData,
  FlowTestPageData,
  GapReportPageData,
  ObservabilityPageData,
} from "../types/page.js";
import { PageType } from "../types/page.js";
import type { Member, Method, Field, FlowStep, DataModelField } from "../types/docspec.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export a fully resolved DocSpec site to a set of markdown files.
 *
 * @param siteData - The resolved site data (pages + navigation + config).
 * @param outputDir - Target directory.  Created recursively if it does not exist.
 */
export async function exportToMarkdown(
  siteData: SiteData,
  outputDir: string,
): Promise<void> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");

  await mkdir(outputDir, { recursive: true });

  const tocEntries: TocEntry[] = [];

  for (const page of siteData.pages) {
    const markdown = renderPage(page);
    const filename = slugToFilename(page.slug);
    const filePath = join(outputDir, filename);

    // Ensure subdirectories exist.
    const dirPart = filePath.substring(0, filePath.lastIndexOf("/") === -1 ? filePath.lastIndexOf("\\") : filePath.lastIndexOf("/"));
    if (dirPart && dirPart !== outputDir) {
      await mkdir(dirPart, { recursive: true });
    }

    await writeFile(filePath, markdown, "utf-8");

    tocEntries.push({
      title: page.title,
      slug: page.slug,
      type: page.type,
      filename,
    });
  }

  // Write table of contents ---
  const toc = renderTableOfContents(tocEntries, siteData.config.siteName);
  await writeFile(join(outputDir, "_toc.md"), toc, "utf-8");
}

// ---------------------------------------------------------------------------
// Page rendering dispatch
// ---------------------------------------------------------------------------

interface TocEntry {
  title: string;
  slug: string;
  type: PageType;
  filename: string;
}

function renderPage(page: GeneratedPage): string {
  const frontmatter = buildFrontMatter(page);
  const body = renderPageBody(page);
  return `${frontmatter}\n${body}\n`;
}

function buildFrontMatter(page: GeneratedPage): string {
  const lines: string[] = ["---"];
  lines.push(`title: "${escapeFmValue(page.title)}"`);
  lines.push(`type: "${page.type}"`);
  lines.push(`slug: "${page.slug}"`);
  if (page.description) {
    lines.push(`description: "${escapeFmValue(page.description)}"`);
  }
  if (page.artifactLabel) {
    lines.push(`artifact: "${escapeFmValue(page.artifactLabel)}"`);
  }
  lines.push("---");
  return lines.join("\n");
}

function renderPageBody(page: GeneratedPage): string {
  switch (page.type) {
    case PageType.LANDING:
      return renderLanding(page.data as LandingPageData);
    case PageType.GUIDE:
      return renderGuide(page.data as GuidePageData);
    case PageType.MODULE:
      return renderModule(page.data as ModulePageData);
    case PageType.MEMBER:
      return renderMember(page.data as MemberPageData);
    case PageType.ENDPOINT:
      return renderEndpoint(page.data as EndpointPageData);
    case PageType.FLOW:
      return renderFlow(page.data as FlowPageData);
    case PageType.DATA_MODEL:
      return renderDataModel(page.data as DataModelPageData);
    case PageType.ERROR_CATALOG:
      return renderErrorCatalog(page.data as ErrorCatalogPageData);
    case PageType.EVENT_CATALOG:
      return renderEventCatalog(page.data as EventCatalogPageData);
    case PageType.GRAPH:
      return renderGraph(page.data as GraphPageData);
    case PageType.OPERATIONS:
      return renderOperations(page.data as OperationsPageData);
    case PageType.CHANGELOG:
      return renderChangelog(page.data as ChangelogPageData);
    case PageType.DATA_STORE:
      return renderDataStore(page.data as DataStorePageData);
    case PageType.CONFIGURATION:
      return renderConfiguration(page.data as ConfigurationPageData);
    case PageType.SECURITY:
      return renderSecurity(page.data as SecurityPageData);
    case PageType.DEPENDENCY_MAP:
      return renderDependencyMap(page.data as DependencyMapPageData);
    case PageType.PRIVACY:
      return renderPrivacy(page.data as PrivacyPageData);
    case PageType.TEST_OVERVIEW:
      return renderTestOverview(page.data as TestOverviewPageData);
    case PageType.INTENT_GRAPH:
      return renderIntentGraph(page.data as IntentGraphPageData);
    case PageType.TEST_DETAIL:
      return renderTestDetail(page.data as TestDetailPageData);
    case PageType.FLOW_TEST:
      return renderFlowTest(page.data as FlowTestPageData);
    case PageType.GAP_REPORT:
      return renderGapReport(page.data as GapReportPageData);
    case PageType.OBSERVABILITY:
      return renderObservability(page.data as ObservabilityPageData);
    default:
      return `\n> Page type \`${page.type}\` is not yet supported for markdown export.\n`;
  }
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

function renderLanding(data: LandingPageData): string {
  const lines: string[] = [];
  lines.push("");

  if (data.artifacts.length === 0) {
    lines.push("*No artifacts found.*");
    return lines.join("\n");
  }

  lines.push("| Artifact | Modules | Members | Endpoints | Coverage |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");
  for (const a of data.artifacts) {
    const cov = a.coveragePercent !== undefined ? `${a.coveragePercent}%` : "-";
    lines.push(
      `| [${a.label}](${a.slug}) | ${a.moduleCount} | ${a.memberCount} | ${a.endpointCount} | ${cov} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Guide
// ---------------------------------------------------------------------------

function renderGuide(data: GuidePageData): string {
  return `\n${data.content}\n`;
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

function renderModule(data: ModulePageData): string {
  const lines: string[] = [];
  const mod = data.module;

  lines.push("");
  if (mod.description) lines.push(mod.description);
  lines.push("");

  if (mod.stereotype) lines.push(`**Stereotype:** ${mod.stereotype}`);
  if (mod.since) lines.push(`**Since:** ${mod.since}`);
  if (mod.audience) lines.push(`**Audience:** ${mod.audience}`);
  if (mod.framework) lines.push(`**Framework:** ${mod.framework}`);
  lines.push("");

  if (mod.members && mod.members.length > 0) {
    lines.push("## Members");
    lines.push("");
    lines.push("| Kind | Name | Description |");
    lines.push("| --- | --- | --- |");
    for (const m of mod.members) {
      lines.push(
        `| ${m.kind} | \`${m.qualified}\` | ${m.description ?? "-"} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

function renderMember(data: MemberPageData): string {
  const lines: string[] = [];
  const m = data.member;

  lines.push("");
  lines.push(`**Kind:** ${m.kind}  `);
  lines.push(`**Qualified:** \`${m.qualified}\`  `);
  if (m.visibility) lines.push(`**Visibility:** ${m.visibility}  `);
  if (m.since) lines.push(`**Since:** ${m.since}  `);
  if (m.deprecated !== undefined && m.deprecated !== null) lines.push(`**Deprecated:** ${m.deprecated}  `);
  if (m.extends) lines.push(`**Extends:** \`${m.extends}\`  `);
  if (m.implements && m.implements.length > 0) lines.push(`**Implements:** ${m.implements.map(i => `\`${i}\``).join(", ")}  `);
  if (m.typeParams && m.typeParams.length > 0) lines.push(`**Type params:** ${m.typeParams.join(", ")}  `);
  lines.push("");

  if (m.description) {
    lines.push(m.description);
    lines.push("");
  }

  // Fields table
  if (m.fields && m.fields.length > 0) {
    lines.push("### Fields");
    lines.push("");
    lines.push(...renderFieldsTable(m.fields));
    lines.push("");
  }

  // Constructors
  if (m.constructors && m.constructors.length > 0) {
    lines.push("### Constructors");
    lines.push("");
    for (const ctor of m.constructors) {
      const params = (ctor.params ?? []).map((p) => `${p.type} ${p.name}`).join(", ");
      lines.push(`- \`${m.name}(${params})\``);
      if (ctor.description) lines.push(`  ${ctor.description}`);
    }
    lines.push("");
  }

  // Methods table
  if (m.methods && m.methods.length > 0) {
    lines.push("### Methods");
    lines.push("");
    for (const method of m.methods) {
      lines.push(...renderMethodSection(method));
    }
    lines.push("");
  }

  // Enum values
  if (m.values && m.values.length > 0) {
    lines.push("### Enum Values");
    lines.push("");
    for (const v of m.values) {
      lines.push(`- \`${v}\``);
    }
    lines.push("");
  }

  // Examples
  if (m.examples && m.examples.length > 0) {
    lines.push("### Examples");
    lines.push("");
    for (const ex of m.examples) {
      if (ex.title) lines.push(`**${ex.title}**`);
      lines.push(`\`\`\`${ex.language ?? ""}`);
      lines.push(ex.code);
      lines.push("```");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function renderFieldsTable(fields: Field[]): string[] {
  const lines: string[] = [];
  lines.push("| Name | Type | Visibility | Description |");
  lines.push("| --- | --- | --- | --- |");
  for (const f of fields) {
    lines.push(
      `| \`${f.name}\` | \`${f.type}\` | ${f.visibility ?? "-"} | ${f.description ?? "-"} |`,
    );
  }
  return lines;
}

function renderMethodSection(method: Method): string[] {
  const lines: string[] = [];
  const params = (method.params ?? []).map((p) => `${p.type} ${p.name}`).join(", ");
  const returnType = method.returns?.type ?? "void";

  lines.push(`#### \`${returnType} ${method.name}(${params})\``);
  lines.push("");
  if (method.description) {
    lines.push(method.description);
    lines.push("");
  }

  if (method.params && method.params.length > 0) {
    lines.push("**Parameters:**");
    lines.push("");
    lines.push("| Name | Type | Required | Description |");
    lines.push("| --- | --- | --- | --- |");
    for (const p of method.params) {
      lines.push(
        `| \`${p.name}\` | \`${p.type}\` | ${p.required ? "Yes" : "No"} | ${p.description ?? "-"} |`,
      );
    }
    lines.push("");
  }

  if (method.returns?.description) {
    lines.push(`**Returns:** ${method.returns.description}`);
    lines.push("");
  }

  if (method.throws && method.throws.length > 0) {
    lines.push("**Throws:**");
    lines.push("");
    for (const t of method.throws) {
      lines.push(`- \`${t.type ?? "Exception"}\`: ${t.description ?? ""}`);
    }
    lines.push("");
  }

  if (method.endpointMapping) {
    const ep = method.endpointMapping;
    lines.push(`**Endpoint:** \`${ep.method ?? "GET"} ${ep.path}\``);
    lines.push("");
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

function renderEndpoint(data: EndpointPageData): string {
  const lines: string[] = [];
  const method = data.method;
  const ep = method.endpointMapping;

  lines.push("");
  if (ep) {
    lines.push(`\`${ep.method ?? "GET"} ${ep.path}\``);
    lines.push("");
  }
  lines.push(`**Declared in:** \`${data.memberQualified}#${method.name}\``);
  lines.push("");

  if (method.description) {
    lines.push(method.description);
    lines.push("");
  }

  if (method.params && method.params.length > 0) {
    lines.push("### Parameters");
    lines.push("");
    lines.push("| Name | Type | Required | Description |");
    lines.push("| --- | --- | --- | --- |");
    for (const p of method.params) {
      lines.push(
        `| \`${p.name}\` | \`${p.type}\` | ${p.required ? "Yes" : "No"} | ${p.description ?? "-"} |`,
      );
    }
    lines.push("");
  }

  if (method.returns?.type) {
    lines.push(`### Response`);
    lines.push("");
    lines.push(`**Type:** \`${method.returns.type}\``);
    if (method.returns.description) lines.push(`  ${method.returns.description}`);
    lines.push("");
  }

  if (method.errorConditions && method.errorConditions.length > 0) {
    lines.push("### Error Conditions");
    lines.push("");
    for (const ec of method.errorConditions) {
      lines.push(
        `- \`${ec.type ?? "error"}\`${ec.code ? ` [${ec.code}]` : ""}: ${ec.description ?? ""}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

function renderFlow(data: FlowPageData): string {
  const lines: string[] = [];
  const flow = data.flow;

  lines.push("");
  if (flow.description) {
    lines.push(flow.description);
    lines.push("");
  }
  if (flow.trigger) {
    lines.push(`**Trigger:** ${flow.trigger}`);
    lines.push("");
  }

  if (flow.steps.length > 0) {
    lines.push("### Steps");
    lines.push("");
    for (const step of flow.steps) {
      lines.push(...renderFlowStep(step));
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderFlowStep(step: FlowStep): string[] {
  const lines: string[] = [];
  const label = step.name ?? step.actor ?? "Step";
  lines.push(`**${step.id}. ${label}**`);
  if (step.actor) lines.push(`  Actor: \`${step.actor}\``);
  if (step.description) lines.push(`  ${step.description}`);
  if (step.type) lines.push(`  Type: ${step.type}`);
  if (step.inputs && step.inputs.length > 0) lines.push(`  Inputs: ${step.inputs.join(", ")}`);
  if (step.outputs && step.outputs.length > 0) lines.push(`  Outputs: ${step.outputs.join(", ")}`);
  lines.push("");
  return lines;
}

// ---------------------------------------------------------------------------
// Data Model
// ---------------------------------------------------------------------------

function renderDataModel(data: DataModelPageData): string {
  const lines: string[] = [];
  const dm = data.dataModel;

  lines.push("");
  if (dm.description) lines.push(dm.description);
  lines.push("");
  if (dm.table) lines.push(`**Table:** \`${dm.table}\``);
  if (dm.discoveredFrom) lines.push(`**Discovered from:** ${dm.discoveredFrom}`);
  lines.push("");

  if (dm.fields && dm.fields.length > 0) {
    lines.push("### Fields");
    lines.push("");
    lines.push(...renderDataModelFieldsTable(dm.fields));
    lines.push("");
  }

  if (dm.relationships && dm.relationships.length > 0) {
    lines.push("### Relationships");
    lines.push("");
    for (const rel of dm.relationships) {
      lines.push(
        `- **${rel.type}** -> \`${rel.target}\`${rel.field ? ` (field: ${rel.field})` : ""}${rel.cascade ? ` [cascade: ${rel.cascade}]` : ""}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderDataModelFieldsTable(fields: DataModelField[]): string[] {
  const lines: string[] = [];
  lines.push("| Name | Type | PK | Nullable | Description |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const f of fields) {
    lines.push(
      `| \`${f.name}\` | \`${f.type}\` | ${f.primaryKey ? "Yes" : "-"} | ${f.nullable === false ? "No" : "Yes"} | ${f.description ?? "-"} |`,
    );
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Error Catalog
// ---------------------------------------------------------------------------

function renderErrorCatalog(data: ErrorCatalogPageData): string {
  const lines: string[] = [];
  lines.push("");

  if (data.errors.length === 0) {
    lines.push("*No errors defined.*");
    return lines.join("\n");
  }

  lines.push("| Code | HTTP Status | Description | Resolution |");
  lines.push("| --- | ---: | --- | --- |");
  for (const err of data.errors) {
    lines.push(
      `| \`${err.code}\` | ${err.httpStatus ?? "-"} | ${err.description ?? "-"} | ${err.resolution ?? "-"} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Event Catalog
// ---------------------------------------------------------------------------

function renderEventCatalog(data: EventCatalogPageData): string {
  const lines: string[] = [];
  lines.push("");

  for (const evt of data.events) {
    lines.push(`### ${evt.name}`);
    lines.push("");
    if (evt.description) lines.push(evt.description);
    if (evt.trigger) lines.push(`**Trigger:** ${evt.trigger}`);
    if (evt.channel) lines.push(`**Channel:** ${evt.channel}`);
    if (evt.deliveryGuarantee) lines.push(`**Delivery:** ${evt.deliveryGuarantee}`);
    if (evt.payload?.fields && evt.payload.fields.length > 0) {
      lines.push("");
      lines.push("| Field | Type | Description |");
      lines.push("| --- | --- | --- |");
      for (const f of evt.payload.fields) {
        lines.push(`| \`${f.name}\` | \`${f.type}\` | ${f.description ?? "-"} |`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

function renderGraph(data: GraphPageData): string {
  const lines: string[] = [];
  lines.push("");

  if (data.nodes.length > 0) {
    lines.push("### Nodes");
    lines.push("");
    lines.push("| ID | Label | Type |");
    lines.push("| --- | --- | --- |");
    for (const n of data.nodes) {
      lines.push(`| \`${n.id}\` | ${n.label} | ${n.type} |`);
    }
    lines.push("");
  }

  if (data.edges.length > 0) {
    lines.push("### Edges");
    lines.push("");
    lines.push("| Source | Target | Label |");
    lines.push("| --- | --- | --- |");
    for (const e of data.edges) {
      lines.push(`| \`${e.source}\` | \`${e.target}\` | ${e.label ?? "-"} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

function renderOperations(data: OperationsPageData): string {
  const lines: string[] = [];
  lines.push("");

  for (const ctxMeta of data.contexts) {
    const ctx = ctxMeta.context;
    lines.push(`### ${ctx.name ?? ctx.id}`);
    lines.push("");
    if (ctx.attachedTo) lines.push(`**Attached to:** \`${ctx.attachedTo}\``);
    if (ctx.flow) lines.push(`**Flow:** ${ctx.flow}`);
    if (ctx.schedule) {
      const s = ctx.schedule;
      lines.push(`**Schedule:** ${s.type ?? ""}${s.cron ? ` \`${s.cron}\`` : ""}${s.interval ? ` (${s.interval})` : ""}`);
    }
    if (ctx.inputs && ctx.inputs.length > 0) {
      lines.push("");
      lines.push("**Inputs:**");
      for (const input of ctx.inputs) {
        lines.push(`- ${input.name}${input.source ? ` (from: ${input.source})` : ""}${input.description ? `: ${input.description}` : ""}`);
      }
    }
    if (ctx.uses && ctx.uses.length > 0) {
      lines.push("");
      lines.push("**Uses:**");
      for (const use of ctx.uses) {
        lines.push(`- ${use.artifact}: ${use.what}${use.why ? ` -- ${use.why}` : ""}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Changelog
// ---------------------------------------------------------------------------

function renderChangelog(data: ChangelogPageData): string {
  if (data.entries.length === 0) return "\n*No changelog entries.*\n";

  const lines: string[] = [];
  lines.push("");
  for (const entry of data.entries) {
    lines.push(`- ${JSON.stringify(entry)}`);
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Data Store
// ---------------------------------------------------------------------------

function renderDataStore(data: DataStorePageData): string {
  const lines: string[] = [];
  lines.push("");

  for (const store of data.dataStores) {
    lines.push(`### ${store.name ?? store.id}`);
    lines.push("");
    lines.push(`**Type:** ${store.type}`);
    if (store.tables && store.tables.length > 0) lines.push(`**Tables:** ${store.tables.join(", ")}`);
    if (store.migrationTool) lines.push(`**Migration tool:** ${store.migrationTool}`);

    if (store.topics && store.topics.length > 0) {
      lines.push("");
      lines.push("**Topics:**");
      lines.push("");
      lines.push("| Name | Partition Key | Description |");
      lines.push("| --- | --- | --- |");
      for (const t of store.topics) {
        lines.push(`| \`${t.name}\` | ${t.partitionKey ?? "-"} | ${t.description ?? "-"} |`);
      }
    }

    if (store.keyPatterns && store.keyPatterns.length > 0) {
      lines.push("");
      lines.push("**Key Patterns:**");
      lines.push("");
      for (const kp of store.keyPatterns) {
        lines.push(`- \`${kp.pattern}\`${kp.ttl ? ` (TTL: ${kp.ttl})` : ""}${kp.description ? `: ${kp.description}` : ""}`);
      }
    }

    if (store.migrations && store.migrations.length > 0) {
      lines.push("");
      lines.push("**Migrations:**");
      lines.push("");
      lines.push("| Version | Description | Date |");
      lines.push("| --- | --- | --- |");
      for (const m of store.migrations) {
        lines.push(`| ${m.version} | ${m.description ?? "-"} | ${m.date ?? "-"} |`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function renderConfiguration(data: ConfigurationPageData): string {
  const lines: string[] = [];
  lines.push("");

  if (data.properties.length === 0) {
    lines.push("*No configuration properties defined.*");
    return lines.join("\n");
  }

  lines.push("| Key | Type | Default | Source | Description |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const prop of data.properties) {
    lines.push(
      `| \`${prop.key}\` | ${prop.type ?? "-"} | ${prop.default ?? "-"} | ${prop.source ?? "-"} | ${prop.description ?? "-"} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

function renderSecurity(data: SecurityPageData): string {
  const lines: string[] = [];
  const sec = data.security;

  lines.push("");
  if (sec.authMechanism) lines.push(`**Auth mechanism:** ${sec.authMechanism}`);
  if (sec.roles && sec.roles.length > 0) lines.push(`**Roles:** ${sec.roles.join(", ")}`);
  if (sec.scopes && sec.scopes.length > 0) lines.push(`**Scopes:** ${sec.scopes.join(", ")}`);
  lines.push("");

  if (sec.endpoints && sec.endpoints.length > 0) {
    lines.push("### Endpoint Rules");
    lines.push("");
    lines.push("| Path | Public | Rules | Rate Limit |");
    lines.push("| --- | --- | --- | --- |");
    for (const rule of sec.endpoints) {
      const rl = rule.rateLimit
        ? `${rule.rateLimit.requests ?? "?"} / ${rule.rateLimit.window ?? "?"}`
        : "-";
      lines.push(
        `| \`${rule.path}\` | ${rule.public ? "Yes" : "No"} | ${rule.rules?.join(", ") ?? "-"} | ${rl} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Dependency Map
// ---------------------------------------------------------------------------

function renderDependencyMap(data: DependencyMapPageData): string {
  const lines: string[] = [];
  lines.push("");

  for (const dep of data.dependencies) {
    lines.push(`### ${dep.name}`);
    lines.push("");
    if (dep.baseUrl) lines.push(`**Base URL:** ${dep.baseUrl}`);
    if (dep.auth) lines.push(`**Auth:** ${dep.auth}`);
    if (dep.sla) lines.push(`**SLA:** ${dep.sla}`);
    if (dep.fallback) lines.push(`**Fallback:** ${dep.fallback}`);
    if (dep.rateLimit) {
      lines.push(`**Rate limit:** ${dep.rateLimit.requests ?? "?"} / ${dep.rateLimit.window ?? "?"}`);
    }

    if (dep.endpoints && dep.endpoints.length > 0) {
      lines.push("");
      lines.push("| Method | Path | Used By |");
      lines.push("| --- | --- | --- |");
      for (const ep of dep.endpoints) {
        lines.push(
          `| ${ep.method ?? "GET"} | ${ep.path ?? "/"} | ${ep.usedBy?.join(", ") ?? "-"} |`,
        );
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

function renderPrivacy(data: PrivacyPageData): string {
  const lines: string[] = [];
  lines.push("");

  if (data.fields.length === 0) {
    lines.push("*No PII fields declared.*");
    return lines.join("\n");
  }

  lines.push("| Field | PII Type | Retention | Encrypted | Never Log |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const f of data.fields) {
    lines.push(
      `| \`${f.field}\` | ${f.piiType} | ${f.retention ?? "-"} | ${f.encrypted ? "Yes" : "No"} | ${f.neverLog ? "Yes" : "No"} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Test Overview
// ---------------------------------------------------------------------------

function renderTestOverview(data: TestOverviewPageData): string {
  const lines: string[] = [];
  lines.push("");

  const graph = data.intentGraph;
  if (!graph.methods || graph.methods.length === 0) {
    lines.push("*No intent analysis data available.*");
    return lines.join("\n");
  }

  lines.push("| Method | Intent | ISD Score |");
  lines.push("| --- | --- | ---: |");
  for (const m of graph.methods) {
    const intent = m.intentSignals?.nameSemantics?.intent ?? "-";
    const isd = m.intentSignals?.intentDensityScore?.toFixed(2) ?? "-";
    lines.push(`| \`${m.qualified}\` | ${intent} | ${isd} |`);
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Intent Graph
// ---------------------------------------------------------------------------

function renderIntentGraph(data: IntentGraphPageData): string {
  const lines: string[] = [];
  lines.push("");

  const graph = data.intentGraph;
  if (!graph.methods || graph.methods.length === 0) {
    lines.push("*No intent graph data.*");
    return lines.join("\n");
  }

  for (const m of graph.methods) {
    lines.push(`### \`${m.qualified}\``);
    lines.push("");
    if (m.intentSignals) {
      const sig = m.intentSignals;
      if (sig.nameSemantics?.intent) lines.push(`**Intent:** ${sig.nameSemantics.intent}`);
      if (sig.nameSemantics?.verb) lines.push(`**Verb:** ${sig.nameSemantics.verb}`);
      if (sig.nameSemantics?.object) lines.push(`**Object:** ${sig.nameSemantics.object}`);
      if (sig.intentDensityScore !== undefined) lines.push(`**ISD Score:** ${sig.intentDensityScore.toFixed(2)}`);
      if (sig.guardClauses !== undefined) lines.push(`**Guard clauses:** ${sig.guardClauses}`);
      if (sig.branches !== undefined) lines.push(`**Branches:** ${sig.branches}`);
      if (sig.nullChecks !== undefined) lines.push(`**Null checks:** ${sig.nullChecks}`);
      if (sig.logStatements !== undefined) lines.push(`**Log statements:** ${sig.logStatements}`);
      if (sig.dataFlow) {
        if (sig.dataFlow.reads?.length) lines.push(`**Reads:** ${sig.dataFlow.reads.join(", ")}`);
        if (sig.dataFlow.writes?.length) lines.push(`**Writes:** ${sig.dataFlow.writes.join(", ")}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Test Detail
// ---------------------------------------------------------------------------

function renderTestDetail(data: TestDetailPageData): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`**Class:** \`${data.className}\``);
  lines.push("");

  if (data.methods.length === 0) {
    lines.push("*No test methods.*");
    return lines.join("\n");
  }

  lines.push("| Method | Intent | ISD |");
  lines.push("| --- | --- | ---: |");
  for (const m of data.methods) {
    const intent = m.intentSignals?.nameSemantics?.intent ?? "-";
    const isd = m.intentSignals?.intentDensityScore?.toFixed(2) ?? "-";
    lines.push(`| \`${m.qualified}\` | ${intent} | ${isd} |`);
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Flow Test
// ---------------------------------------------------------------------------

function renderFlowTest(data: FlowTestPageData): string {
  const lines: string[] = [];
  const flow = data.flow;
  lines.push("");
  if (flow.description) lines.push(flow.description);
  lines.push("");

  if (flow.steps.length > 0) {
    lines.push("### Steps");
    lines.push("");
    for (const step of flow.steps) {
      lines.push(`- **${step.id}** ${step.name ?? step.actor ?? "step"}: ${step.description ?? ""}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Gap Report
// ---------------------------------------------------------------------------

function renderGapReport(_data: GapReportPageData): string {
  return "\n*Gap report rendering is a placeholder.*\n";
}

// ---------------------------------------------------------------------------
// Observability
// ---------------------------------------------------------------------------

function renderObservability(data: ObservabilityPageData): string {
  const lines: string[] = [];
  const obs = data.observability;
  lines.push("");

  if (obs.metrics && obs.metrics.length > 0) {
    lines.push("### Metrics");
    lines.push("");
    lines.push("| Name | Type | Labels |");
    lines.push("| --- | --- | --- |");
    for (const m of obs.metrics) {
      lines.push(`| \`${m.name}\` | ${m.type} | ${m.labels?.join(", ") ?? "-"} |`);
    }
    lines.push("");
  }

  if (obs.healthChecks && obs.healthChecks.length > 0) {
    lines.push("### Health Checks");
    lines.push("");
    for (const hc of obs.healthChecks) {
      lines.push(`- \`${hc.path ?? "/health"}\`: ${hc.checks?.join(", ") ?? "default"}`);
    }
    lines.push("");
  }

  if (obs.traces && obs.traces.length > 0) {
    lines.push("### Traces");
    lines.push("");
    lines.push("| Span | Service | Parent |");
    lines.push("| --- | --- | --- |");
    for (const t of obs.traces) {
      lines.push(`| \`${t.spanName}\` | ${t.service ?? "-"} | ${t.parentSpan ?? "-"} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Table of Contents
// ---------------------------------------------------------------------------

function renderTableOfContents(entries: TocEntry[], siteName: string): string {
  const lines: string[] = [];

  lines.push(`# ${siteName} -- Table of Contents`);
  lines.push("");

  // Group by page type.
  const grouped = new Map<string, TocEntry[]>();
  for (const entry of entries) {
    const group = grouped.get(entry.type) ?? [];
    group.push(entry);
    grouped.set(entry.type, group);
  }

  for (const [type, group] of grouped) {
    lines.push(`## ${pageTypeLabel(type)}`);
    lines.push("");
    for (const entry of group) {
      lines.push(`- [${entry.title}](${entry.filename})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function slugToFilename(slug: string): string {
  if (!slug || slug === "/") return "index.md";
  // Normalise separators.
  const clean = slug.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");
  return `${clean}.md`;
}

function escapeFmValue(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\n/g, " ");
}

function pageTypeLabel(type: string): string {
  return type
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
