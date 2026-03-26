/**
 * Generates llms-full.txt -- a comprehensive, LLM-optimized documentation dump.
 * Includes ALL details: every field, parameter description, example code,
 * error codes, events, data models, configuration properties, security rules,
 * privacy fields, dependencies, observability, and more.
 */

import type {
  GeneratedPage,
  ModulePageData,
  MemberPageData,
  EndpointPageData,
  FlowPageData,
  ErrorCatalogPageData,
  EventCatalogPageData,
  DataModelPageData,
  OperationsPageData,
  DataStorePageData,
  ConfigurationPageData,
  SecurityPageData,
  DependencyMapPageData,
  PrivacyPageData,
  IntentGraphPageData,
} from "../types/page.js";
import { PageType } from "../types/page.js";
import type {
  Member,
  Method,
  Field,
  Constructor,
  DataModelField,
  DataModelRelationship,
  FlowStep,
  ContextInput,
  ContextUses,
} from "../types/docspec.js";

export function generateLlmsFullTxt(pages: GeneratedPage[], siteName: string): string {
  const lines: string[] = [];

  lines.push(`# ${siteName}`);
  lines.push("");
  lines.push("> This file contains the complete documentation for use by LLMs.");
  lines.push("> It includes all details: parameters, fields, examples, error codes, events,");
  lines.push("> data models, configuration, security, privacy, and more.");
  lines.push("");

  // Group pages by type
  const modules = pages.filter(p => p.type === PageType.MODULE);
  const members = pages.filter(p => p.type === PageType.MEMBER);
  const endpoints = pages.filter(p => p.type === PageType.ENDPOINT);
  const flows = pages.filter(p => p.type === PageType.FLOW);
  const dataModels = pages.filter(p => p.type === PageType.DATA_MODEL);
  const errorCatalogs = pages.filter(p => p.type === PageType.ERROR_CATALOG);
  const eventCatalogs = pages.filter(p => p.type === PageType.EVENT_CATALOG);
  const operations = pages.filter(p => p.type === PageType.OPERATIONS);
  const dataStores = pages.filter(p => p.type === PageType.DATA_STORE);
  const configurations = pages.filter(p => p.type === PageType.CONFIGURATION);
  const securityPages = pages.filter(p => p.type === PageType.SECURITY);
  const dependencyMaps = pages.filter(p => p.type === PageType.DEPENDENCY_MAP);
  const privacyPages = pages.filter(p => p.type === PageType.PRIVACY);
  const intentGraphs = pages.filter(p => p.type === PageType.INTENT_GRAPH);

  // -------------------------------------------------------------------------
  // Modules
  // -------------------------------------------------------------------------
  if (modules.length > 0) {
    lines.push("## Modules");
    lines.push("");
    for (const page of modules) {
      const data = page.data as ModulePageData;
      const mod = data.module;
      lines.push(`### ${mod.name ?? mod.id}`);
      lines.push(`ID: ${mod.id}`);
      if (mod.description) lines.push(`Description: ${mod.description}`);
      if (mod.stereotype) lines.push(`Stereotype: ${mod.stereotype}`);
      if (mod.since) lines.push(`Since: ${mod.since}`);
      if (mod.audience) lines.push(`Audience: ${mod.audience}`);
      if (mod.discoveredFrom) lines.push(`Discovered from: ${mod.discoveredFrom}`);
      if (mod.framework) lines.push(`Framework: ${mod.framework}`);
      const memberCount = mod.members?.length ?? 0;
      lines.push(`Members: ${memberCount}`);
      if (mod.members && mod.members.length > 0) {
        lines.push("Member list:");
        for (const m of mod.members) {
          lines.push(`  - ${m.qualified} (${m.kind})`);
        }
      }
      lines.push("");
    }
  }

  // -------------------------------------------------------------------------
  // Members (classes, interfaces, etc.)
  // -------------------------------------------------------------------------
  if (members.length > 0) {
    lines.push("## Classes & Interfaces");
    lines.push("");
    for (const page of members) {
      const data = page.data as MemberPageData;
      emitMemberFull(lines, data.member);
      lines.push("");
    }
  }

  // -------------------------------------------------------------------------
  // Endpoints
  // -------------------------------------------------------------------------
  if (endpoints.length > 0) {
    lines.push("## API Endpoints");
    lines.push("");
    for (const page of endpoints) {
      const data = page.data as EndpointPageData;
      const method = data.method;
      const ep = method.endpointMapping;
      if (ep) {
        lines.push(`### ${ep.method ?? "GET"} ${ep.path}`);
        if (ep.description) lines.push(`Endpoint description: ${ep.description}`);
        if (method.description) lines.push(`Method description: ${method.description}`);
        lines.push(`Declared in: ${data.memberQualified}#${method.name}`);

        emitMethodFull(lines, method, "  ");
        lines.push("");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Flows
  // -------------------------------------------------------------------------
  if (flows.length > 0) {
    lines.push("## Flows");
    lines.push("");
    for (const page of flows) {
      const data = page.data as FlowPageData;
      const flow = data.flow;
      lines.push(`### ${flow.name ?? flow.id}`);
      lines.push(`ID: ${flow.id}`);
      if (flow.description) lines.push(`Description: ${flow.description}`);
      if (flow.trigger) lines.push(`Trigger: ${flow.trigger}`);

      lines.push("Steps:");
      for (const step of flow.steps) {
        emitFlowStepFull(lines, step);
      }

      // Trace view if available
      if (data.traceView && data.traceView.length > 0) {
        lines.push("Trace view:");
        for (const trace of data.traceView) {
          const indent = "  ".repeat(trace.depth + 1);
          lines.push(`${indent}${trace.actor}${trace.actorQualified ? ` (${trace.actorQualified})` : ""}${trace.description ? `: ${trace.description}` : ""}`);
        }
      }
      lines.push("");
    }
  }

  // -------------------------------------------------------------------------
  // Data Models
  // -------------------------------------------------------------------------
  if (dataModels.length > 0) {
    lines.push("## Data Models");
    lines.push("");
    for (const page of dataModels) {
      const data = page.data as DataModelPageData;
      const dm = data.dataModel;
      lines.push(`### ${dm.name}`);
      lines.push(`Qualified: ${dm.qualified}`);
      if (dm.description) lines.push(`Description: ${dm.description}`);
      if (dm.table) lines.push(`Table: ${dm.table}`);
      if (dm.discoveredFrom) lines.push(`Discovered from: ${dm.discoveredFrom}`);

      // Fields
      if (dm.fields && dm.fields.length > 0) {
        lines.push("Fields:");
        for (const f of dm.fields) {
          emitDataModelField(lines, f);
        }
      }

      // Relationships
      if (dm.relationships && dm.relationships.length > 0) {
        lines.push("Relationships:");
        for (const rel of dm.relationships) {
          emitRelationship(lines, rel);
        }
      }

      // JSON shape
      if (dm.jsonShape) {
        lines.push("JSON shape:");
        if (dm.jsonShape.description) lines.push(`  Description: ${dm.jsonShape.description}`);
        if (dm.jsonShape.fields) {
          for (const f of dm.jsonShape.fields) {
            lines.push(`  - ${f.jsonProperty ?? f.name}: ${f.type}${f.description ? ` -- ${f.description}` : ""}`);
            if (f.enum && f.enum.length > 0) {
              lines.push(`    Enum: [${f.enum.join(", ")}]`);
            }
          }
        }
      }

      // Used by
      if (dm.usedBy) {
        if (dm.usedBy.endpoints && dm.usedBy.endpoints.length > 0) {
          lines.push(`Used by endpoints: ${dm.usedBy.endpoints.join(", ")}`);
        }
        if (dm.usedBy.repositories && dm.usedBy.repositories.length > 0) {
          lines.push(`Used by repositories: ${dm.usedBy.repositories.join(", ")}`);
        }
      }
      lines.push("");
    }
  }

  // -------------------------------------------------------------------------
  // Error Catalog
  // -------------------------------------------------------------------------
  if (errorCatalogs.length > 0) {
    lines.push("## Error Codes");
    lines.push("");
    for (const page of errorCatalogs) {
      const data = page.data as ErrorCatalogPageData;
      for (const err of data.errors) {
        lines.push(`### ${err.code}`);
        if (err.httpStatus) lines.push(`HTTP Status: ${err.httpStatus}`);
        if (err.exception) lines.push(`Exception: ${err.exception}`);
        if (err.description) lines.push(`Description: ${err.description}`);
        if (err.since) lines.push(`Since: ${err.since}`);
        if (err.causes && err.causes.length > 0) {
          lines.push("Causes:");
          for (const cause of err.causes) {
            lines.push(`  - ${cause}`);
          }
        }
        if (err.resolution) lines.push(`Resolution: ${err.resolution}`);
        if (err.thrownBy && err.thrownBy.length > 0) {
          lines.push(`Thrown by: ${err.thrownBy.join(", ")}`);
        }
        if (err.endpoints && err.endpoints.length > 0) {
          lines.push(`Endpoints: ${err.endpoints.join(", ")}`);
        }
        lines.push("");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Event Catalog
  // -------------------------------------------------------------------------
  if (eventCatalogs.length > 0) {
    lines.push("## Events");
    lines.push("");
    for (const page of eventCatalogs) {
      const data = page.data as EventCatalogPageData;
      for (const evt of data.events) {
        lines.push(`### ${evt.name}`);
        if (evt.description) lines.push(`Description: ${evt.description}`);
        if (evt.trigger) lines.push(`Trigger: ${evt.trigger}`);
        if (evt.channel) lines.push(`Channel: ${evt.channel}`);
        if (evt.deliveryGuarantee) lines.push(`Delivery guarantee: ${evt.deliveryGuarantee}`);
        if (evt.retryPolicy) lines.push(`Retry policy: ${evt.retryPolicy}`);
        if (evt.since) lines.push(`Since: ${evt.since}`);
        if (evt.payload) {
          lines.push("Payload:");
          if (evt.payload.type) lines.push(`  Type: ${evt.payload.type}`);
          if (evt.payload.fields) {
            for (const f of evt.payload.fields) {
              lines.push(`  - ${f.name}: ${f.type}${f.description ? ` -- ${f.description}` : ""}`);
            }
          }
        }
        lines.push("");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Operations (Contexts)
  // -------------------------------------------------------------------------
  if (operations.length > 0) {
    lines.push("## Operations");
    lines.push("");
    for (const page of operations) {
      const data = page.data as OperationsPageData;
      for (const ctxMeta of data.contexts) {
        const ctx = ctxMeta.context;
        lines.push(`### ${ctx.name ?? ctx.id}`);
        lines.push(`ID: ${ctx.id}`);
        if (ctx.attachedTo) lines.push(`Attached to: ${ctx.attachedTo}`);
        if (ctx.flow) lines.push(`Flow: ${ctx.flow}`);

        if (ctx.inputs && ctx.inputs.length > 0) {
          lines.push("Inputs:");
          for (const input of ctx.inputs) {
            emitContextInput(lines, input);
          }
        }

        if (ctx.uses && ctx.uses.length > 0) {
          lines.push("Uses:");
          for (const use of ctx.uses) {
            emitContextUses(lines, use);
          }
        }
        lines.push("");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Data Stores
  // -------------------------------------------------------------------------
  if (dataStores.length > 0) {
    lines.push("## Data Stores");
    lines.push("");
    for (const page of dataStores) {
      const data = page.data as DataStorePageData;
      for (const store of data.dataStores) {
        lines.push(`### ${store.name ?? store.id}`);
        lines.push(`ID: ${store.id}`);
        if (store.type) lines.push(`Type: ${store.type}`);
        if (store.tables && store.tables.length > 0) lines.push(`Tables: ${store.tables.join(", ")}`);
        if (store.schemaSource) lines.push(`Schema source: ${store.schemaSource}`);
        if (store.migrationTool) lines.push(`Migration tool: ${store.migrationTool}`);
        if (store.keyPatterns && store.keyPatterns.length > 0) lines.push(`Key patterns: ${store.keyPatterns.join(", ")}`);
        if (store.buckets && store.buckets.length > 0) lines.push(`Buckets: ${store.buckets.join(", ")}`);
        if (store.topics && store.topics.length > 0) lines.push(`Topics: ${store.topics.join(", ")}`);
        if (store.migrations && store.migrations.length > 0) {
          lines.push("Migrations:");
          for (const mig of store.migrations) {
            lines.push(`  - v${mig.version}: ${mig.description ?? ""}${mig.date ? ` (${mig.date})` : ""}`);
            if (mig.tables && mig.tables.length > 0) lines.push(`    Tables: ${mig.tables.join(", ")}`);
          }
        }
        lines.push("");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Configuration Properties
  // -------------------------------------------------------------------------
  if (configurations.length > 0) {
    lines.push("## Configuration");
    lines.push("");
    for (const page of configurations) {
      const data = page.data as ConfigurationPageData;
      for (const prop of data.properties) {
        lines.push(`### ${prop.key}`);
        if (prop.type) lines.push(`Type: ${prop.type}`);
        if (prop.default) lines.push(`Default: ${prop.default}`);
        if (prop.description) lines.push(`Description: ${prop.description}`);
        if (prop.source) lines.push(`Source: ${prop.source}`);
        if (prop.environment) lines.push(`Environment: ${prop.environment}`);
        if (prop.usedBy && prop.usedBy.length > 0) lines.push(`Used by: ${prop.usedBy.join(", ")}`);
        if (prop.affectsFlow) lines.push(`Affects flow: ${prop.affectsFlow}`);
        if (prop.validRange) {
          const vr = prop.validRange;
          const parts: string[] = [];
          if (vr.min !== undefined) parts.push(`min=${vr.min}`);
          if (vr.max !== undefined) parts.push(`max=${vr.max}`);
          lines.push(`Valid range: ${parts.join(", ")}`);
        }
        lines.push("");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Security
  // -------------------------------------------------------------------------
  if (securityPages.length > 0) {
    lines.push("## Security");
    lines.push("");
    for (const page of securityPages) {
      const data = page.data as SecurityPageData;
      const sec = data.security;
      if (sec.authMechanism) lines.push(`Auth mechanism: ${sec.authMechanism}`);
      if (sec.roles && sec.roles.length > 0) lines.push(`Roles: ${sec.roles.join(", ")}`);
      if (sec.scopes && sec.scopes.length > 0) lines.push(`Scopes: ${sec.scopes.join(", ")}`);
      if (sec.endpoints && sec.endpoints.length > 0) {
        lines.push("Endpoint rules:");
        for (const rule of sec.endpoints) {
          lines.push(`  ${rule.path}:`);
          if (rule.public) lines.push(`    Public: true`);
          if (rule.rules && rule.rules.length > 0) lines.push(`    Rules: ${rule.rules.join(", ")}`);
          if (rule.rateLimit) {
            const rl = rule.rateLimit;
            lines.push(`    Rate limit: ${rl.requests ?? "?"} requests / ${rl.window ?? "?"}`);
          }
        }
      }
      lines.push("");
    }
  }

  // -------------------------------------------------------------------------
  // External Dependencies
  // -------------------------------------------------------------------------
  if (dependencyMaps.length > 0) {
    lines.push("## External Dependencies");
    lines.push("");
    for (const page of dependencyMaps) {
      const data = page.data as DependencyMapPageData;
      for (const dep of data.dependencies) {
        lines.push(`### ${dep.name}`);
        if (dep.baseUrl) lines.push(`Base URL: ${dep.baseUrl}`);
        if (dep.auth) lines.push(`Auth: ${dep.auth}`);
        if (dep.sla) lines.push(`SLA: ${dep.sla}`);
        if (dep.fallback) lines.push(`Fallback: ${dep.fallback}`);
        if (dep.rateLimit) {
          const rl = dep.rateLimit;
          lines.push(`Rate limit: ${rl.requests ?? "?"} requests / ${rl.window ?? "?"}`);
        }
        if (dep.endpoints && dep.endpoints.length > 0) {
          lines.push("Endpoints:");
          for (const ep of dep.endpoints) {
            lines.push(`  - ${ep.method ?? "GET"} ${ep.path ?? "/"}`);
            if (ep.usedBy && ep.usedBy.length > 0) lines.push(`    Used by: ${ep.usedBy.join(", ")}`);
          }
        }
        lines.push("");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Privacy
  // -------------------------------------------------------------------------
  if (privacyPages.length > 0) {
    lines.push("## Privacy");
    lines.push("");
    for (const page of privacyPages) {
      const data = page.data as PrivacyPageData;
      for (const field of data.fields) {
        lines.push(`### ${field.field}`);
        if (field.piiType) lines.push(`PII type: ${field.piiType}`);
        if (field.retention) lines.push(`Retention: ${field.retention}`);
        if (field.gdprBasis) lines.push(`GDPR basis: ${field.gdprBasis}`);
        if (field.encrypted) lines.push(`Encrypted: yes`);
        if (field.neverLog) lines.push(`Never log: yes`);
        if (field.neverReturn) lines.push(`Never return: yes`);
        lines.push("");
      }
    }
  }

  // -------------------------------------------------------------------------
  // Intent Graph
  // -------------------------------------------------------------------------
  if (intentGraphs.length > 0) {
    lines.push("## Intent Analysis");
    lines.push("");
    for (const page of intentGraphs) {
      const data = page.data as IntentGraphPageData;
      const graph = data.intentGraph;
      if (graph.methods) {
        for (const method of graph.methods) {
          lines.push(`### ${method.qualified}`);
          if (method.intentSignals) {
            const sig = method.intentSignals;
            if (sig.nameSemantics) {
              const ns = sig.nameSemantics;
              if (ns.intent) lines.push(`Intent: ${ns.intent}`);
              if (ns.verb) lines.push(`Verb: ${ns.verb}`);
              if (ns.object) lines.push(`Object: ${ns.object}`);
            }
            if (sig.guardClauses !== undefined) lines.push(`Guard clauses: ${sig.guardClauses}`);
            if (sig.branches !== undefined) lines.push(`Branches: ${sig.branches}`);
            if (sig.intentDensityScore !== undefined) lines.push(`Intent density score: ${sig.intentDensityScore}`);
            if (sig.dataFlow) {
              const df = sig.dataFlow;
              if (df.reads && df.reads.length > 0) lines.push(`Reads: ${df.reads.join(", ")}`);
              if (df.writes && df.writes.length > 0) lines.push(`Writes: ${df.writes.join(", ")}`);
            }
            if (sig.errorHandling) {
              const eh = sig.errorHandling;
              if (eh.catchBlocks !== undefined) lines.push(`Catch blocks: ${eh.catchBlocks}`);
              if (eh.caughtTypes && eh.caughtTypes.length > 0) lines.push(`Caught types: ${eh.caughtTypes.join(", ")}`);
            }
            if (sig.constants && sig.constants.length > 0) lines.push(`Constants: ${sig.constants.join(", ")}`);
            if (sig.dependencies && sig.dependencies.length > 0) lines.push(`Dependencies: ${sig.dependencies.join(", ")}`);
          }
          lines.push("");
        }
      }
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function emitMemberFull(lines: string[], m: Member): void {
  lines.push(`### ${m.qualified}`);
  lines.push(`Kind: ${m.kind}`);
  lines.push(`Name: ${m.name}`);
  if (m.description) lines.push(`Description: ${m.description}`);
  if (m.visibility) lines.push(`Visibility: ${m.visibility}`);
  if (m.since) lines.push(`Since: ${m.since}`);
  if (m.deprecated !== undefined && m.deprecated !== null) lines.push(`Deprecated: ${m.deprecated}`);
  if (m.audience) lines.push(`Audience: ${m.audience}`);
  if (m.discoveredFrom) lines.push(`Discovered from: ${m.discoveredFrom}`);
  if (m.tags && m.tags.length > 0) lines.push(`Tags: ${m.tags.join(", ")}`);
  if (m.modifiers && m.modifiers.length > 0) lines.push(`Modifiers: ${m.modifiers.join(", ")}`);
  if (m.typeParams && m.typeParams.length > 0) lines.push(`Type params: ${m.typeParams.join(", ")}`);
  if (m.extends) lines.push(`Extends: ${m.extends}`);
  if (m.implements && m.implements.length > 0) lines.push(`Implements: ${m.implements.join(", ")}`);

  // Dependencies
  if (m.dependencies && m.dependencies.length > 0) {
    lines.push("Dependencies:");
    for (const dep of m.dependencies) {
      lines.push(`  - ${dep.name}: ${dep.type ?? "unknown"}${dep.classification ? ` (${dep.classification})` : ""}${dep.injectionMechanism ? `, injected via ${dep.injectionMechanism}` : ""}${dep.required ? ", required" : ""}`);
    }
  }

  // Constructors
  if (m.constructors && m.constructors.length > 0) {
    lines.push("Constructors:");
    for (const ctor of m.constructors) {
      emitConstructorFull(lines, ctor);
    }
  }

  // Fields
  if (m.fields && m.fields.length > 0) {
    lines.push("Fields:");
    for (const f of m.fields) {
      emitFieldFull(lines, f);
    }
  }

  // Methods
  if (m.methods && m.methods.length > 0) {
    lines.push("Methods:");
    for (const method of m.methods) {
      emitMethodFull(lines, method, "  ");
    }
  }

  // Enum values
  if (m.values && m.values.length > 0) {
    lines.push(`Enum values: ${m.values.join(", ")}`);
  }

  // Examples
  if (m.examples && m.examples.length > 0) {
    lines.push("Examples:");
    for (const ex of m.examples) {
      if (ex.title) lines.push(`  Title: ${ex.title}`);
      if (ex.language) lines.push(`  Language: ${ex.language}`);
      lines.push("  ```");
      lines.push(ex.code);
      lines.push("  ```");
    }
  }
}

function emitConstructorFull(lines: string[], ctor: Constructor): void {
  const params = (ctor.params ?? []).map(p => `${p.type} ${p.name}`).join(", ");
  lines.push(`  constructor(${params})${ctor.visibility ? ` [${ctor.visibility}]` : ""}`);
  if (ctor.description) lines.push(`    ${ctor.description}`);
  for (const p of ctor.params ?? []) {
    lines.push(`    - ${p.name}: ${p.type}${p.required ? " (required)" : ""}${p.description ? ` -- ${p.description}` : ""}${p.default ? ` [default: ${p.default}]` : ""}`);
  }
}

function emitFieldFull(lines: string[], f: Field): void {
  lines.push(`  - ${f.name}: ${f.type}${f.visibility ? ` [${f.visibility}]` : ""}${f.description ? ` -- ${f.description}` : ""}`);
  if (f.modifiers && f.modifiers.length > 0) lines.push(`    Modifiers: ${f.modifiers.join(", ")}`);
  if (f.since) lines.push(`    Since: ${f.since}`);
}

function emitMethodFull(lines: string[], method: Method, indent: string): void {
  const params = (method.params ?? []).map(p => `${p.type} ${p.name}`).join(", ");
  const returnType = method.returns?.type ?? "void";
  lines.push(`${indent}${returnType} ${method.name}(${params})`);

  if (method.description) lines.push(`${indent}  Description: ${method.description}`);
  if (method.visibility) lines.push(`${indent}  Visibility: ${method.visibility}`);
  if (method.since) lines.push(`${indent}  Since: ${method.since}`);
  if (method.deprecated !== undefined && method.deprecated !== null) lines.push(`${indent}  Deprecated: ${method.deprecated}`);
  if (method.tags && method.tags.length > 0) lines.push(`${indent}  Tags: ${method.tags.join(", ")}`);
  if (method.modifiers && method.modifiers.length > 0) lines.push(`${indent}  Modifiers: ${method.modifiers.join(", ")}`);
  if (method.asyncApi) lines.push(`${indent}  AsyncAPI: ${method.asyncApi}`);

  // Parameters with full detail
  if (method.params && method.params.length > 0) {
    lines.push(`${indent}  Parameters:`);
    for (const p of method.params) {
      lines.push(`${indent}    - ${p.name}: ${p.type}${p.required ? " (required)" : ""}${p.description ? ` -- ${p.description}` : ""}${p.default ? ` [default: ${p.default}]` : ""}`);
    }
  }

  // Returns
  if (method.returns) {
    lines.push(`${indent}  Returns: ${method.returns.type ?? "void"}${method.returns.description ? ` -- ${method.returns.description}` : ""}`);
  }

  // Throws
  if (method.throws && method.throws.length > 0) {
    lines.push(`${indent}  Throws:`);
    for (const t of method.throws) {
      lines.push(`${indent}    - ${t.type ?? "Exception"}${t.description ? `: ${t.description}` : ""}`);
    }
  }

  // Endpoint mapping
  if (method.endpointMapping) {
    const ep = method.endpointMapping;
    lines.push(`${indent}  Endpoint: ${ep.method ?? "GET"} ${ep.path ?? "/"}`);
    if (ep.description) lines.push(`${indent}    ${ep.description}`);
  }

  // Error conditions
  if (method.errorConditions && method.errorConditions.length > 0) {
    lines.push(`${indent}  Error conditions:`);
    for (const ec of method.errorConditions) {
      lines.push(`${indent}    - ${ec.type ?? "error"}${ec.mechanism ? ` (${ec.mechanism})` : ""}${ec.code ? ` [${ec.code}]` : ""}${ec.description ? `: ${ec.description}` : ""}`);
    }
  }

  // Performance
  if (method.performance) {
    const perf = method.performance;
    if (perf.expectedLatency) lines.push(`${indent}  Expected latency: ${perf.expectedLatency}`);
    if (perf.bottleneck) lines.push(`${indent}  Bottleneck: ${perf.bottleneck}`);
  }

  // Async
  if (method.async) {
    const a = method.async;
    if (a.mechanism) lines.push(`${indent}  Async mechanism: ${a.mechanism}`);
    if (a.returnWrapper) lines.push(`${indent}  Async return wrapper: ${a.returnWrapper}`);
  }

  // Examples
  if (method.examples && method.examples.length > 0) {
    lines.push(`${indent}  Examples:`);
    for (const ex of method.examples) {
      if (ex.title) lines.push(`${indent}    Title: ${ex.title}`);
      lines.push(`${indent}    \`\`\``);
      lines.push(ex.code);
      lines.push(`${indent}    \`\`\``);
    }
  }
}

function emitFlowStepFull(lines: string[], step: FlowStep): void {
  lines.push(`  ${step.id}. ${step.name ?? step.actor ?? "step"}`);
  if (step.actor) lines.push(`    Actor: ${step.actor}`);
  if (step.actorQualified) lines.push(`    Actor qualified: ${step.actorQualified}`);
  if (step.description) lines.push(`    Description: ${step.description}`);
  if (step.type) lines.push(`    Type: ${step.type}`);
  if (step.ai) lines.push(`    AI: yes`);
  if (step.retryTarget) lines.push(`    Retry target: ${step.retryTarget}`);
  if (step.inputs && step.inputs.length > 0) lines.push(`    Inputs: ${step.inputs.join(", ")}`);
  if (step.outputs && step.outputs.length > 0) lines.push(`    Outputs: ${step.outputs.join(", ")}`);
  if (step.configDependencies && step.configDependencies.length > 0) {
    lines.push(`    Config dependencies: ${step.configDependencies.join(", ")}`);
  }
  if (step.dataStoreOps && step.dataStoreOps.length > 0) {
    lines.push("    Data store operations:");
    for (const op of step.dataStoreOps) {
      lines.push(`      - ${op.operation ?? "?"} on ${op.store ?? "?"}${op.tables ? ` (tables: ${op.tables.join(", ")})` : ""}${op.transactional ? " [transactional]" : ""}${op.cascading ? " [cascading]" : ""}`);
    }
  }
  if (step.observability) {
    const obs = step.observability;
    if (obs.metrics && obs.metrics.length > 0) lines.push(`    Metrics: ${obs.metrics.join(", ")}`);
    if (obs.logLevel) lines.push(`    Log level: ${obs.logLevel}`);
  }
}

function emitDataModelField(lines: string[], f: DataModelField): void {
  const attrs: string[] = [];
  if (f.primaryKey) attrs.push("PK");
  if (f.nullable === false) attrs.push("NOT NULL");
  if (f.unique) attrs.push("UNIQUE");
  if (f.length) attrs.push(`length=${f.length}`);
  if (f.column) attrs.push(`column=${f.column}`);
  if (f.enumType) attrs.push(`enum=${f.enumType}`);

  lines.push(`  - ${f.name}: ${f.type}${attrs.length > 0 ? ` [${attrs.join(", ")}]` : ""}${f.description ? ` -- ${f.description}` : ""}`);
}

function emitRelationship(lines: string[], rel: DataModelRelationship): void {
  lines.push(`  - ${rel.type} -> ${rel.target}${rel.field ? ` (field: ${rel.field})` : ""}${rel.mappedBy ? ` (mappedBy: ${rel.mappedBy})` : ""}${rel.cascade ? ` [cascade: ${rel.cascade}]` : ""}`);
}

function emitContextInput(lines: string[], input: ContextInput): void {
  lines.push(`  - ${input.name}${input.source ? ` (from: ${input.source})` : ""}${input.description ? `: ${input.description}` : ""}`);
  if (input.items && input.items.length > 0) {
    lines.push(`    Items: ${input.items.join(", ")}`);
  }
}

function emitContextUses(lines: string[], use: ContextUses): void {
  lines.push(`  - ${use.artifact}: ${use.what}${use.why ? ` -- ${use.why}` : ""}`);
}
