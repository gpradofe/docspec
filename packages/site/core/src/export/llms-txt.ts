/**
 * Generates llms.txt -- a concise, LLM-optimized summary of documentation.
 * Format: structured plain text with module/member/endpoint summaries.
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
} from "../types/page.js";
import { PageType } from "../types/page.js";

export function generateLlmsTxt(pages: GeneratedPage[], siteName: string): string {
  const lines: string[] = [];

  lines.push(`# ${siteName}`);
  lines.push("");
  lines.push("> This file contains a concise summary of the documentation for use by LLMs.");
  lines.push("");

  // Group pages by type
  const modules = pages.filter(p => p.type === PageType.MODULE);
  const members = pages.filter(p => p.type === PageType.MEMBER);
  const endpoints = pages.filter(p => p.type === PageType.ENDPOINT);
  const flows = pages.filter(p => p.type === PageType.FLOW);
  const dataModels = pages.filter(p => p.type === PageType.DATA_MODEL);
  const errorCatalogs = pages.filter(p => p.type === PageType.ERROR_CATALOG);
  const eventCatalogs = pages.filter(p => p.type === PageType.EVENT_CATALOG);

  // Modules section
  if (modules.length > 0) {
    lines.push("## Modules");
    lines.push("");
    for (const page of modules) {
      const data = page.data as ModulePageData;
      lines.push(`### ${data.module.name ?? data.module.id}`);
      if (data.module.description) lines.push(data.module.description);
      if (data.module.stereotype) lines.push(`Stereotype: ${data.module.stereotype}`);
      const memberCount = data.module.members?.length ?? 0;
      lines.push(`Members: ${memberCount}`);
      lines.push("");
    }
  }

  // Members section -- only key info
  if (members.length > 0) {
    lines.push("## Classes & Interfaces");
    lines.push("");
    for (const page of members) {
      const data = page.data as MemberPageData;
      const m = data.member;
      lines.push(`### ${m.qualified}`);
      lines.push(`Kind: ${m.kind}`);
      if (m.description) lines.push(m.description);

      // Method signatures (concise)
      for (const method of m.methods ?? []) {
        const params = (method.params ?? []).map(p => `${p.type} ${p.name}`).join(", ");
        const returnType = method.returns?.type ?? "void";
        lines.push(`- ${returnType} ${method.name}(${params})`);
        if (method.description) lines.push(`  ${method.description}`);
      }
      lines.push("");
    }
  }

  // Endpoints section
  if (endpoints.length > 0) {
    lines.push("## API Endpoints");
    lines.push("");
    for (const page of endpoints) {
      const data = page.data as EndpointPageData;
      const ep = data.method.endpointMapping;
      if (ep) {
        lines.push(`### ${ep.method ?? "GET"} ${ep.path}`);
        if (data.method.description) lines.push(data.method.description);

        // Parameters
        for (const param of data.method.params ?? []) {
          lines.push(`- ${param.name} (${param.type}${param.required ? ", required" : ""}): ${param.description ?? ""}`);
        }

        // Returns
        if (data.method.returns?.type) {
          lines.push(`Returns: ${data.method.returns.type}`);
        }
        lines.push("");
      }
    }
  }

  // Flows section
  if (flows.length > 0) {
    lines.push("## Flows");
    lines.push("");
    for (const page of flows) {
      const data = page.data as FlowPageData;
      lines.push(`### ${data.flow.name ?? data.flow.id}`);
      if (data.flow.description) lines.push(data.flow.description);
      if (data.flow.trigger) lines.push(`Trigger: ${data.flow.trigger}`);
      for (const step of data.flow.steps) {
        lines.push(`${step.id}. ${step.name ?? step.actor ?? "step"}: ${step.description ?? ""}`);
      }
      lines.push("");
    }
  }

  // Data Models section
  if (dataModels.length > 0) {
    lines.push("## Data Models");
    lines.push("");
    for (const page of dataModels) {
      const data = page.data as DataModelPageData;
      const dm = data.dataModel;
      lines.push(`### ${dm.name}`);
      if (dm.description) lines.push(dm.description);
      if (dm.table) lines.push(`Table: ${dm.table}`);
      lines.push("");
    }
  }

  // Errors section
  if (errorCatalogs.length > 0) {
    lines.push("## Error Codes");
    lines.push("");
    for (const page of errorCatalogs) {
      const data = page.data as ErrorCatalogPageData;
      for (const err of data.errors) {
        lines.push(`- ${err.code}${err.httpStatus ? ` (HTTP ${err.httpStatus})` : ""}: ${err.description ?? ""}`);
      }
      lines.push("");
    }
  }

  // Events section
  if (eventCatalogs.length > 0) {
    lines.push("## Events");
    lines.push("");
    for (const page of eventCatalogs) {
      const data = page.data as EventCatalogPageData;
      for (const evt of data.events) {
        lines.push(`- ${evt.name}: ${evt.description ?? ""}`);
        if (evt.channel) lines.push(`  Channel: ${evt.channel}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
