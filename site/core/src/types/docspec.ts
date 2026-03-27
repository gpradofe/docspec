/**
 * TypeScript interfaces for docspec.json v3.0.0
 * Derived from spec/docspec.schema.json
 */

export interface DocSpec {
  docspec: "3.0.0";
  artifact: Artifact;
  project?: Project;
  modules: Module[];
  flows?: Flow[];
  contexts?: Context[];
  crossRefs?: CrossRef[];
  errors?: DocError[];
  events?: DocEvent[];
  dataModels?: DataModel[];
  discovery?: Discovery;
  dataStores?: DataStore[];
  configuration?: ConfigurationProperty[];
  security?: Security;
  externalDependencies?: ExternalDependency[];
  observability?: Observability;
  privacy?: PrivacyField[];
  intentGraph?: IntentGraph;
}

export interface Artifact {
  groupId: string;
  artifactId: string;
  version: string;
  language: string;
  repository?: string;
  sourceUrl?: string;
  buildTool?: string;
  frameworks?: string[];
}

export interface Project {
  name: string;
  description?: string;
  homepage?: string;
  license?: string;
  authors?: string[];
  tags?: string[];
  audiences?: string[];
}

export interface Module {
  id: string;
  name?: string;
  description?: string;
  since?: string;
  audience?: string;
  stereotype?: "service" | "api" | "data-access" | "component" | "configuration" | "library" | "entity";
  discoveredFrom?: "annotation" | "auto" | "framework";
  framework?: string | null;
  members?: Member[];
}

export interface Member {
  kind: "class" | "interface" | "enum" | "record" | "annotation" | "struct" | "trait" | "function" | "type_alias" | "tagged_union" | "module" | "constant";
  name: string;
  qualified: string;
  description?: string;
  since?: string;
  deprecated?: string | null;
  tags?: string[];
  visibility?: "public" | "protected" | "private" | "package-private";
  modifiers?: string[];
  typeParams?: string[];
  extends?: string | null;
  implements?: string[];
  constructors?: Constructor[];
  methods?: Method[];
  fields?: Field[];
  values?: string[];
  examples?: Example[];
  audience?: string;
  discoveredFrom?: string;
  referencedBy?: ReferencedBy;
  kindCategory?: string;
  dependencies?: MemberDependency[];
}

export interface Method {
  name: string;
  description?: string;
  since?: string;
  deprecated?: string | null;
  visibility?: string;
  modifiers?: string[];
  tags?: string[];
  params?: MethodParam[];
  returns?: MethodReturn;
  throws?: MethodThrows[];
  examples?: Example[];
  endpointMapping?: EndpointMapping | null;
  errorConditions?: MethodErrorCondition[];
  performance?: MethodPerformance;
  async?: { mechanism?: string; returnWrapper?: string };
  asyncApi?: string;
}

export interface MethodReturn {
  type?: string;
  description?: string;
}

export interface MethodThrows {
  type?: string;
  description?: string;
}

export interface MethodParam {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  default?: string | null;
}

export interface Field {
  name: string;
  type: string;
  description?: string;
  since?: string;
  visibility?: string;
  modifiers?: string[];
}

export interface Constructor {
  visibility?: string;
  params?: MethodParam[];
  description?: string;
}

export interface Example {
  title?: string;
  language?: string;
  code: string;
  verified?: boolean;
  sourceFile?: string;
}

export interface ReferencedBy {
  endpoints?: string[];
  flows?: string[];
  contexts?: string[];
}

export interface EndpointMapping {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path?: string;
  description?: string;
}

export interface Flow {
  id: string;
  name?: string;
  description?: string;
  trigger?: string;
  steps: FlowStep[];
}

export interface FlowStep {
  id: string;
  name?: string;
  actor?: string;
  actorQualified?: string;
  description?: string;
  type?: "process" | "ai" | "storage" | "trigger" | "retry" | "external" | "bridge" | "observability";
  ai?: boolean;
  retryTarget?: string | null;
  inputs?: string[];
  outputs?: string[];
  dataStoreOps?: FlowStepDataStoreOp[];
  configDependencies?: string[];
  observability?: FlowStepObservability;
}

export interface Context {
  id: string;
  name?: string;
  attachedTo?: string;
  inputs?: ContextInput[];
  flow?: string;
  uses?: ContextUses[];
  schedule?: {
    type?: "cron" | "fixed-rate" | "fixed-delay";
    interval?: string;
    cron?: string;
  };
  outputs?: string[];
}

export interface ContextInput {
  name: string;
  source?: string;
  description?: string;
  items?: string[];
}

export interface ContextUses {
  artifact: string;
  what: string;
  why?: string;
}

export interface CrossRef {
  sourceQualified: string;
  targetArtifact: string;
  targetFlow?: string;
  targetStep?: string;
  targetMember?: string;
  description?: string;
}

export interface DocError {
  code: string;
  httpStatus?: number;
  exception?: string;
  description?: string;
  causes?: string[];
  resolution?: string;
  thrownBy?: string[];
  endpoints?: string[];
  since?: string;
}

export interface DocEvent {
  name: string;
  description?: string;
  trigger?: string;
  channel?: string;
  payload?: EventPayload;
  deliveryGuarantee?: string;
  retryPolicy?: string;
  since?: string;
}

export interface EventPayload {
  type?: string;
  fields?: EventPayloadField[];
}

export interface EventPayloadField {
  name: string;
  type: string;
  description?: string;
}

export interface DataModel {
  name: string;
  qualified: string;
  description?: string;
  table?: string;
  discoveredFrom?: "jpa" | "annotation" | "auto";
  fields?: DataModelField[];
  relationships?: DataModelRelationship[];
  jsonShape?: JsonShape;
  usedBy?: DataModelUsedBy;
  indexes?: DataModelIndex[];
}

export interface DataModelIndex {
  name?: string;
  columns: string[];
  unique?: boolean;
}

export interface DataModelField {
  name: string;
  type: string;
  column?: string;
  primaryKey?: boolean;
  nullable?: boolean;
  unique?: boolean;
  length?: number;
  enumType?: string;
  description?: string;
  generated?: boolean;
  foreignKey?: { table: string; column: string; onDelete?: string };
  checkConstraint?: string;
  maxLength?: number;
}

export interface DataModelRelationship {
  type: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY";
  target: string;
  field?: string;
  mappedBy?: string;
  cascade?: string;
}

export interface JsonShape {
  description?: string;
  fields?: JsonShapeField[];
}

export interface JsonShapeField {
  name: string;
  type: string;
  jsonProperty?: string;
  enum?: string[];
  description?: string;
}

export interface DataModelUsedBy {
  endpoints?: string[];
  repositories?: string[];
}

export interface Discovery {
  mode?: "auto" | "annotated-only" | "hybrid";
  frameworks?: string[];
  scannedPackages?: string[];
  excludedPackages?: string[];
  totalClasses?: number;
  documentedClasses?: number;
  autoDiscoveredClasses?: number;
  annotatedClasses?: number;
  coveragePercent?: number;
  inferredDescriptions?: number;
  totalMethods?: number;
  documentedMethods?: number;
  totalParams?: number;
  documentedParams?: number;
}

export interface DataStore {
  id: string;
  name?: string;
  type: "rdbms" | "nosql" | "cache" | "message-broker" | "search" | "object-store";
  tables?: string[];
  schemaSource?: string;
  migrationTool?: string;
  migrations?: DataStoreMigration[];
  keyPatterns?: DataStoreKeyPattern[];
  buckets?: DataStoreBucket[];
  topics?: DataStoreTopic[];
}

export interface DataStoreKeyPattern {
  pattern: string;
  type?: string;
  ttl?: string;
  description?: string;
}

export interface DataStoreBucket {
  name: string;
  keyPattern?: string;
  description?: string;
}

export interface DataStoreTopic {
  name: string;
  partitionKey?: string;
  schema?: string;
  description?: string;
}

export interface DataStoreMigration {
  version: string;
  description?: string;
  date?: string;
  tables?: string[];
}

export interface ConfigurationProperty {
  key: string;
  type?: string;
  default?: string | null;
  description?: string;
  source?: "@Value" | "@ConfigurationProperties" | "Environment" | "manual";
  usedBy?: string[];
  affectsFlow?: string[];
  validRange?: ValidRange;
  environment?: string;
  affectsStep?: string;
}

export interface ValidRange {
  min?: number;
  max?: number;
}

export interface Security {
  authMechanism?: string;
  endpoints?: SecurityEndpointRule[];
  roles?: string[];
  scopes?: string[];
}

export interface SecurityEndpointRule {
  path: string;
  rules?: string[];
  public?: boolean;
  rateLimit?: RateLimit;
}

export interface RateLimit {
  requests?: number;
  window?: string;
}

export interface ExternalDependency {
  name: string;
  baseUrl?: string;
  auth?: string;
  endpoints?: ExternalDependencyEndpoint[];
  rateLimit?: RateLimit;
  sla?: string;
  fallback?: string;
}

export interface ExternalDependencyEndpoint {
  method?: string;
  path?: string;
  usedBy?: string[];
}

export interface Observability {
  metrics?: ObservabilityMetric[];
  traces?: ObservabilityTrace[];
  healthChecks?: ObservabilityHealthCheck[];
}

export interface ObservabilityMetric {
  name: string;
  type: "counter" | "gauge" | "timer" | "histogram" | "summary";
  labels?: string[];
  emittedBy?: string[];
}

export interface ObservabilityTrace {
  spanName: string;
  service?: string;
  parentSpan?: string;
}

export interface ObservabilityHealthCheck {
  path?: string;
  checks?: string[];
}

export interface PrivacyField {
  field: string;
  piiType: "email" | "phone" | "name" | "address" | "ssn" | "dob" | "ip" | "financial" | "health" | "biometric" | "other";
  retention?: string;
  gdprBasis?: string;
  encrypted?: boolean;
  neverLog?: boolean;
  neverReturn?: boolean;
  maskedInResponses?: boolean;
}

export interface IntentGraph {
  methods?: IntentMethod[];
}

export interface IntentMethod {
  qualified: string;
  intentSignals?: IntentSignals;
}

export interface IntentSignals {
  nameSemantics?: { verb?: string; object?: string; intent?: string };
  guardClauses?: number | GuardClause[];
  branches?: number | BranchInfo[];
  dataFlow?: { reads?: string[]; writes?: string[] };
  loopProperties?: { hasStreams?: boolean; hasEnhancedFor?: boolean; streamOps?: string[] };
  errorHandling?: { catchBlocks?: number; caughtTypes?: string[] };
  constants?: string[] | ConstantInfo[];
  dependencies?: string[] | DependencyInfo[];
  intentDensityScore?: number;
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

export interface GuardClause {
  condition?: string;
  error?: string;
  boundary?: string;
}

export interface BranchInfo {
  condition?: string;
  output?: string;
}

export interface ConstantInfo {
  name?: string;
  value?: string;
  implies?: string;
}

export interface DependencyInfo {
  name?: string;
  classification?: string;
}

export interface MemberDependency {
  name: string;
  type: string;
  classification?: "service" | "repository" | "config" | "client" | "database" | "message_broker" | "cache" | "file_system" | "other";
  injectionMechanism?: "constructor" | "field" | "setter";
  required?: boolean;
}

export interface MethodErrorCondition {
  type?: string;
  mechanism?: string;
  description?: string;
  code?: string;
}

export interface MethodPerformance {
  expectedLatency?: string;
  bottleneck?: string;
}

export interface FlowStepDataStoreOp {
  store: string;
  operation: string;
  tables?: string[];
  description?: string;
  transactional?: boolean;
  cascading?: boolean;
}

export interface FlowStepObservability {
  metrics?: string[];
  logLevel?: string;
}
