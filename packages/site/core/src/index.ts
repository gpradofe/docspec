// @docspec/core - public API

// Types
export * from "./types/index.js";

// Config
export { loadConfig } from "./config/loader.js";

// Resolver
export { resolveArtifacts } from "./resolver/index.js";

// Generator
export { generatePages } from "./generator/index.js";

// Cross-linker
export { crossLink } from "./cross-linker/index.js";

// Pipeline
export { buildSite } from "./pipeline.js";

// Search
export { buildSearchIndex, buildSearchEntries } from "./search/index.js";
export type { SearchEntry } from "./search/index.js";

// Export - LLM context files
export { generateLlmsTxt } from "./export/llms-txt.js";
export { generateLlmsFullTxt } from "./export/llms-full-txt.js";

// Export - OpenAPI
export { generateOpenAPI } from "./export/openapi.js";

// Diff engine
export { diffSpecs, computeDiff } from "./diff/engine.js";
export type {
  DiffResult,
  DiffEntry,
  StructuredDiffResult,
  DiffSummary,
  MemberDiff,
  MethodDiff,
  FlowDiff,
  EntityDiff,
} from "./diff/engine.js";

// MCP Server
export { DocSpecMCPServer } from "./mcp/server.js";
export type { MCPTool, MCPToolResult } from "./mcp/server.js";
