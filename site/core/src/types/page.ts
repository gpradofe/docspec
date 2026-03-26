/**
 * Page types and generated page data structures
 */

import type {
  DocSpec,
  Module,
  Member,
  Method,
  Flow,
  Context,
  DataModel,
  DocError,
  DocEvent,
  CrossRef,
  DataStore,
  ConfigurationProperty,
  Security,
  ExternalDependency,
  PrivacyField,
  IntentGraph,
  IntentMethod,
  Observability,
} from "./docspec.js";

export enum PageType {
  GUIDE = "guide",
  MODULE = "module",
  MEMBER = "member",
  ENDPOINT = "endpoint",
  FLOW = "flow",
  DATA_MODEL = "data-model",
  ERROR_CATALOG = "error-catalog",
  EVENT_CATALOG = "event-catalog",
  GRAPH = "graph",
  OPERATIONS = "operations",
  CHANGELOG = "changelog",
  LANDING = "landing",
  DATA_STORE = "data-store-page",
  CONFIGURATION = "configuration",
  SECURITY = "security",
  DEPENDENCY_MAP = "dependency-map",
  PRIVACY = "privacy",
  TEST_OVERVIEW = "test-overview",
  INTENT_GRAPH = "intent-graph",
  TEST_DETAIL = "test-detail",
  FLOW_TEST = "flow-test",
  GAP_REPORT = "gap-report",
  OBSERVABILITY = "observability",
  GRAPHQL = "graphql",
  GRPC = "grpc",
  WEBSOCKET = "websocket",
  ASYNC_API = "async-api",
  CLI_PROTOCOL = "cli-protocol",
  TEST_DASHBOARD = "test-dashboard",
}

export interface GeneratedPage {
  type: PageType;
  slug: string;
  title: string;
  description?: string;
  artifactLabel?: string;
  artifactColor?: string;
  data: PageData;
}

export type PageData =
  | LandingPageData
  | GuidePageData
  | ModulePageData
  | MemberPageData
  | EndpointPageData
  | FlowPageData
  | DataModelPageData
  | ErrorCatalogPageData
  | EventCatalogPageData
  | GraphPageData
  | OperationsPageData
  | ChangelogPageData
  | DataStorePageData
  | ConfigurationPageData
  | SecurityPageData
  | DependencyMapPageData
  | PrivacyPageData
  | TestOverviewPageData
  | IntentGraphPageData
  | TestDetailPageData
  | FlowTestPageData
  | GapReportPageData
  | ObservabilityPageData
  | GraphQLPageData
  | GrpcPageData
  | WebSocketPageData
  | AsyncApiPageData
  | CliProtocolPageData
  | TestDashboardPageData;

export interface LandingPageData {
  type: PageType.LANDING;
  artifacts: ArtifactSummary[];
}

export interface ArtifactSummary {
  label: string;
  color?: string;
  description?: string;
  moduleCount: number;
  memberCount: number;
  endpointCount: number;
  coveragePercent?: number;
  slug: string;
}

export interface GuidePageData {
  type: PageType.GUIDE;
  content: string;
  frontmatter: Record<string, unknown>;
}

export interface ModulePageData {
  type: PageType.MODULE;
  module: Module;
  artifact: { label: string; color?: string };
}

export interface MemberPageData {
  type: PageType.MEMBER;
  member: Member;
  moduleId: string;
  artifact: { label: string; color?: string };
  referencedIn?: ReferencedInData;
}

export interface EndpointPageData {
  type: PageType.ENDPOINT;
  method: Method;
  memberQualified: string;
  memberName: string;
  artifact: { label: string; color?: string };
}

export interface FlowPageData {
  type: PageType.FLOW;
  flow: Flow;
  artifact: { label: string; color?: string };
  traceView?: TraceEntry[];
}

export interface TraceEntry {
  actor: string;
  actorQualified?: string;
  actorUrl?: string;
  project?: string;
  description?: string;
  type?: string;
  ai?: boolean;
  depth: number;
}

export interface DataModelPageData {
  type: PageType.DATA_MODEL;
  dataModel: DataModel;
  artifact: { label: string; color?: string };
}

export interface ErrorCatalogPageData {
  type: PageType.ERROR_CATALOG;
  errors: DocError[];
  artifact: { label: string; color?: string };
}

export interface EventCatalogPageData {
  type: PageType.EVENT_CATALOG;
  events: DocEvent[];
  artifact: { label: string; color?: string };
}

export interface GraphPageData {
  type: PageType.GRAPH;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: "module" | "member" | "artifact";
  artifact?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface OperationsPageData {
  type: PageType.OPERATIONS;
  contexts: ContextWithMeta[];
}

export interface ContextWithMeta {
  context: Context;
  artifact: { label: string; color?: string };
}

export interface ChangelogPageData {
  type: PageType.CHANGELOG;
  entries: unknown[];
}

export interface ReferencedInData {
  flows: ReferencedInEntry[];
  endpoints: ReferencedInEntry[];
  contexts: ReferencedInEntry[];
}

export interface ReferencedInEntry {
  label: string;
  url?: string;
}

export interface NavigationNode {
  label: string;
  slug?: string;
  type?: PageType;
  children?: NavigationNode[];
  section?: string;
  icon?: string;
}

export interface NavigationTree {
  sections: NavSection[];
}

export interface NavSection {
  title: string;
  items: NavigationNode[];
  tab?: "docs" | "tests";
}

export interface SiteData {
  pages: GeneratedPage[];
  navigation: NavigationTree;
  referenceIndex: Record<string, string>;
  config: {
    siteName: string;
    logo?: string;
    favicon?: string;
    baseUrl?: string;
  };
}

export interface DataStorePageData {
  type: PageType.DATA_STORE;
  dataStores: DataStore[];
  artifact: { label: string; color?: string };
}

export interface ConfigurationPageData {
  type: PageType.CONFIGURATION;
  properties: ConfigurationProperty[];
  artifact: { label: string; color?: string };
}

export interface SecurityPageData {
  type: PageType.SECURITY;
  security: Security;
  artifact: { label: string; color?: string };
}

export interface DependencyMapPageData {
  type: PageType.DEPENDENCY_MAP;
  dependencies: ExternalDependency[];
  artifact: { label: string; color?: string };
}

export interface PrivacyPageData {
  type: PageType.PRIVACY;
  fields: PrivacyField[];
  artifact: { label: string; color?: string };
}

export interface TestOverviewPageData {
  type: PageType.TEST_OVERVIEW;
  intentGraph: IntentGraph;
  artifact: { label: string; color?: string };
}

export interface IntentGraphPageData {
  type: PageType.INTENT_GRAPH;
  intentGraph: IntentGraph;
  artifact: { label: string; color?: string };
}

export interface TestDetailPageData {
  type: PageType.TEST_DETAIL;
  className: string;
  methods: IntentMethod[];
  artifact: { label: string; color?: string };
}

export interface FlowTestPageData {
  type: PageType.FLOW_TEST;
  flow: Flow;
  artifact: { label: string; color?: string };
}

export interface GapReportPageData {
  type: PageType.GAP_REPORT;
  artifact: { label: string; color?: string };
}

export interface ObservabilityPageData {
  type: PageType.OBSERVABILITY;
  observability: Observability;
  artifact: { label: string; color?: string };
}

// ── Multi-protocol page data types ──────────────────────────────────

export interface GraphQLOperation {
  name: string;
  description?: string;
  args?: { name: string; type: string; required?: boolean }[];
  returnType?: string;
}

export interface GraphQLType {
  name: string;
  kind: "type" | "input" | "enum" | "interface" | "union" | "scalar";
  fields?: { name: string; type: string; description?: string }[];
  values?: string[];
}

export interface GraphQLPageData {
  type: PageType.GRAPHQL;
  queries: GraphQLOperation[];
  mutations: GraphQLOperation[];
  subscriptions: GraphQLOperation[];
  types: GraphQLType[];
  artifact: { label: string; color?: string };
}

export interface GrpcMethod {
  name: string;
  description?: string;
  requestType: string;
  responseType: string;
  streaming: "unary" | "server" | "client" | "bidi";
}

export interface GrpcMessage {
  name: string;
  fields?: { name: string; type: string; number: number; description?: string }[];
}

export interface GrpcService {
  name: string;
  description?: string;
  methods: GrpcMethod[];
}

export interface GrpcPageData {
  type: PageType.GRPC;
  services: GrpcService[];
  messages: GrpcMessage[];
  artifact: { label: string; color?: string };
}

export interface WebSocketChannel {
  name: string;
  description?: string;
  url?: string;
}

export interface WebSocketMessage {
  name: string;
  direction: "inbound" | "outbound";
  description?: string;
  schema?: string;
}

export interface WebSocketEvent {
  name: string;
  description?: string;
  payload?: string;
}

export interface WebSocketPageData {
  type: PageType.WEBSOCKET;
  url?: string;
  channels: WebSocketChannel[];
  inboundMessages: WebSocketMessage[];
  outboundMessages: WebSocketMessage[];
  events: WebSocketEvent[];
  artifact: { label: string; color?: string };
}

export interface AsyncApiChannel {
  name: string;
  description?: string;
  operations: AsyncApiOperation[];
}

export interface AsyncApiOperation {
  type: "publish" | "subscribe";
  operationId?: string;
  description?: string;
  messageSchema?: string;
  messageName?: string;
}

export interface AsyncApiMessageSchema {
  name: string;
  description?: string;
  fields?: { name: string; type: string; description?: string }[];
}

export interface AsyncApiPageData {
  type: PageType.ASYNC_API;
  title?: string;
  version?: string;
  description?: string;
  channels: AsyncApiChannel[];
  messageSchemas: AsyncApiMessageSchema[];
  artifact: { label: string; color?: string };
}

export interface CliCommand {
  name: string;
  description?: string;
  usage?: string;
  subcommands?: CliCommand[];
  arguments?: CliArgument[];
  flags?: CliFlag[];
  examples?: CliExample[];
}

export interface CliArgument {
  name: string;
  description?: string;
  required?: boolean;
  default?: string;
}

export interface CliFlag {
  name: string;
  short?: string;
  description?: string;
  type?: string;
  default?: string;
  required?: boolean;
}

export interface CliExample {
  description?: string;
  command: string;
}

export interface CliProtocolPageData {
  type: PageType.CLI_PROTOCOL;
  binaryName?: string;
  commands: CliCommand[];
  artifact: { label: string; color?: string };
}

export interface TestDashboardPageData {
  type: PageType.TEST_DASHBOARD;
  artifacts: TestDashboardArtifact[];
}

export interface TestDashboardArtifact {
  label: string;
  color?: string;
  methodCount: number;
  avgIsd: number;
  coveragePercent: number;
  slug: string;
}
