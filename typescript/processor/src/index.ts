// @docspec:module {
//   id: "docspec-ts-processor-index",
//   name: "DocSpec TypeScript Processor — Public API",
//   description: "Barrel re-export for the @docspec/processor-ts package. Exposes the main processor, all scanners, readers, framework detectors, DSTI analyzers, domain extractors, output serializer, and coverage calculator.",
//   since: "3.0.0"
// }

export { DocSpecTSProcessor, type ProcessorConfig } from "./processor.js";
export { AutoDiscoveryScanner } from "./scanner/auto-discovery.js";
export { PackageFilter } from "./scanner/package-filter.js";
export { DecoratorReader } from "./reader/decorator-reader.js";
export { TSDocReader } from "./reader/tsdoc-reader.js";
export { DescriptionInferrer } from "./reader/description-inferrer.js";
export { NestJSDetector } from "./framework/nestjs-detector.js";
export { TypeORMDetector } from "./framework/typeorm-detector.js";
export { PrismaDetector } from "./framework/prisma-detector.js";
export { IntentExtractor } from "./dsti/intent-extractor.js";
export { NamingAnalyzer } from "./dsti/naming-analyzer.js";
export { IntentDensityCalculator } from "./dsti/intent-density-calculator.js";
export { Serializer } from "./output/serializer.js";
export { CoverageCalculator } from "./metrics/coverage-calculator.js";

// Extractor interface and implementations
export type { DocSpecExtractor, ExtractorContext, ExtractorModel } from "./extractor/extractor-interface.js";
export { createExtractorModel } from "./extractor/extractor-interface.js";
export { SecurityExtractor } from "./extractor/security-extractor.js";
export { ConfigExtractor } from "./extractor/config-extractor.js";
export { ObservabilityExtractor } from "./extractor/observability-extractor.js";
export { DataStoreExtractor } from "./extractor/datastore-extractor.js";
export { ExternalDependencyExtractor } from "./extractor/external-dep-extractor.js";
export { PrivacyExtractor } from "./extractor/privacy-extractor.js";
export { ErrorEventExtractor } from "./extractor/error-event-extractor.js";
export { ExpressDetector } from "./extractor/express-detector.js";
