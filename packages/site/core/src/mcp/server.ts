/**
 * MCP (Model Context Protocol) server for DocSpec.
 * Exposes documentation as 7 queryable tools for AI agents.
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
  TestOverviewPageData,
  IntentGraphPageData,
  TestDetailPageData,
} from "../types/page.js";
import { PageType } from "../types/page.js";
import type {
  IntentMethod,
} from "../types/docspec.js";

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
// Structured result types (returned as JSON inside text content)
// ---------------------------------------------------------------------------

interface SearchResult {
  title: string;
  description: string;
  slug: string;
  type: string;
  qualified?: string;
}

interface SearchResponse {
  query: string;
  totalResults: number;
  results: SearchResult[];
}

interface ClassMethodInfo {
  name: string;
  description?: string;
  returnType?: string;
  params?: Array<{ name: string; type: string; required?: boolean; description?: string }>;
  throws?: Array<{ type?: string; description?: string }>;
  endpoint?: { method: string; path: string };
}

interface ClassFieldInfo {
  name: string;
  type: string;
  description?: string;
}

interface ClassConstructorInfo {
  params: Array<{ name: string; type: string }>;
  description?: string;
}

interface ClassResponse {
  qualifiedName: string;
  name: string;
  kind: string;
  description?: string;
  visibility?: string;
  since?: string;
  deprecated?: string | boolean | null;
  tags?: string[];
  extends?: string | null;
  implements?: string[];
  fields: ClassFieldInfo[];
  constructors: ClassConstructorInfo[];
  methods: ClassMethodInfo[];
  examples: Array<{ title?: string; language?: string; code: string }>;
  referencedIn: {
    flows: Array<{ label: string; url?: string }>;
    endpoints: Array<{ label: string; url?: string }>;
  };
}

interface EndpointParamInfo {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  default?: string | null;
}

interface EndpointResponse {
  httpMethod: string;
  path: string;
  description?: string;
  declaredIn: string;
  methodName: string;
  params: EndpointParamInfo[];
  returnType?: string;
  returnDescription?: string;
  errorConditions: Array<{ type?: string; code?: string; description?: string }>;
  throws: Array<{ type?: string; description?: string }>;
  performance?: { expectedLatency?: string; bottleneck?: string };
  linkedFlowId?: string;
}

interface FlowStepInfo {
  id: string;
  name?: string;
  actor?: string;
  actorQualified?: string;
  description?: string;
  type?: string;
  ai?: boolean;
  inputs?: string[];
  outputs?: string[];
  dataStoreOps?: Array<{ store: string; operation: string; tables?: string[] }>;
  configDependencies?: string[];
}

interface FlowResponse {
  id: string;
  name?: string;
  description?: string;
  trigger?: string;
  steps: FlowStepInfo[];
  traceView?: Array<{ actor: string; description?: string; type?: string; depth: number }>;
}

interface TraceStep {
  order: number;
  layer: string;
  actor: string;
  actorQualified?: string;
  description?: string;
  type?: string;
  dataStoreOps?: Array<{ store: string; operation: string; tables?: string[] }>;
  configDependencies?: string[];
}

interface TraceResponse {
  endpoint: string;
  httpMethod?: string;
  path?: string;
  controllerClass: string;
  controllerMethod: string;
  linkedFlowId?: string;
  linkedFlowName?: string;
  steps: TraceStep[];
}

interface ErrorInfo {
  code: string;
  httpStatus?: number;
  exception?: string;
  description?: string;
  causes?: string[];
  resolution?: string;
  thrownBy?: string[];
  endpoints?: string[];
}

interface ErrorsResponse {
  filter?: string;
  totalErrors: number;
  errors: ErrorInfo[];
}

interface TestMethodInfo {
  qualified: string;
  intentDensityScore?: number;
  nameSemantics?: { verb?: string; object?: string; intent?: string };
  guardClauses?: number;
  branches?: number;
  dataFlow?: { reads?: string[]; writes?: string[] };
  loopProperties?: { hasStreams?: boolean; hasEnhancedFor?: boolean; streamOps?: string[] };
  errorHandling?: { catchBlocks?: number; caughtTypes?: string[] };
  nullChecks?: number;
  assertions?: number;
  logStatements?: number;
  validationAnnotations?: number;
  contractChecks?: {
    hasEquals?: boolean;
    hasHashCode?: boolean;
    hasCompareTo?: boolean;
    hasToString?: boolean;
  };
}

interface TestsResponse {
  qualifiedName: string;
  found: boolean;
  methods: TestMethodInfo[];
  summary: {
    totalMethods: number;
    avgIsdScore: number;
    methodsWithHighIsd: number;
    methodsWithLowIsd: number;
  };
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
        name: "search",
        description:
          "Full-text search across all loaded docspec.json data. Returns top 10 matching members, methods, endpoints, flows, errors, and more with title, description, and slug.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query string — keywords or phrases to match against documentation titles, descriptions, qualified names, and content.",
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
      {
        name: "get-class",
        description:
          "Returns full documentation for a class, interface, struct, or component by its qualified name. Includes all methods, fields, constructors, examples, and which endpoints/flows reference it.",
        inputSchema: {
          type: "object",
          properties: {
            qualifiedName: {
              type: "string",
              description: "Fully qualified name of the class/interface/struct (e.g. com.example.UserService or just UserService).",
            },
          },
          required: ["qualifiedName"],
          additionalProperties: false,
        },
      },
      {
        name: "get-endpoint",
        description:
          "Returns endpoint documentation: HTTP method, path, parameters, response type, error conditions, performance, and linked flow.",
        inputSchema: {
          type: "object",
          properties: {
            method: {
              type: "string",
              description: "HTTP method (GET, POST, PUT, DELETE, PATCH). If omitted, matches any method.",
            },
            path: {
              type: "string",
              description: "Endpoint path (e.g. /api/users or /api/users/{id}).",
            },
          },
          required: ["path"],
          additionalProperties: false,
        },
      },
      {
        name: "get-flow",
        description:
          "Returns flow documentation: all steps with actor, type, data store ops, config dependencies, and the full trace.",
        inputSchema: {
          type: "object",
          properties: {
            flowId: {
              type: "string",
              description: "Flow ID or name to look up.",
            },
          },
          required: ["flowId"],
          additionalProperties: false,
        },
      },
      {
        name: "get-trace",
        description:
          "Returns the full execution trace for an endpoint, combining OpenAPI trigger, controller, flow steps, and data store ops into a single ordered trace.",
        inputSchema: {
          type: "object",
          properties: {
            endpoint: {
              type: "string",
              description: "Endpoint path to trace (e.g. /api/users). Optionally prefix with HTTP method like 'POST /api/users'.",
            },
          },
          required: ["endpoint"],
          additionalProperties: false,
        },
      },
      {
        name: "get-errors",
        description:
          "Returns error catalog. If code is provided, returns details for that specific error code. Otherwise returns all documented errors.",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Specific error code to look up (e.g. USER_NOT_FOUND). If omitted, returns all errors.",
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: "get-tests",
        description:
          "Returns DSTI (Deep Structural & Textual Intent) test information for a class or method: intent signals per method, ISD score, and gap summary.",
        inputSchema: {
          type: "object",
          properties: {
            qualifiedName: {
              type: "string",
              description: "Qualified name of the class or method to get test/intent info for.",
            },
          },
          required: ["qualifiedName"],
          additionalProperties: false,
        },
      },
    ];
  }

  // -----------------------------------------------------------------------
  // Tool execution
  // -----------------------------------------------------------------------

  executeTool(name: string, args: Record<string, unknown>): MCPToolResult {
    switch (name) {
      case "search":
        return this.handleSearch(args.query as string);
      case "get-class":
        return this.handleGetClass(args.qualifiedName as string);
      case "get-endpoint":
        return this.handleGetEndpoint(args.method as string | undefined, args.path as string);
      case "get-flow":
        return this.handleGetFlow(args.flowId as string);
      case "get-trace":
        return this.handleGetTrace(args.endpoint as string);
      case "get-errors":
        return this.handleGetErrors(args.code as string | undefined);
      case "get-tests":
        return this.handleGetTests(args.qualifiedName as string);
      default:
        return this.jsonResult({ error: `Unknown tool: ${name}`, availableTools: this.getTools().map(t => t.name) });
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
              version: "3.0.0",
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
  // Tool handlers
  // -----------------------------------------------------------------------

  private handleSearch(query: string): MCPToolResult {
    if (!query || query.trim().length === 0) {
      return this.jsonResult({ error: "Please provide a non-empty search query.", query: "", totalResults: 0, results: [] });
    }

    const queryLower = query.toLowerCase();
    const tokens = queryLower.split(/\s+/).filter(Boolean);
    const scored: Array<{ score: number; result: SearchResult }> = [];

    for (const page of this.siteData.pages) {
      const score = this.scoreMatch(page, tokens);
      if (score > 0) {
        scored.push({ score, result: this.buildSearchResult(page) });
      }
    }

    // Sort by score descending, take top 10
    scored.sort((a, b) => b.score - a.score);
    const top10 = scored.slice(0, 10);

    const response: SearchResponse = {
      query,
      totalResults: scored.length,
      results: top10.map(s => s.result),
    };

    return this.jsonResult(response);
  }

  private handleGetClass(qualifiedName: string): MCPToolResult {
    if (!qualifiedName) {
      return this.jsonResult({ error: "Please provide a qualifiedName parameter." });
    }

    const qualLower = qualifiedName.toLowerCase();

    // Exact match first
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.MEMBER) continue;
      const data = page.data as MemberPageData;
      if (
        data.member.qualified.toLowerCase() === qualLower ||
        data.member.name.toLowerCase() === qualLower
      ) {
        return this.jsonResult(this.buildClassResponse(data, page));
      }
    }

    // Partial match suggestions
    const suggestions: Array<{ qualifiedName: string; kind: string; slug: string }> = [];
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.MEMBER) continue;
      const data = page.data as MemberPageData;
      if (
        data.member.qualified.toLowerCase().includes(qualLower) ||
        data.member.name.toLowerCase().includes(qualLower)
      ) {
        suggestions.push({
          qualifiedName: data.member.qualified,
          kind: data.member.kind,
          slug: page.slug,
        });
      }
    }

    if (suggestions.length > 0) {
      return this.jsonResult({
        error: `No exact match for "${qualifiedName}".`,
        suggestions,
      });
    }

    return this.jsonResult({ error: `Class "${qualifiedName}" not found. No partial matches either.` });
  }

  private handleGetEndpoint(method: string | undefined, path: string): MCPToolResult {
    if (!path) {
      return this.jsonResult({ error: "Please provide a path parameter." });
    }

    const pathLower = path.toLowerCase();
    const methodUpper = method?.toUpperCase();
    const matches: EndpointResponse[] = [];

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
        matches.push(this.buildEndpointResponse(data));
      }
    }

    if (matches.length === 0) {
      return this.jsonResult({
        error: `No endpoint found matching ${methodUpper ?? "*"} ${path}.`,
        availableEndpoints: this.listEndpointSummaries(),
      });
    }

    if (matches.length === 1) {
      return this.jsonResult(matches[0]);
    }

    return this.jsonResult({ matchCount: matches.length, endpoints: matches });
  }

  private handleGetFlow(flowId: string): MCPToolResult {
    if (!flowId) {
      return this.jsonResult({ error: "Please provide a flowId parameter." });
    }

    const idLower = flowId.toLowerCase();

    // Exact match
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.FLOW) continue;
      const data = page.data as FlowPageData;
      if (
        data.flow.id.toLowerCase() === idLower ||
        (data.flow.name && data.flow.name.toLowerCase() === idLower)
      ) {
        return this.jsonResult(this.buildFlowResponse(data));
      }
    }

    // Partial match suggestions
    const suggestions: Array<{ id: string; name?: string; stepCount: number }> = [];
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.FLOW) continue;
      const data = page.data as FlowPageData;
      if (
        data.flow.id.toLowerCase().includes(idLower) ||
        (data.flow.name && data.flow.name.toLowerCase().includes(idLower))
      ) {
        suggestions.push({
          id: data.flow.id,
          name: data.flow.name,
          stepCount: data.flow.steps.length,
        });
      }
    }

    if (suggestions.length > 0) {
      return this.jsonResult({
        error: `No exact match for flow "${flowId}".`,
        suggestions,
      });
    }

    return this.jsonResult({ error: `Flow "${flowId}" not found. No partial matches either.` });
  }

  private handleGetTrace(endpoint: string): MCPToolResult {
    if (!endpoint) {
      return this.jsonResult({ error: "Please provide an endpoint parameter (e.g. '/api/users' or 'POST /api/users')." });
    }

    // Parse optional method prefix: "POST /api/users" or just "/api/users"
    let filterMethod: string | undefined;
    let filterPath: string;
    const parts = endpoint.trim().split(/\s+/);
    if (parts.length >= 2 && /^[A-Za-z]+$/.test(parts[0])) {
      filterMethod = parts[0].toUpperCase();
      filterPath = parts.slice(1).join(" ").toLowerCase();
    } else {
      filterPath = endpoint.trim().toLowerCase();
    }

    // Find matching endpoint pages
    const endpointMatches: EndpointPageData[] = [];
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.ENDPOINT) continue;
      const data = page.data as EndpointPageData;
      const ep = data.method.endpointMapping;
      if (!ep) continue;

      const epPath = ep.path?.toLowerCase() ?? "";
      const epMethod = ep.method?.toUpperCase();

      const pathMatch = epPath === filterPath || epPath.includes(filterPath) || filterPath.includes(epPath);
      const methodMatch = !filterMethod || epMethod === filterMethod;

      if (pathMatch && methodMatch) {
        endpointMatches.push(data);
      }
    }

    if (endpointMatches.length === 0) {
      return this.jsonResult({
        error: `No endpoint found matching "${endpoint}". Cannot build trace.`,
        availableEndpoints: this.listEndpointSummaries(),
      });
    }

    const traces: TraceResponse[] = [];

    for (const epData of endpointMatches) {
      const trace = this.buildTraceForEndpoint(epData);
      traces.push(trace);
    }

    if (traces.length === 1) {
      return this.jsonResult(traces[0]);
    }

    return this.jsonResult({ matchCount: traces.length, traces });
  }

  private handleGetErrors(code?: string): MCPToolResult {
    const allErrors = this.collectAllErrors();

    if (allErrors.length === 0) {
      return this.jsonResult({ error: "No error codes documented.", totalErrors: 0, errors: [] });
    }

    if (code) {
      const codeLower = code.toLowerCase();
      const matched = allErrors.filter(
        e => e.code.toLowerCase() === codeLower || e.code.toLowerCase().includes(codeLower)
      );

      if (matched.length === 0) {
        return this.jsonResult({
          error: `Error code "${code}" not found.`,
          availableCodes: allErrors.map(e => e.code),
        });
      }

      const response: ErrorsResponse = {
        filter: code,
        totalErrors: matched.length,
        errors: matched,
      };
      return this.jsonResult(response);
    }

    const response: ErrorsResponse = {
      totalErrors: allErrors.length,
      errors: allErrors,
    };
    return this.jsonResult(response);
  }

  private handleGetTests(qualifiedName: string): MCPToolResult {
    if (!qualifiedName) {
      return this.jsonResult({ error: "Please provide a qualifiedName parameter." });
    }

    const qualLower = qualifiedName.toLowerCase();
    const intentMethods = this.collectIntentMethods();

    // Filter methods matching the qualified name (class-level or method-level)
    const matched = intentMethods.filter(m => {
      const mLower = m.qualified.toLowerCase();
      return mLower === qualLower || mLower.includes(qualLower) || qualLower.includes(mLower);
    });

    if (matched.length === 0) {
      // Check if the class exists at all
      const classExists = this.siteData.pages.some(p => {
        if (p.type !== PageType.MEMBER) return false;
        const data = p.data as MemberPageData;
        return data.member.qualified.toLowerCase().includes(qualLower) ||
               data.member.name.toLowerCase().includes(qualLower);
      });

      if (classExists) {
        return this.jsonResult({
          qualifiedName,
          found: false,
          message: `Class "${qualifiedName}" exists but has no DSTI intent data. Run the processor with DSTI enabled.`,
          methods: [],
          summary: { totalMethods: 0, avgIsdScore: 0, methodsWithHighIsd: 0, methodsWithLowIsd: 0 },
        });
      }

      return this.jsonResult({
        qualifiedName,
        found: false,
        message: `No class or method found matching "${qualifiedName}".`,
        methods: [],
        summary: { totalMethods: 0, avgIsdScore: 0, methodsWithHighIsd: 0, methodsWithLowIsd: 0 },
      });
    }

    const methodInfos: TestMethodInfo[] = matched.map(m => this.buildTestMethodInfo(m));

    const isdScores = methodInfos
      .map(m => m.intentDensityScore)
      .filter((s): s is number => s !== undefined);

    const avgIsd = isdScores.length > 0
      ? isdScores.reduce((a, b) => a + b, 0) / isdScores.length
      : 0;

    const response: TestsResponse = {
      qualifiedName,
      found: true,
      methods: methodInfos,
      summary: {
        totalMethods: methodInfos.length,
        avgIsdScore: Math.round(avgIsd * 1000) / 1000,
        methodsWithHighIsd: isdScores.filter(s => s >= 0.7).length,
        methodsWithLowIsd: isdScores.filter(s => s < 0.3).length,
      },
    };

    return this.jsonResult(response);
  }

  // -----------------------------------------------------------------------
  // Builder helpers
  // -----------------------------------------------------------------------

  private buildSearchResult(page: GeneratedPage): SearchResult {
    const result: SearchResult = {
      title: page.title,
      description: page.description ?? "",
      slug: page.slug,
      type: page.type,
    };

    switch (page.type) {
      case PageType.MEMBER: {
        const data = page.data as MemberPageData;
        result.qualified = data.member.qualified;
        break;
      }
      case PageType.ENDPOINT: {
        const data = page.data as EndpointPageData;
        const ep = data.method.endpointMapping;
        if (ep) {
          result.description = `${ep.method ?? "GET"} ${ep.path}${data.method.description ? " - " + data.method.description : ""}`;
        }
        result.qualified = `${data.memberQualified}#${data.method.name}`;
        break;
      }
      case PageType.FLOW: {
        const data = page.data as FlowPageData;
        result.qualified = data.flow.id;
        break;
      }
      case PageType.MODULE: {
        const data = page.data as ModulePageData;
        result.qualified = data.module.id;
        break;
      }
    }

    return result;
  }

  private buildClassResponse(data: MemberPageData, page: GeneratedPage): ClassResponse {
    const m = data.member;

    const fields: ClassFieldInfo[] = (m.fields ?? []).map(f => ({
      name: f.name,
      type: f.type,
      description: f.description,
    }));

    const constructors: ClassConstructorInfo[] = (m.constructors ?? []).map(ctor => ({
      params: (ctor.params ?? []).map(p => ({ name: p.name, type: p.type })),
      description: ctor.description,
    }));

    const methods: ClassMethodInfo[] = (m.methods ?? []).map(method => {
      const info: ClassMethodInfo = {
        name: method.name,
        description: method.description,
        returnType: method.returns?.type,
        params: (method.params ?? []).map(p => ({
          name: p.name,
          type: p.type,
          required: p.required,
          description: p.description,
        })),
        throws: (method.throws ?? []).map(t => ({
          type: t.type,
          description: t.description,
        })),
      };
      if (method.endpointMapping) {
        info.endpoint = {
          method: method.endpointMapping.method ?? "GET",
          path: method.endpointMapping.path ?? "",
        };
      }
      return info;
    });

    const examples = (m.examples ?? []).map(ex => ({
      title: ex.title,
      language: ex.language,
      code: ex.code,
    }));

    const referencedIn = {
      flows: data.referencedIn?.flows ?? [],
      endpoints: data.referencedIn?.endpoints ?? [],
    };

    return {
      qualifiedName: m.qualified,
      name: m.name,
      kind: m.kind,
      description: m.description,
      visibility: m.visibility,
      since: m.since,
      deprecated: m.deprecated,
      tags: m.tags,
      extends: m.extends,
      implements: m.implements,
      fields,
      constructors,
      methods,
      examples,
      referencedIn,
    };
  }

  private buildEndpointResponse(data: EndpointPageData): EndpointResponse {
    const method = data.method;
    const ep = method.endpointMapping!;

    return {
      httpMethod: ep.method ?? "GET",
      path: ep.path ?? "",
      description: method.description ?? ep.description,
      declaredIn: data.memberQualified,
      methodName: method.name,
      params: (method.params ?? []).map(p => ({
        name: p.name,
        type: p.type,
        required: p.required,
        description: p.description,
        default: p.default,
      })),
      returnType: method.returns?.type,
      returnDescription: method.returns?.description,
      errorConditions: (method.errorConditions ?? []).map(ec => ({
        type: ec.type,
        code: ec.code,
        description: ec.description,
      })),
      throws: (method.throws ?? []).map(t => ({
        type: t.type,
        description: t.description,
      })),
      performance: method.performance ? {
        expectedLatency: method.performance.expectedLatency,
        bottleneck: method.performance.bottleneck,
      } : undefined,
      linkedFlowId: data.linkedFlowId,
    };
  }

  private buildFlowResponse(data: FlowPageData): FlowResponse {
    const flow = data.flow;

    const steps: FlowStepInfo[] = flow.steps.map(step => ({
      id: step.id,
      name: step.name,
      actor: step.actor,
      actorQualified: step.actorQualified,
      description: step.description,
      type: step.type,
      ai: step.ai,
      inputs: step.inputs,
      outputs: step.outputs,
      dataStoreOps: step.dataStoreOps?.map(op => ({
        store: op.store,
        operation: op.operation,
        tables: op.tables,
      })),
      configDependencies: step.configDependencies,
    }));

    const traceView = data.traceView?.map(t => ({
      actor: t.actor,
      description: t.description,
      type: t.type,
      depth: t.depth,
    }));

    return {
      id: flow.id,
      name: flow.name,
      description: flow.description,
      trigger: flow.trigger,
      steps,
      traceView,
    };
  }

  private buildTraceForEndpoint(epData: EndpointPageData): TraceResponse {
    const ep = epData.method.endpointMapping!;
    const trace: TraceResponse = {
      endpoint: `${ep.method ?? "GET"} ${ep.path ?? ""}`,
      httpMethod: ep.method ?? "GET",
      path: ep.path,
      controllerClass: epData.memberQualified,
      controllerMethod: epData.method.name,
      linkedFlowId: epData.linkedFlowId,
      steps: [],
    };

    let order = 1;

    // Step 1: HTTP trigger (OpenAPI level)
    trace.steps.push({
      order: order++,
      layer: "http",
      actor: "HTTP Client",
      description: `${ep.method ?? "GET"} ${ep.path ?? ""}`,
      type: "trigger",
    });

    // Step 2: Controller method
    trace.steps.push({
      order: order++,
      layer: "controller",
      actor: epData.memberName,
      actorQualified: epData.memberQualified,
      description: `${epData.method.name}(${(epData.method.params ?? []).map(p => p.name).join(", ")})`,
      type: "process",
    });

    // Step 3+: If there's a linked flow, include its steps
    if (epData.linkedFlowId) {
      const flowPage = this.findFlowById(epData.linkedFlowId);
      if (flowPage) {
        trace.linkedFlowName = flowPage.flow.name;
        for (const step of flowPage.flow.steps) {
          trace.steps.push({
            order: order++,
            layer: "flow",
            actor: step.actor ?? step.name ?? `step-${step.id}`,
            actorQualified: step.actorQualified,
            description: step.description,
            type: step.type,
            dataStoreOps: step.dataStoreOps?.map(op => ({
              store: op.store,
              operation: op.operation,
              tables: op.tables,
            })),
            configDependencies: step.configDependencies,
          });
        }
      }
    }

    // If no linked flow, try to trace via method body references
    if (!epData.linkedFlowId) {
      // Check if the endpoint method references any member dependencies
      const memberPage = this.findMemberByQualified(epData.memberQualified);
      if (memberPage) {
        const deps = memberPage.member.dependencies ?? [];
        for (const dep of deps) {
          trace.steps.push({
            order: order++,
            layer: "dependency",
            actor: dep.name,
            description: `Injected ${dep.classification ?? "dependency"}: ${dep.type ?? dep.name}`,
            type: dep.classification === "repository" || dep.classification === "database" ? "storage" : "process",
          });
        }
      }
    }

    return trace;
  }

  private buildTestMethodInfo(m: IntentMethod): TestMethodInfo {
    const signals = m.intentSignals;
    const info: TestMethodInfo = {
      qualified: m.qualified,
    };

    if (signals) {
      info.intentDensityScore = signals.intentDensityScore;
      info.nameSemantics = signals.nameSemantics;
      info.guardClauses = typeof signals.guardClauses === "number"
        ? signals.guardClauses
        : (signals.guardClauses as unknown[])?.length ?? 0;
      info.branches = typeof signals.branches === "number"
        ? signals.branches
        : (signals.branches as unknown[])?.length ?? 0;
      info.dataFlow = signals.dataFlow;
      info.loopProperties = signals.loopProperties;
      info.errorHandling = signals.errorHandling;
      info.nullChecks = signals.nullChecks;
      info.assertions = signals.assertions;
      info.logStatements = signals.logStatements;
      info.validationAnnotations = signals.validationAnnotations;
      info.contractChecks = signals.contractChecks;
    }

    return info;
  }

  // -----------------------------------------------------------------------
  // Data collection helpers
  // -----------------------------------------------------------------------

  private collectAllErrors(): ErrorInfo[] {
    const errors: ErrorInfo[] = [];
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.ERROR_CATALOG) continue;
      const data = page.data as ErrorCatalogPageData;
      for (const err of data.errors) {
        errors.push({
          code: err.code,
          httpStatus: err.httpStatus,
          exception: err.exception,
          description: err.description,
          causes: err.causes,
          resolution: err.resolution,
          thrownBy: err.thrownBy,
          endpoints: err.endpoints,
        });
      }
    }
    return errors;
  }

  private collectIntentMethods(): IntentMethod[] {
    const methods: IntentMethod[] = [];

    // Gather from IntentGraph pages
    for (const page of this.siteData.pages) {
      if (page.type === PageType.INTENT_GRAPH || page.type === PageType.TEST_OVERVIEW) {
        const data = page.data as IntentGraphPageData | TestOverviewPageData;
        if (data.intentGraph?.methods) {
          methods.push(...data.intentGraph.methods);
        }
      }
      if (page.type === PageType.TEST_DETAIL) {
        const data = page.data as TestDetailPageData;
        if (data.methods) {
          methods.push(...data.methods);
        }
      }
    }

    return methods;
  }

  private findFlowById(flowId: string): FlowPageData | null {
    const idLower = flowId.toLowerCase();
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.FLOW) continue;
      const data = page.data as FlowPageData;
      if (data.flow.id.toLowerCase() === idLower ||
          (data.flow.name && data.flow.name.toLowerCase() === idLower)) {
        return data;
      }
    }
    return null;
  }

  private findMemberByQualified(qualified: string): MemberPageData | null {
    const qualLower = qualified.toLowerCase();
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.MEMBER) continue;
      const data = page.data as MemberPageData;
      if (data.member.qualified.toLowerCase() === qualLower) {
        return data;
      }
    }
    return null;
  }

  private listEndpointSummaries(): Array<{ method: string; path: string }> {
    const endpoints: Array<{ method: string; path: string }> = [];
    for (const page of this.siteData.pages) {
      if (page.type !== PageType.ENDPOINT) continue;
      const data = page.data as EndpointPageData;
      const ep = data.method.endpointMapping;
      if (ep) {
        endpoints.push({ method: ep.method ?? "GET", path: ep.path ?? "" });
      }
    }
    return endpoints;
  }

  // -----------------------------------------------------------------------
  // Search scoring
  // -----------------------------------------------------------------------

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
      case PageType.INTENT_GRAPH:
      case PageType.TEST_OVERVIEW: {
        const data = page.data as IntentGraphPageData | TestOverviewPageData;
        if (data.intentGraph?.methods) {
          for (const m of data.intentGraph.methods) {
            parts.push(m.qualified);
          }
        }
        break;
      }
    }

    return parts.join(" ");
  }

  // -----------------------------------------------------------------------
  // Result formatter
  // -----------------------------------------------------------------------

  private jsonResult(data: unknown): MCPToolResult {
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
}
