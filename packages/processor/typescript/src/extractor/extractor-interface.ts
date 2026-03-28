// @docspec:module {
//   id: "docspec-ts-extractor-interface",
//   name: "DocSpec Extractor Interface",
//   description: "Defines the DocSpecExtractor contract and the mutable ExtractorModel that domain extractors populate. All seven v3 domain extractors (security, config, observability, data stores, external deps, privacy, errors/events) implement this interface.",
//   since: "3.0.0"
// }

import ts from "typescript";

/**
 * Context object passed to extractors, providing access to the TypeScript
 * program, type checker, and the accumulated DocSpec output model.
 */
export interface ExtractorContext {
  program: ts.Program;
  checker: ts.TypeChecker;
  sourceFiles: ts.SourceFile[];
  model: ExtractorModel;
}

/**
 * Mutable model sections that extractors populate.
 * Mirrors the v3 DocSpec schema domains.
 */
export interface ExtractorModel {
  security?: SecurityModel;
  configuration: ConfigurationPropertyModel[];
  observability?: ObservabilityModel;
  dataStores: DataStoreModel[];
  externalDependencies: ExternalDependencyModel[];
  privacy: PrivacyFieldModel[];
  errors: ErrorModel[];
  events: EventModel[];
}

export interface SecurityModel {
  roles: string[];
  endpoints: SecurityEndpointRuleModel[];
}

export interface SecurityEndpointRuleModel {
  path: string;
  method?: string;
  rules: string[];
  public: boolean;
}

export interface ConfigurationPropertyModel {
  key: string;
  type?: string;
  defaultValue?: string;
  source: string;
  usedBy: string[];
}

export interface ObservabilityModel {
  metrics: ObservabilityMetricModel[];
  healthChecks: ObservabilityHealthCheckModel[];
}

export interface ObservabilityMetricModel {
  name: string;
  type: string;
  emittedBy: string[];
  labels?: string[];
}

export interface ObservabilityHealthCheckModel {
  path: string;
  checks: string[];
}

export interface DataStoreModel {
  id: string;
  name: string;
  type: string;
  tables: string[];
  topics: DataStoreTopicModel[];
}

export interface DataStoreTopicModel {
  name: string;
}

export interface ExternalDependencyModel {
  name: string;
  baseUrl?: string;
  endpoints: ExternalDependencyEndpointModel[];
}

export interface ExternalDependencyEndpointModel {
  method: string;
  path: string;
  usedBy: string[];
}

export interface PrivacyFieldModel {
  field: string;
  piiType?: string;
  retention?: string;
  gdprBasis?: string;
  encrypted?: boolean;
  neverLog?: boolean;
  neverReturn?: boolean;
}

export interface ErrorModel {
  type: string;
  message?: string;
  thrownBy: string[];
}

export interface EventModel {
  name: string;
  emittedBy: string[];
  consumedBy: string[];
}

/**
 * Interface for extractors that analyze TypeScript source files and populate
 * the DocSpec model with domain-specific documentation (security, configuration,
 * observability, data stores, external dependencies, privacy, errors, events).
 *
 * Mirrors the Java DocSpecExtractor interface.
 */
export interface DocSpecExtractor {
  /**
   * Returns the human-readable name of this extractor for diagnostic messages.
   */
  extractorName(): string;

  /**
   * Checks whether this extractor can operate in the current environment.
   * Typically verifies that required framework packages are importable or
   * that relevant patterns exist in the source files.
   */
  isAvailable(): boolean;

  /**
   * Analyzes the source files in the context and populates the model
   * with extracted data for this extractor's domain.
   */
  extract(context: ExtractorContext): void;
}

/**
 * Creates a fresh, empty ExtractorModel for use during processing.
 */
export function createExtractorModel(): ExtractorModel {
  return {
    configuration: [],
    dataStores: [],
    externalDependencies: [],
    privacy: [],
    errors: [],
    events: [],
  };
}
