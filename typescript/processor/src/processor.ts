/**
 * @docspec:module id="docspec-ts-processor" name="DocSpec TypeScript Processor"
 * @docspec:description "Main processor orchestrator for TypeScript codebases.
 *   Coordinates the full DocSpec v3 pipeline: TypeScript program creation,
 *   auto-discovery scan, package filtering, framework detection (NestJS, TypeORM,
 *   Prisma, Express), decorator/TSDoc/description reading, DSTI intent extraction
 *   with density scoring, domain extractor pipeline (security, config, observability,
 *   data stores, external deps, privacy, errors/events), coverage calculation,
 *   and final docspec.json assembly."
 * @docspec:boundary "TypeScript source code analysis"
 * @docspec:since "3.0.0"
 * @docspec:tags ["self-documented", "processor", "typescript", "pipeline"]
 */

import ts from "typescript";
import { AutoDiscoveryScanner } from "./scanner/auto-discovery.js";
import { PackageFilter } from "./scanner/package-filter.js";
import { DecoratorReader } from "./reader/decorator-reader.js";
import { TSDocReader } from "./reader/tsdoc-reader.js";
import { DescriptionInferrer } from "./reader/description-inferrer.js";
import { NestJSDetector } from "./framework/nestjs-detector.js";
import { TypeORMDetector } from "./framework/typeorm-detector.js";
import { PrismaDetector } from "./framework/prisma-detector.js";
import { IntentExtractor } from "./dsti/intent-extractor.js";
import { IntentDensityCalculator } from "./dsti/intent-density-calculator.js";
import { Serializer } from "./output/serializer.js";
import { CoverageCalculator } from "./metrics/coverage-calculator.js";
import { type DocSpecExtractor, type ExtractorContext, createExtractorModel } from "./extractor/extractor-interface.js";
import { SecurityExtractor } from "./extractor/security-extractor.js";
import { ConfigExtractor } from "./extractor/config-extractor.js";
import { ObservabilityExtractor } from "./extractor/observability-extractor.js";
import { DataStoreExtractor } from "./extractor/datastore-extractor.js";
import { ExternalDependencyExtractor } from "./extractor/external-dep-extractor.js";
import { PrivacyExtractor } from "./extractor/privacy-extractor.js";
import { ErrorEventExtractor } from "./extractor/error-event-extractor.js";
import { ExpressDetector } from "./extractor/express-detector.js";

export interface ProcessorConfig {
  tsConfigPath?: string;
  include?: string[];
  exclude?: string[];
  outputDir?: string;
  groupId?: string;
  artifactId?: string;
  version?: string;
}

export interface DocSpecOutput {
  docspec: "3.0.0";
  artifact: { groupId: string; artifactId: string; version: string; language: string; frameworks?: string[] };
  modules: any[];
  flows?: any[];
  contexts?: any[];
  dataModels?: any[];
  errors?: any[];
  events?: any[];
  security?: any;
  configuration?: any[];
  observability?: any;
  dataStores?: any[];
  externalDependencies?: any[];
  privacy?: any[];
  intentGraph?: { methods: any[] };
  discovery?: any;
}

export class DocSpecTSProcessor {
  private config: ProcessorConfig;
  private scanner: AutoDiscoveryScanner;
  private filter: PackageFilter;
  private decoratorReader: DecoratorReader;
  private tsdocReader: TSDocReader;
  private descriptionInferrer: DescriptionInferrer;
  private nestjsDetector: NestJSDetector;
  private typeormDetector: TypeORMDetector;
  private prismaDetector: PrismaDetector;
  private intentExtractor: IntentExtractor;
  private intentDensityCalculator: IntentDensityCalculator;
  private serializer: Serializer;
  private coverageCalculator: CoverageCalculator;
  private extractors: DocSpecExtractor[];

  constructor(config: ProcessorConfig) {
    this.config = config;
    this.scanner = new AutoDiscoveryScanner();
    this.filter = new PackageFilter(config.include ?? [], config.exclude ?? []);
    this.decoratorReader = new DecoratorReader();
    this.tsdocReader = new TSDocReader();
    this.descriptionInferrer = new DescriptionInferrer();
    this.nestjsDetector = new NestJSDetector();
    this.typeormDetector = new TypeORMDetector();
    this.prismaDetector = new PrismaDetector();
    this.intentExtractor = new IntentExtractor();
    this.intentDensityCalculator = new IntentDensityCalculator();
    this.serializer = new Serializer();
    this.coverageCalculator = new CoverageCalculator();
    this.extractors = [
      new SecurityExtractor(),
      new ConfigExtractor(),
      new ObservabilityExtractor(),
      new DataStoreExtractor(),
      new ExternalDependencyExtractor(),
      new PrivacyExtractor(),
      new ErrorEventExtractor(),
      new ExpressDetector(),
    ];
  }

  /** @docspec:intentional "Orchestrates the full DocSpec v3 pipeline: program creation, auto-discovery, filtering, framework detection, reading, DSTI, extraction, coverage, and JSON assembly" */
  process(): DocSpecOutput {
    // 1. Create TypeScript program
    const configPath = this.config.tsConfigPath ?? "tsconfig.json";
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ".");
    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    const checker = program.getTypeChecker();

    // 2. Auto-discover exported types
    const discoveredTypes = this.scanner.scan(program, checker);

    // 3. Filter by package rules
    const filteredTypes = discoveredTypes.filter(t => this.filter.accept(t.fileName));

    // 4. Detect frameworks
    const frameworks: string[] = [];
    if (this.nestjsDetector.detect(program)) frameworks.push("nestjs");
    if (this.typeormDetector.detect(program)) frameworks.push("typeorm");
    if (this.prismaDetector.detect(program)) frameworks.push("prisma");

    // 5. Build modules from discovered types
    const modules: any[] = [];
    const moduleMap = new Map<string, any>();
    const intentMethods: any[] = [];

    for (const discovered of filteredTypes) {
      const sourceFile = discovered.sourceFile;
      const node = discovered.node;

      // Read decorators
      const decoratorMeta = this.decoratorReader.read(node);
      // Read TSDoc
      const tsdocMeta = this.tsdocReader.read(node, sourceFile);
      // Infer description if missing
      const description = tsdocMeta.description || this.descriptionInferrer.infer(discovered.name);

      // Determine module
      const moduleName = decoratorMeta.module?.name ?? this.inferModuleName(discovered.fileName);
      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, { id: moduleName, name: moduleName, members: [] });
      }

      // Build member
      const member: any = {
        kind: discovered.kind,
        name: discovered.name,
        qualified: discovered.qualified,
        description,
        ...decoratorMeta.extra,
      };

      // Extract methods
      if (ts.isClassDeclaration(node)) {
        member.methods = this.extractMethods(node, sourceFile, checker, intentMethods, discovered.qualified);
        member.fields = this.extractFields(node, sourceFile, checker);
      }

      // Framework enrichment (only for class declarations)
      if (ts.isClassDeclaration(node)) {
        if (frameworks.includes("nestjs")) {
          this.nestjsDetector.enrich(node, member);
        }
        if (frameworks.includes("typeorm")) {
          this.typeormDetector.enrich(node, member);
        }
      }

      moduleMap.get(moduleName)!.members.push(member);
    }

    moduleMap.forEach(mod => modules.push(mod));

    // 6. Run v3 extractors (security, config, observability, data stores, etc.)
    const extractorModel = createExtractorModel();
    const userSourceFiles = program.getSourceFiles().filter(
      sf => !sf.isDeclarationFile && !sf.fileName.includes("node_modules"),
    );
    const extractorContext: ExtractorContext = {
      program,
      checker,
      sourceFiles: userSourceFiles,
      model: extractorModel,
    };

    for (const extractor of this.extractors) {
      if (extractor.isAvailable()) {
        extractor.extract(extractorContext);
      }
    }

    // 7. Compute ISD scores for intent methods
    for (const im of intentMethods) {
      if (im.intentSignals) {
        im.intentSignals.intentDensityScore = this.intentDensityCalculator.calculate(im.intentSignals);
      }
    }

    // 8. Calculate coverage
    this.coverageCalculator.reset();
    this.coverageCalculator.analyze(modules);
    const coverageReport = this.coverageCalculator.toReport(
      "auto",
      frameworks,
      this.config.include ?? [],
      this.config.exclude ?? [],
    );

    // 9. Build output
    const output: DocSpecOutput = {
      docspec: "3.0.0",
      artifact: {
        groupId: this.config.groupId ?? "unknown",
        artifactId: this.config.artifactId ?? "unknown",
        version: this.config.version ?? "0.0.0",
        language: "typescript",
        frameworks: frameworks.length > 0 ? frameworks : undefined,
      },
      modules,
      errors: extractorModel.errors.length > 0 ? extractorModel.errors : undefined,
      events: extractorModel.events.length > 0 ? extractorModel.events : undefined,
      security: extractorModel.security ?? undefined,
      configuration: extractorModel.configuration.length > 0 ? extractorModel.configuration : undefined,
      observability: extractorModel.observability ?? undefined,
      dataStores: extractorModel.dataStores.length > 0 ? extractorModel.dataStores : undefined,
      externalDependencies: extractorModel.externalDependencies.length > 0 ? extractorModel.externalDependencies : undefined,
      privacy: extractorModel.privacy.length > 0 ? extractorModel.privacy : undefined,
      intentGraph: intentMethods.length > 0 ? { methods: intentMethods } : undefined,
      discovery: coverageReport,
    };

    return output;
  }

  /** @docspec:deterministic */
  private inferModuleName(fileName: string): string {
    const parts = fileName.replace(/\\/g, "/").split("/");
    const srcIdx = parts.indexOf("src");
    if (srcIdx >= 0 && srcIdx + 1 < parts.length) {
      return parts[srcIdx + 1];
    }
    return "default";
  }

  /** @docspec:intentional "Extracts method metadata including TSDoc, parameters, return types, and DSTI intent signals from class declarations" */
  private extractMethods(node: ts.ClassDeclaration, sourceFile: ts.SourceFile, checker: ts.TypeChecker, intentMethods: any[], parentQualified: string): any[] {
    const methods: any[] = [];
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name) {
        const name = member.name.getText(sourceFile);
        const tsdoc = this.tsdocReader.readMember(member, sourceFile);
        const sig = checker.getSignatureFromDeclaration(member);
        const returnType = sig ? checker.typeToString(checker.getReturnTypeOfSignature(sig)) : "void";

        const method: any = {
          name,
          description: tsdoc.description || this.descriptionInferrer.infer(name),
          params: member.parameters.map(p => ({
            name: p.name.getText(sourceFile),
            type: p.type ? p.type.getText(sourceFile) : "any",
            required: !p.questionToken && !p.initializer,
          })),
          returns: { type: returnType },
        };

        // Extract intent signals
        const signals = this.intentExtractor.extractFromMethod(member, sourceFile);
        if (signals) {
          intentMethods.push({ qualified: `${parentQualified}#${name}`, intentSignals: signals });
        }

        methods.push(method);
      }
    }
    return methods;
  }

  /** @docspec:intentional "Extracts field names and types from class property declarations" */
  private extractFields(node: ts.ClassDeclaration, sourceFile: ts.SourceFile, checker: ts.TypeChecker): any[] {
    const fields: any[] = [];
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member) && member.name) {
        const name = member.name.getText(sourceFile);
        const type = member.type ? member.type.getText(sourceFile) : "any";
        fields.push({ name, type });
      }
    }
    return fields;
  }
}
