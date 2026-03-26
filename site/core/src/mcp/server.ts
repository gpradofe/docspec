/**
 * MCP (Model Context Protocol) server for DocSpec.
 * Exposes documentation as queryable tools and resources.
 *
 * This implementation works standalone without the @modelcontextprotocol/sdk
 * dependency. It implements the JSON-RPC protocol directly for stdio transport.
 */

import type {
  SiteData,
  GeneratedPage,
  ModulePageData,
  MemberPageData,
  EndpointPageData,
  FlowPageData,
  ErrorCatalogPageData,
  EventCatalogPageData,
  DataModelPageData,
  OperationsPageData,
  ConfigurationPageData,
  SecurityPageData,
  DataStorePageData,
  DependencyMapPageData,
  PrivacyPageData,
} from "../types/page.js";
import { PageType } from "../types/page.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{ type: "text"; text: string }>;
}

// ---------------------------------------------------------------------------
// JSON-RPC types (internal)
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export class DocSpecMCPServer {
  private siteData: SiteData;

  constructor(siteData: SiteData) {
    this.siteData = siteData;
  }

  // -----------------------------------------------------------------------
  // Tool definitions
  // -----------------------------------------------------------------------

  getTools(): MCPTool[] {
    return [
      {
        name: "search_docs",
        description: "Search documentation by keyword. Returns matching modules, classes, endpoints, flows, and more.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query (keyword or phrase)" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_member",
        description: "Get full details about a class, interface, enum, or component by its qualified name.",
        inputSchema: {
          type: "object",
          properties: {
            qualified: { type: "string", description: "Qualified name (e.g. com.example.MyService)" },
          },
          required: ["qualified"],
        },
      },
      {
        name: "get_endpoint",
        description: "Get API endpoint details by HTTP method and path.",
        inputSchema: {
          type: "object",
          properties: {
            method: { type: "string", description: "HTTP method (GET, POST, PUT, DELETE, PATCH)" },
            path: { type: "string", description: "Endpoint path (e.g. /api/users)" },
          },
          required: ["path"],
        },
      },
      {
        name: "get_flow",
        description: "Get flow/workflow details including all steps, triggers, and trace view.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "Flow ID or name" },
          },
          required: ["id"],
        },
      },
      {
        name: "list_modules",
        description: "List all modules/packages with their member counts and stereotypes.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_errors",
        description: "Get all error codes with their HTTP status, description, causes, and resolution.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_data_model",
        description: "Get data model details including fields, relationships, and JSON shape.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Data model name or qualified name" },
          },
          required: ["name"],
        },
      },
      {
        name: "get_events",
        description: "Get all event definitions with their payloads, channels, and delivery guarantees.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_configuration",
        description: "Get configuration properties with types, defaults, and valid ranges.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_security",
        description: "Get security configuration including auth mechanisms, roles, and endpoint rules.",
        inputSchema: { type: "object", properties: {} },
      },
    ];
  }

  // -----------------------------------------------------------------------
  // Tool execution
  // -----------------------------------------------------------------------

  executeTool(name: string, args: Record<string, unknown>): MCPToolResult {
    switch (name) {
      case "search_docs":
        return this.searchDocs(args.query as string);
      case "get_member":
        return this.getMember(args.qualified as string);
      case "get_endpoint":
        return this.getEndpoint(args.method as string | undefined, args.path as string);
      case "get_flow":
        return this.getFlow(args.id as string);
      case "list_modules":
        return this.listModules();
      case "get_errors":
        return this.getErrors();
      case "get_data_model":
        return this.getDataModel(args.name as string);
      case "get_events":
        return this.getEvents();
      case "get_configuration":
        return this.getConfiguration();
      case "get_security":
        return this.getSecurity();
      default:
        return this.textResult(`Unknown tool: ${name}`);
    }
  }

  // -----------------------------------------------------------------------
  // Stdio transport -- JSON-RPC over stdin/stdout
  // -----------------------------------------------------------------------

  /**
   * Start listening on stdin for JSON-RPC messages and respond on stdout.
   * Uses the MCP stdio transport protocol (newline-delimited JSON).
   */
  async startStdio(): Promise<void> {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdin.setEncoding("utf-8");

    let buffer = "";

    stdin.on("data", (chunk: string) => {
      buffer += chunk;

      // Process complete lines
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (line.length === 0) continue;

        try {
          const request = JSON.parse(line) as JsonRpcRequest;
          const response = this.handleJsonRpcRequest(request);
          if (response) {
            stdout.write(JSON.stringify(response) + "\n");
          }
        } catch {
          const errorResponse: JsonRpcResponse = {
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error" },
          };
          stdout.write(JSON.stringify(errorResponse) + "\n");
        }
      }
    });

    // Keep the process alive
    await new Promise<void>((resolve) => {
      stdin.on("end", resolve);
    });
  }

  // -----------------------------------------------------------------------
  // JSON-RPC handler
  // -----------------------------------------------------------------------

  private handleJsonRpcRequest(request: JsonRpcRequest): JsonRpcResponse | null {
    const { id, method, params } = request;

    // Notifications (no id) -- no response needed
    if (id === undefined) return null;

    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "docspec-mcp-server",
              version: "0.1.0",
            },
          },
        };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: this.getTools(),
          },
        };

      case "tools/call": {
        const toolName = (params?.name as string) ?? "";
        const toolArgs = (params?.arguments as Record<string, unknown>) ?? {};
        const toolResult = this.executeTool(toolName, toolArgs);
        return {
          jsonrpc: "2.0",
          id,
          result: toolResult,
        };
      }

      case "resources/list":
        return {
          jsonrpc: "2.0",
          id,
          result: { resources: [] },
        };

      case "prompts/list":
        return {
          jsonrpc: "2.0",
          id,
          result: { prompts: [] },
        };

      case "ping":
        return {
          jsonrpc: "2.0",
          id,
          result: {},
        };

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }
  }

  // -----------------------------------------------------------------------
  // Tool implementations
  // -----------------------------------------------------------------------

  private searchDocs(query: string): MCPToolResult {
    if (!query || query.trim().length === 0) {
      return this.textResult("Please provide a search query.");
    }

    const queryLower = query.toLowerCase();
    const tokens = queryLower.split(/\s+/).filter(Boolean);
    const results: string[] = [];

    for (const page of this.siteData.pages) {
      const score = this.scoreMatch(page, tokens);
      if (score > 0) {
        results.push(this.formatPageSummary(page));
      }
    }

    if (results.length === 0) {
      return this.textResult(`No results found for "${query}".`);
    }

    const header = `Found ${results.length} result(s) for "${query}":\n`;
    return this.textResult(header + results.join("\n---\n"));
  }

  private getMember(qualified: string): MCPToolResult {
    if (!qualified) {
      return this.textResult("Please provide a qualified name.");
    }

    const qualLower = qualified.toLowerCase();

    for (const page of this.siteData.pages) {
      if (page.type !== PageType.MEMBER) continue;
      const data = page.data as MemberPageData;
      if (data.member.qualified.toLowerCase() === qualLower ||
          data.member.name.toLowerCase() === qualLower) {
        return this.textResult(this.formatMemberFull(data));
      }
    }

    // Partial match
    const partialMatches: string[] = [];
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.MEMBER) continue;
      const data = page.data as MemberPageData;
      if (data.member.qualified.toLowerCase().includes(qualLower) ||
          data.member.name.toLowerCase().includes(qualLower)) {
        partialMatches.push(`  - ${data.member.qualified} (${data.member.kind})`);
      }
    }

    if (partialMatches.length > 0) {
      return this.textResult(
        `No exact match for "${qualified}". Did you mean:\n${partialMatches.join("\n")}`
      );
    }

    return this.textResult(`Member "${qualified}" not found.`);
  }

  private getEndpoint(method: string | undefined, path: string): MCPToolResult {
    if (!path) {
      return this.textResult("Please provide an endpoint path.");
    }

    const pathLower = path.toLowerCase();
    const methodUpper = method?.toUpperCase();

    const matches: string[] = [];

    for (const page of this.siteData.pages) {
      if (page.type !== PageType.ENDPOINT) continue;
      const data = page.data as EndpointPageData;
      const ep = data.method.endpointMapping;
      if (!ep) continue;

      const epPath = ep.path?.toLowerCase() ?? "";
      const epMethod = ep.method?.toUpperCase();

      const pathMatch = epPath === pathLower || epPath.includes(pathLower) || pathLower.includes(epPath);
      const methodMatch = !methodUpper || epMethod === methodUpper;

      if (pathMatch && methodMatch) {
        matches.push(this.formatEndpointFull(data));
      }
    }

    if (matches.length === 0) {
      return this.textResult(`No endpoint found matching ${methodUpper ?? "*"} ${path}.`);
    }

    return this.textResult(matches.join("\n---\n"));
  }

  private getFlow(id: string): MCPToolResult {
    if (!id) {
      return this.textResult("Please provide a flow ID or name.");
    }

    const idLower = id.toLowerCase();

    for (const page of this.siteData.pages) {
      if (page.type !== PageType.FLOW) continue;
      const data = page.data as FlowPageData;
      if (data.flow.id.toLowerCase() === idLower ||
          (data.flow.name && data.flow.name.toLowerCase() === idLower)) {
        return this.textResult(this.formatFlowFull(data));
      }
    }

    // Partial match
    const partialMatches: string[] = [];
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.FLOW) continue;
      const data = page.data as FlowPageData;
      if (data.flow.id.toLowerCase().includes(idLower) ||
          (data.flow.name && data.flow.name.toLowerCase().includes(idLower))) {
        partialMatches.push(`  - ${data.flow.name ?? data.flow.id} (${data.flow.steps.length} steps)`);
      }
    }

    if (partialMatches.length > 0) {
      return this.textResult(
        `No exact match for flow "${id}". Did you mean:\n${partialMatches.join("\n")}`
      );
    }

    return this.textResult(`Flow "${id}" not found.`);
  }

  private listModules(): MCPToolResult {
    const modulePages = this.siteData.pages.filter(p => p.type === PageType.MODULE);

    if (modulePages.length === 0) {
      return this.textResult("No modules found.");
    }

    const lines: string[] = [`Found ${modulePages.length} module(s):\n`];

    for (const page of modulePages) {
      const data = page.data as ModulePageData;
      const mod = data.module;
      const memberCount = mod.members?.length ?? 0;
      lines.push(`${mod.name ?? mod.id}`);
      lines.push(`  ID: ${mod.id}`);
      if (mod.description) lines.push(`  Description: ${mod.description}`);
      if (mod.stereotype) lines.push(`  Stereotype: ${mod.stereotype}`);
      lines.push(`  Members: ${memberCount}`);
      if (mod.members && mod.members.length > 0) {
        for (const m of mod.members) {
          lines.push(`    - ${m.qualified} (${m.kind})`);
        }
      }
      lines.push("");
    }

    return this.textResult(lines.join("\n"));
  }

  private getErrors(): MCPToolResult {
    const errorPages = this.siteData.pages.filter(p => p.type === PageType.ERROR_CATALOG);

    if (errorPages.length === 0) {
      return this.textResult("No error codes documented.");
    }

    const lines: string[] = [];

    for (const page of errorPages) {
      const data = page.data as ErrorCatalogPageData;
      for (const err of data.errors) {
        lines.push(`${err.code}`);
        if (err.httpStatus) lines.push(`  HTTP Status: ${err.httpStatus}`);
        if (err.exception) lines.push(`  Exception: ${err.exception}`);
        if (err.description) lines.push(`  Description: ${err.description}`);
        if (err.causes && err.causes.length > 0) {
          lines.push("  Causes:");
          for (const cause of err.causes) {
            lines.push(`    - ${cause}`);
          }
        }
        if (err.resolution) lines.push(`  Resolution: ${err.resolution}`);
        if (err.thrownBy && err.thrownBy.length > 0) {
          lines.push(`  Thrown by: ${err.thrownBy.join(", ")}`);
        }
        if (err.endpoints && err.endpoints.length > 0) {
          lines.push(`  Endpoints: ${err.endpoints.join(", ")}`);
        }
        lines.push("");
      }
    }

    return this.textResult(lines.join("\n"));
  }

  private getDataModel(name: string): MCPToolResult {
    if (!name) {
      return this.textResult("Please provide a data model name.");
    }

    const nameLower = name.toLowerCase();

    for (const page of this.siteData.pages) {
      if (page.type !== PageType.DATA_MODEL) continue;
      const data = page.data as DataModelPageData;
      const dm = data.dataModel;
      if (dm.name.toLowerCase() === nameLower ||
          dm.qualified.toLowerCase() === nameLower) {
        return this.textResult(this.formatDataModelFull(data));
      }
    }

    // Partial match
    const partialMatches: string[] = [];
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.DATA_MODEL) continue;
      const data = page.data as DataModelPageData;
      const dm = data.dataModel;
      if (dm.name.toLowerCase().includes(nameLower) ||
          dm.qualified.toLowerCase().includes(nameLower)) {
        partialMatches.push(`  - ${dm.qualified}${dm.table ? ` (table: ${dm.table})` : ""}`);
      }
    }

    if (partialMatches.length > 0) {
      return this.textResult(
        `No exact match for "${name}". Did you mean:\n${partialMatches.join("\n")}`
      );
    }

    return this.textResult(`Data model "${name}" not found.`);
  }

  private getEvents(): MCPToolResult {
    const eventPages = this.siteData.pages.filter(p => p.type === PageType.EVENT_CATALOG);

    if (eventPages.length === 0) {
      return this.textResult("No events documented.");
    }

    const lines: string[] = [];

    for (const page of eventPages) {
      const data = page.data as EventCatalogPageData;
      for (const evt of data.events) {
        lines.push(`${evt.name}`);
        if (evt.description) lines.push(`  Description: ${evt.description}`);
        if (evt.trigger) lines.push(`  Trigger: ${evt.trigger}`);
        if (evt.channel) lines.push(`  Channel: ${evt.channel}`);
        if (evt.deliveryGuarantee) lines.push(`  Delivery: ${evt.deliveryGuarantee}`);
        if (evt.retryPolicy) lines.push(`  Retry: ${evt.retryPolicy}`);
        if (evt.payload) {
          lines.push("  Payload:");
          if (evt.payload.type) lines.push(`    Type: ${evt.payload.type}`);
          if (evt.payload.fields) {
            for (const f of evt.payload.fields) {
              lines.push(`    - ${f.name}: ${f.type}${f.description ? ` -- ${f.description}` : ""}`);
            }
          }
        }
        lines.push("");
      }
    }

    return this.textResult(lines.join("\n"));
  }

  private getConfiguration(): MCPToolResult {
    const configPages = this.siteData.pages.filter(p => p.type === PageType.CONFIGURATION);

    if (configPages.length === 0) {
      return this.textResult("No configuration properties documented.");
    }

    const lines: string[] = [];

    for (const page of configPages) {
      const data = page.data as ConfigurationPageData;
      for (const prop of data.properties) {
        lines.push(`${prop.key}`);
        if (prop.type) lines.push(`  Type: ${prop.type}`);
        if (prop.default) lines.push(`  Default: ${prop.default}`);
        if (prop.description) lines.push(`  Description: ${prop.description}`);
        if (prop.source) lines.push(`  Source: ${prop.source}`);
        if (prop.environment) lines.push(`  Environment: ${prop.environment}`);
        if (prop.usedBy && prop.usedBy.length > 0) lines.push(`  Used by: ${prop.usedBy.join(", ")}`);
        if (prop.affectsFlow) lines.push(`  Affects flow: ${prop.affectsFlow}`);
        if (prop.validRange) {
          const vr = prop.validRange;
          const parts: string[] = [];
          if (vr.min !== undefined) parts.push(`min=${vr.min}`);
          if (vr.max !== undefined) parts.push(`max=${vr.max}`);


          lines.push(`  Valid range: ${parts.join(", ")}`);
        }
        lines.push("");
      }
    }

    return this.textResult(lines.join("\n"));
  }

  private getSecurity(): MCPToolResult {
    const secPages = this.siteData.pages.filter(p => p.type === PageType.SECURITY);

    if (secPages.length === 0) {
      return this.textResult("No security configuration documented.");
    }

    const lines: string[] = [];

    for (const page of secPages) {
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
            lines.push(`    Rate limit: ${rl.requests ?? "?"} / ${rl.window ?? "?"}`);
          }
        }
      }
      lines.push("");
    }

    return this.textResult(lines.join("\n"));
  }

  // -----------------------------------------------------------------------
  // Formatting helpers
  // -----------------------------------------------------------------------

  private textResult(text: string): MCPToolResult {
    return { content: [{ type: "text", text }] };
  }

  private scoreMatch(page: GeneratedPage, tokens: string[]): number {
    const searchable = this.getSearchableText(page).toLowerCase();
    let score = 0;

    for (const token of tokens) {
      if (searchable.includes(token)) {
        score += 1;
        // Boost for title match
        if (page.title.toLowerCase().includes(token)) {
          score += 2;
        }
      }
    }

    return score;
  }

  private getSearchableText(page: GeneratedPage): string {
    const parts = [page.title, page.description ?? ""];

    switch (page.type) {
      case PageType.MODULE: {
        const data = page.data as ModulePageData;
        parts.push(data.module.id, data.module.name ?? "", data.module.description ?? "");
        for (const m of data.module.members ?? []) {
          parts.push(m.qualified, m.name, m.description ?? "");
        }
        break;
      }
      case PageType.MEMBER: {
        const data = page.data as MemberPageData;
        parts.push(data.member.qualified, data.member.name, data.member.description ?? "", data.member.kind);
        for (const method of data.member.methods ?? []) {
          parts.push(method.name, method.description ?? "");
        }
        break;
      }
      case PageType.ENDPOINT: {
        const data = page.data as EndpointPageData;
        const ep = data.method.endpointMapping;
        parts.push(data.memberQualified, data.method.name, data.method.description ?? "");
        if (ep) parts.push(ep.method ?? "", ep.path ?? "", ep.description ?? "");
        break;
      }
      case PageType.FLOW: {
        const data = page.data as FlowPageData;
        parts.push(data.flow.id, data.flow.name ?? "", data.flow.description ?? "");
        for (const step of data.flow.steps) {
          parts.push(step.name ?? "", step.actor ?? "", step.description ?? "");
        }
        break;
      }
      case PageType.DATA_MODEL: {
        const data = page.data as DataModelPageData;
        parts.push(data.dataModel.name, data.dataModel.qualified, data.dataModel.description ?? "", data.dataModel.table ?? "");
        break;
      }
      case PageType.ERROR_CATALOG: {
        const data = page.data as ErrorCatalogPageData;
        for (const err of data.errors) {
          parts.push(err.code, err.description ?? "", err.exception ?? "");
        }
        break;
      }
      case PageType.EVENT_CATALOG: {
        const data = page.data as EventCatalogPageData;
        for (const evt of data.events) {
          parts.push(evt.name, evt.description ?? "", evt.channel ?? "");
        }
        break;
      }
    }

    return parts.join(" ");
  }

  private formatPageSummary(page: GeneratedPage): string {
    const lines: string[] = [];
    lines.push(`[${page.type}] ${page.title}`);
    if (page.description) lines.push(`  ${page.description}`);
    lines.push(`  URL: ${page.slug}`);

    switch (page.type) {
      case PageType.MODULE: {
        const data = page.data as ModulePageData;
        if (data.module.stereotype) lines.push(`  Stereotype: ${data.module.stereotype}`);
        lines.push(`  Members: ${data.module.members?.length ?? 0}`);
        break;
      }
      case PageType.MEMBER: {
        const data = page.data as MemberPageData;
        lines.push(`  Kind: ${data.member.kind}`);
        lines.push(`  Qualified: ${data.member.qualified}`);
        break;
      }
      case PageType.ENDPOINT: {
        const data = page.data as EndpointPageData;
        const ep = data.method.endpointMapping;
        if (ep) lines.push(`  ${ep.method ?? "GET"} ${ep.path}`);
        break;
      }
      case PageType.FLOW: {
        const data = page.data as FlowPageData;
        lines.push(`  Steps: ${data.flow.steps.length}`);
        if (data.flow.trigger) lines.push(`  Trigger: ${data.flow.trigger}`);
        break;
      }
    }

    return lines.join("\n");
  }

  private formatMemberFull(data: MemberPageData): string {
    const lines: string[] = [];
    const m = data.member;

    lines.push(`${m.qualified}`);
    lines.push(`Kind: ${m.kind}`);
    if (m.description) lines.push(`Description: ${m.description}`);
    if (m.visibility) lines.push(`Visibility: ${m.visibility}`);
    if (m.since) lines.push(`Since: ${m.since}`);
    if (m.deprecated !== undefined && m.deprecated !== null) lines.push(`Deprecated: ${m.deprecated}`);
    if (m.tags && m.tags.length > 0) lines.push(`Tags: ${m.tags.join(", ")}`);
    if (m.extends) lines.push(`Extends: ${m.extends}`);
    if (m.implements && m.implements.length > 0) lines.push(`Implements: ${m.implements.join(", ")}`);

    if (m.dependencies && m.dependencies.length > 0) {
      lines.push("\nDependencies:");
      for (const dep of m.dependencies) {
        lines.push(`  - ${dep.name}: ${dep.type ?? "?"}${dep.classification ? ` (${dep.classification})` : ""}`);
      }
    }

    if (m.fields && m.fields.length > 0) {
      lines.push("\nFields:");
      for (const f of m.fields) {
        lines.push(`  - ${f.name}: ${f.type}${f.description ? ` -- ${f.description}` : ""}`);
      }
    }

    if (m.constructors && m.constructors.length > 0) {
      lines.push("\nConstructors:");
      for (const ctor of m.constructors) {
        const params = (ctor.params ?? []).map(p => `${p.type} ${p.name}`).join(", ");
        lines.push(`  (${params})`);
        if (ctor.description) lines.push(`    ${ctor.description}`);
      }
    }

    if (m.methods && m.methods.length > 0) {
      lines.push("\nMethods:");
      for (const method of m.methods) {
        const params = (method.params ?? []).map(p => `${p.type} ${p.name}`).join(", ");
        const returnType = method.returns?.type ?? "void";
        lines.push(`  ${returnType} ${method.name}(${params})`);
        if (method.description) lines.push(`    Description: ${method.description}`);
        if (method.endpointMapping) {
          const ep = method.endpointMapping;
          lines.push(`    Endpoint: ${ep.method ?? "GET"} ${ep.path}`);
        }
        if (method.params && method.params.length > 0) {
          for (const p of method.params) {
            lines.push(`    - ${p.name}: ${p.type}${p.required ? " (required)" : ""}${p.description ? ` -- ${p.description}` : ""}`);
          }
        }
        if (method.throws && method.throws.length > 0) {
          lines.push("    Throws:");
          for (const t of method.throws) {
            lines.push(`      - ${t.type ?? "Exception"}${t.description ? `: ${t.description}` : ""}`);
          }
        }
      }
    }

    if (m.values && m.values.length > 0) {
      lines.push(`\nEnum values: ${m.values.join(", ")}`);
    }

    if (m.examples && m.examples.length > 0) {
      lines.push("\nExamples:");
      for (const ex of m.examples) {
        if (ex.title) lines.push(`  ${ex.title}:`);
        lines.push(`  \`\`\`${ex.language ?? ""}`);
        lines.push(ex.code);
        lines.push("  ```");
      }
    }

    return lines.join("\n");
  }

  private formatEndpointFull(data: EndpointPageData): string {
    const lines: string[] = [];
    const method = data.method;
    const ep = method.endpointMapping!;

    lines.push(`${ep.method ?? "GET"} ${ep.path}`);
    lines.push(`Declared in: ${data.memberQualified}#${method.name}`);
    if (ep.description) lines.push(`Endpoint description: ${ep.description}`);
    if (method.description) lines.push(`Method description: ${method.description}`);

    if (method.params && method.params.length > 0) {
      lines.push("\nParameters:");
      for (const p of method.params) {
        lines.push(`  - ${p.name}: ${p.type}${p.required ? " (required)" : ""}${p.description ? ` -- ${p.description}` : ""}${p.default ? ` [default: ${p.default}]` : ""}`);
      }
    }

    if (method.returns) {
      lines.push(`\nReturns: ${method.returns.type ?? "void"}${method.returns.description ? ` -- ${method.returns.description}` : ""}`);
    }

    if (method.throws && method.throws.length > 0) {
      lines.push("\nThrows:");
      for (const t of method.throws) {
        lines.push(`  - ${t.type ?? "Exception"}${t.description ? `: ${t.description}` : ""}`);
      }
    }

    if (method.errorConditions && method.errorConditions.length > 0) {
      lines.push("\nError conditions:");
      for (const ec of method.errorConditions) {
        lines.push(`  - ${ec.type ?? "error"}${ec.code ? ` [${ec.code}]` : ""}${ec.description ? `: ${ec.description}` : ""}`);
      }
    }

    return lines.join("\n");
  }

  private formatFlowFull(data: FlowPageData): string {
    const lines: string[] = [];
    const flow = data.flow;

    lines.push(`Flow: ${flow.name ?? flow.id}`);
    lines.push(`ID: ${flow.id}`);
    if (flow.description) lines.push(`Description: ${flow.description}`);
    if (flow.trigger) lines.push(`Trigger: ${flow.trigger}`);

    lines.push("\nSteps:");
    for (const step of flow.steps) {
      lines.push(`  ${step.id}. ${step.name ?? step.actor ?? "step"}`);
      if (step.actor) lines.push(`    Actor: ${step.actor}`);
      if (step.actorQualified) lines.push(`    Qualified: ${step.actorQualified}`);
      if (step.description) lines.push(`    Description: ${step.description}`);
      if (step.type) lines.push(`    Type: ${step.type}`);
      if (step.ai) lines.push(`    AI: yes`);
      if (step.inputs && step.inputs.length > 0) lines.push(`    Inputs: ${step.inputs.join(", ")}`);
      if (step.outputs && step.outputs.length > 0) lines.push(`    Outputs: ${step.outputs.join(", ")}`);
    }

    if (data.traceView && data.traceView.length > 0) {
      lines.push("\nTrace view:");
      for (const trace of data.traceView) {
        const indent = "  ".repeat(trace.depth + 1);
        lines.push(`${indent}${trace.actor}${trace.description ? `: ${trace.description}` : ""}`);
      }
    }

    return lines.join("\n");
  }

  private formatDataModelFull(data: DataModelPageData): string {
    const lines: string[] = [];
    const dm = data.dataModel;

    lines.push(`Data Model: ${dm.name}`);
    lines.push(`Qualified: ${dm.qualified}`);
    if (dm.description) lines.push(`Description: ${dm.description}`);
    if (dm.table) lines.push(`Table: ${dm.table}`);
    if (dm.discoveredFrom) lines.push(`Discovered from: ${dm.discoveredFrom}`);

    if (dm.fields && dm.fields.length > 0) {
      lines.push("\nFields:");
      for (const f of dm.fields) {
        const attrs: string[] = [];
        if (f.primaryKey) attrs.push("PK");
        if (f.nullable === false) attrs.push("NOT NULL");
        if (f.unique) attrs.push("UNIQUE");
        if (f.length) attrs.push(`len=${f.length}`);
        lines.push(`  - ${f.name}: ${f.type}${attrs.length > 0 ? ` [${attrs.join(", ")}]` : ""}${f.description ? ` -- ${f.description}` : ""}`);
      }
    }

    if (dm.relationships && dm.relationships.length > 0) {
      lines.push("\nRelationships:");
      for (const rel of dm.relationships) {
        lines.push(`  - ${rel.type} -> ${rel.target}${rel.field ? ` (${rel.field})` : ""}${rel.cascade ? ` [cascade: ${rel.cascade}]` : ""}`);
      }
    }

    if (dm.jsonShape) {
      lines.push("\nJSON shape:");
      if (dm.jsonShape.fields) {
        for (const f of dm.jsonShape.fields) {
          lines.push(`  - ${f.jsonProperty ?? f.name}: ${f.type}${f.description ? ` -- ${f.description}` : ""}`);
        }
      }
    }

    if (dm.usedBy) {
      if (dm.usedBy.endpoints && dm.usedBy.endpoints.length > 0) {
        lines.push(`\nUsed by endpoints: ${dm.usedBy.endpoints.join(", ")}`);
      }
      if (dm.usedBy.repositories && dm.usedBy.repositories.length > 0) {
        lines.push(`Used by repositories: ${dm.usedBy.repositories.join(", ")}`);
      }
    }

    return lines.join("\n");
  }
}
