/**
 * TypeScript types for docspec.config.yaml
 * Derived from spec section 12.2
 */

export interface DocSpecConfig {
  site: SiteConfig;
  repositories?: Record<string, RepositoryConfig>;
  resolution?: ResolutionConfig;
  artifacts?: ArtifactEntry[];
  openapi?: OpenApiEntry[];
  guides?: GuideEntry[];
  navigation?: NavigationSection[];
  build?: BuildConfig;
  ai?: AiConfig;
  analytics?: AnalyticsConfig;
  protocols?: ProtocolsConfig;
  dataStores?: DataStoresConfig;
  endpointMappings?: EndpointMappingEntry[];
}

export interface SiteConfig {
  name: string;
  logo?: string;
  favicon?: string;
  theme?: string;
  baseUrl?: string;
  editUrl?: string;
}

export interface RepositoryConfig {
  type?: "maven" | "npm" | "crates" | "pypi" | "nuget";
  url?: string;
  import?: string;
  auth?: RepositoryAuth;
}

export interface RepositoryAuth {
  type: "none" | "bearer" | "basic" | "aws" | "gcp" | "azure" | "file";
  token?: string;
  username?: string;
  password?: string;
  profile?: string;
  keyFile?: string;
  pat?: string;
}

export interface ResolutionConfig {
  maven?: { order: string[] };
  npm?: { order: string[] };
  crates?: { order: string[] };
  pypi?: { order: string[] };
  nuget?: { order: string[] };
}

export interface ArtifactEntry {
  /** Local file path to docspec.json */
  path?: string;

  /** Maven coordinates */
  groupId?: string;
  artifactId?: string;

  /** npm coordinates */
  scope?: string;
  package?: string;

  /** Crates coordinates */
  crate?: string;

  /** PyPI coordinates */
  pypiPackage?: string;

  /** NuGet coordinates */
  nugetPackage?: string;

  /** Common fields */
  version?: string;
  repository?: string;
  label?: string;
  color?: string;
}

export interface OpenApiEntry {
  path: string;
  label?: string;
  baseUrl?: string;
}

export interface GuideEntry {
  path: string;
  label?: string;
}

export interface NavigationSection {
  section: string;
  items?: string[];
  auto?: boolean;
  tab?: "docs" | "tests";
}

export interface BuildConfig {
  outputDir?: string;
  cacheDir?: string;
  search?: boolean;
  codeLanguages?: string[];
  versioning?: boolean;
  audiences?: string[];
}

export interface AiConfig {
  llmsTxt?: boolean;
  contextFile?: boolean;
  mcpServer?: boolean;
  embeddings?: boolean;
}

export interface AnalyticsConfig {
  provider?: "plausible" | "posthog" | "google" | "none";
  siteId?: string;
  feedback?: boolean;
}

export interface ProtocolsConfig {
  rest?: { openapi?: string };
  graphql?: { schema?: string };
  grpc?: { protoDir?: string };
  websocket?: { spec?: string };
  asyncapi?: { spec?: string };
  cli?: { commands?: string };
}

export interface DataStoresConfig {
  introspection?: "live" | "migration" | "orm";
  connectionString?: string;
  migrationDir?: string;
}

export interface EndpointMappingEntry {
  pattern: string;
  method: string;
  path: string;
}
