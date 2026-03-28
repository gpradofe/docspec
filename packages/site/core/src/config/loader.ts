import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import type { DocSpecConfig } from "../types/config.js";
import { DEFAULT_BUILD_CONFIG, DEFAULT_THEME } from "./defaults.js";

// ---------------------------------------------------------------------------
// Zod schema – mirrors the DocSpecConfig TypeScript interface
// ---------------------------------------------------------------------------

const RepositoryAuthSchema = z.object({
  type: z.enum(["none", "bearer", "basic", "aws", "gcp", "azure", "file"]),
  token: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  profile: z.string().optional(),
  keyFile: z.string().optional(),
  pat: z.string().optional(),
});

const RepositoryConfigSchema = z.object({
  type: z.enum(["maven", "npm", "crates"]).optional(),
  url: z.string().optional(),
  import: z.string().optional(),
  auth: RepositoryAuthSchema.optional(),
});

const SiteConfigSchema = z.object({
  name: z.string(),
  logo: z.string().optional(),
  favicon: z.string().optional(),
  theme: z.string().optional(),
  baseUrl: z.string().optional(),
  editUrl: z.string().optional(),
});

const ResolutionConfigSchema = z.object({
  maven: z.object({ order: z.array(z.string()) }).optional(),
  npm: z.object({ order: z.array(z.string()) }).optional(),
  crates: z.object({ order: z.array(z.string()) }).optional(),
});

const ArtifactEntrySchema = z.object({
  path: z.string().optional(),
  groupId: z.string().optional(),
  artifactId: z.string().optional(),
  scope: z.string().optional(),
  package: z.string().optional(),
  crate: z.string().optional(),
  version: z.string().optional(),
  repository: z.string().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
});

const OpenApiEntrySchema = z.object({
  path: z.string(),
  label: z.string().optional(),
  baseUrl: z.string().optional(),
});

const GuideEntrySchema = z.object({
  path: z.string(),
  label: z.string().optional(),
});

const NavigationSectionSchema = z.object({
  section: z.string(),
  items: z.array(z.string()).optional(),
  auto: z.boolean().optional(),
  tab: z.enum(["docs", "tests"]).optional(),
});

const BuildConfigSchema = z.object({
  outputDir: z.string().optional(),
  cacheDir: z.string().optional(),
  search: z.boolean().optional(),
  codeLanguages: z.array(z.string()).optional(),
  versioning: z.boolean().optional(),
  audiences: z.array(z.string()).optional(),
});

const AiConfigSchema = z.object({
  llmsTxt: z.boolean().optional(),
  contextFile: z.boolean().optional(),
  mcpServer: z.boolean().optional(),
  embeddings: z.boolean().optional(),
});

const AnalyticsConfigSchema = z.object({
  provider: z.enum(["plausible", "posthog", "google", "none"]).optional(),
  siteId: z.string().optional(),
  feedback: z.boolean().optional(),
});

const DocSpecConfigSchema = z.object({
  site: SiteConfigSchema,
  repositories: z.record(z.string(), RepositoryConfigSchema).optional(),
  resolution: ResolutionConfigSchema.optional(),
  artifacts: z.array(ArtifactEntrySchema).optional(),
  openapi: z.array(OpenApiEntrySchema).optional(),
  guides: z.array(GuideEntrySchema).optional(),
  navigation: z.array(NavigationSectionSchema).optional(),
  build: BuildConfigSchema.optional(),
  ai: AiConfigSchema.optional(),
  analytics: AnalyticsConfigSchema.optional(),
});

// ---------------------------------------------------------------------------
// Environment variable interpolation
// ---------------------------------------------------------------------------

const ENV_VAR_PATTERN = /\$\{([^}]+)\}/g;

/**
 * Replace `${ENV_VAR}` patterns in a string with the corresponding
 * `process.env` value. If the variable is not set the placeholder is
 * replaced with an empty string.
 */
function interpolateEnvVars(value: string): string {
  return value.replace(ENV_VAR_PATTERN, (_match, varName: string) => {
    return process.env[varName] ?? "";
  });
}

/**
 * Walk an object tree and interpolate environment variables in every
 * string value.
 */
function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === "string") {
    return interpolateEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = resolveEnvVars(value);
    }
    return result;
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Relative path resolution
// ---------------------------------------------------------------------------

/**
 * If `filePath` is not absolute, resolve it relative to `baseDir`.
 */
function resolveRelativePath(filePath: string, baseDir: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(baseDir, filePath);
}

/**
 * Resolve relative `path` fields inside artifact, openapi and guide entries
 * so they are absolute with respect to the config file's directory.
 */
function resolveRelativePaths(
  config: DocSpecConfig,
  configDir: string,
): DocSpecConfig {
  if (config.artifacts) {
    config.artifacts = config.artifacts.map((entry) => {
      if (entry.path) {
        return { ...entry, path: resolveRelativePath(entry.path, configDir) };
      }
      return entry;
    });
  }

  if (config.openapi) {
    config.openapi = config.openapi.map((entry) => ({
      ...entry,
      path: resolveRelativePath(entry.path, configDir),
    }));
  }

  if (config.guides) {
    config.guides = config.guides.map((entry) => ({
      ...entry,
      path: resolveRelativePath(entry.path, configDir),
    }));
  }

  return config;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function applyDefaults(config: DocSpecConfig): DocSpecConfig {
  // Theme default
  if (!config.site.theme) {
    config.site.theme = DEFAULT_THEME;
  }

  // Build config defaults – user-provided values override defaults
  config.build = {
    ...DEFAULT_BUILD_CONFIG,
    ...config.build,
  };

  return config;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load, validate and return a fully-resolved `DocSpecConfig` from a
 * `docspec.config.yaml` file.
 *
 * @param configPath - Absolute or relative path to the YAML config file.
 * @returns A validated and defaults-applied `DocSpecConfig`.
 */
export async function loadConfig(configPath: string): Promise<DocSpecConfig> {
  // 1. Read the YAML file
  const absolutePath = path.resolve(configPath);
  const configDir = path.dirname(absolutePath);

  let raw: string;
  try {
    raw = await fs.readFile(absolutePath, "utf-8");
  } catch (err) {
    throw new Error(
      `Failed to read config file at "${absolutePath}": ${(err as Error).message}`,
    );
  }

  // 2. Parse YAML
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse YAML in "${absolutePath}": ${(err as Error).message}`,
    );
  }

  if (parsed === null || parsed === undefined || typeof parsed !== "object") {
    throw new Error(
      `Config file "${absolutePath}" did not produce a valid YAML object.`,
    );
  }

  // 3. Validate against Zod schema
  const result = DocSpecConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid docspec config in "${absolutePath}":\n${issues}`,
    );
  }

  let config: DocSpecConfig = result.data;

  // 4. Resolve ${ENV_VAR} patterns (especially in auth tokens)
  config = resolveEnvVars(config) as DocSpecConfig;

  // 5. Resolve relative paths for artifacts, openapi, guides
  config = resolveRelativePaths(config, configDir);

  // 6. Apply defaults
  config = applyDefaults(config);

  return config;
}
