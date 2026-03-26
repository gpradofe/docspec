# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DocSpec is a universal documentation specification and toolchain that generates structured, machine-readable documentation from any codebase — not just REST APIs. It covers libraries, SDKs, services, scheduled jobs, event processors, and entire architectures. The current version is **v3.0.0**.

Supports **6 languages**: Java (reference), TypeScript, Python, Rust, C#, Go. Each language has annotations, a processor, and build tool integration.

## Build Commands

```bash
# Java (reference implementation)
cd java && mvn install -DskipTests
mvn install -DskipTests -pl docspec-processor-java -am   # Single module
mvn docspec:generate        # Generate docspec.json
mvn docspec:validate        # Validate against JSON schema
mvn docspec:coverage        # Check documentation coverage
mvn docspec:generate-tests  # Generate JUnit 5 test stubs from intent graph
mvn docspec:schema-sync     # Compare JPA entities against Flyway migrations

# Site framework (pnpm workspace)
cd site && pnpm install && pnpm -r build

# CLI (from any example-docs-site)
cd examples/example-docs-site && node ../../site/cli/dist/index.js resolve -c docspec.config.yaml

# TypeScript processor
cd typescript/processor && npm install && npm run build

# Python processor
cd python/processor && pip install -e . && docspec-py generate

# Rust processor
cd rust/processor && cargo build

# C# processor
cd csharp/processor && dotnet build

# Go processor
cd go/processor && go build ./...

# Run acceptance gates (all 5)
bash tests/gates/run-all-gates.sh

# Run E2E tests
bash tests/e2e/java-pipeline.test.sh
bash tests/e2e/tier-matrix.test.sh
```

## Repository Structure

```
docspec/
├── spec/
│   ├── docspec.schema.json            # JSON Schema Draft 2020-12 (v3.0.0) — SOURCE OF TRUTH
│   ├── intent-graph.schema.json       # DSTI intent graph schema
│   └── property-dsl.grammar.json      # Property DSL grammar
├── java/                              # Maven reactor root (reference implementation)
│   ├── docspec-annotations-java/      # 42 annotations, zero dependencies
│   ├── docspec-processor-java/        # Annotation processor (80+ source files) + 54 model POJOs
│   └── docspec-maven-plugin/          # 10 Mojo goals
├── typescript/                        # TypeScript — consolidated language directory
│   ├── annotations/                   # @docspec/ts — decorators (42/42 parity)
│   ├── processor/                     # AST-based TS/JS processor + DSTI
│   ├── plugin/                        # npm/pnpm CLI plugin
│   ├── dsti-generator/                # TypeScript DSTI test generator
│   └── frameworks/                    # nestjs, prisma, typeorm configs
├── python/                            # Python — consolidated language directory
│   ├── annotations/                   # docspec-py — decorators (42/42 parity)
│   ├── processor/                     # AST-based Python processor + DSTI
│   ├── plugin/                        # pip/poetry CLI plugin
│   ├── dsti-generator/                # Python DSTI test generator
│   └── frameworks/                    # fastapi, pydantic, sqlalchemy configs
├── rust/                              # Rust — consolidated language directory
│   ├── annotations/                   # docspec-macros — attribute macros (42/42 parity)
│   ├── processor/                     # syn-based Rust processor + DSTI
│   ├── dsti-generator/                # Rust DSTI test generator
│   └── frameworks/                    # axum, diesel, serde configs
├── csharp/                            # C# — consolidated language directory
│   ├── annotations/                   # DocSpec.Annotations — C# attributes (42/42 parity)
│   ├── processor/                     # Roslyn-based C# processor + DSTI
│   ├── dsti-generator/                # C# DSTI test generator
│   └── frameworks/                    # aspnet-core, ef-core, system-text-json configs
├── go/                                # Go — consolidated language directory
│   ├── annotations/                   # docspec — Go struct tags + meta types (42/42 parity)
│   ├── processor/                     # go/ast-based Go processor + DSTI
│   ├── plugin/                        # Go subcommand plugin
│   ├── dsti-generator/                # Go DSTI test generator
│   └── frameworks/                    # gin, gorm, sqlx configs
├── dsti/                              # DSTI — shared cross-language components
│   ├── core/                          # Language-agnostic ISD calculator, cross-channel verifier (TS)
│   └── generators/java/               # Java DSTI test generator (TS package)
├── site/                              # pnpm workspace (TypeScript/React)
│   ├── core/                          # @docspec/core — config, resolver, generator, cross-linker, AI
│   ├── themes/stripe/                 # @docspec/theme-stripe — 39 React components
│   ├── themes/dark/                   # @docspec/theme-dark
│   ├── themes/minimal/                # @docspec/theme-minimal
│   ├── cli/                           # docspec CLI — 10 commands
│   ├── app/                           # Next.js 15 app shell (static export)
│   └── create-docspec-site/           # Scaffolder
├── examples/                          # 21 example projects (3 tiers × 5+ languages)
│   ├── spring-boot-zero-config/       # Java Tier 0: pure auto-discovery
│   ├── waypoint-engine/               # Java Tier 2: full annotations
│   ├── typescript-nexus-sdk/          # TS Tier 2: full decorators
│   ├── python-fastapi-service/        # Python Tier 2: full decorators
│   ├── rust-finddoc-core/             # Rust Tier 2: full attributes
│   ├── *-zero-config/                 # Tier 0 per language (5)
│   ├── *-minimal/                     # Tier 1 per language (5)
│   ├── *-full-annotated/              # Tier 2 per language (5)
│   └── example-docs-site/             # Docs site config resolving all artifacts
├── tests/
│   ├── gates/                         # 5 acceptance gate scripts + runner
│   └── e2e/                           # End-to-end integration tests
├── research/                          # Research papers and outlines
└── docspec-v3-final-spec.md           # Complete technical specification
```

## Architecture

### Three-Tier Documentation Model
- **Tier 0 (Zero Config):** Auto-discovers all public classes/methods, framework stereotypes, entities, infers descriptions from names
- **Tier 1 (Minimal):** Add `@DocModule` for custom grouping and `@DocHidden` to exclude internals
- **Tier 2 (Full):** Add `@DocFlow`, `@DocContext`, `@DocUses`, `@DocError`, `@DocEvent`, `@DocPII`, `@DocPerformance`, etc. for full architecture docs

### Processor Pipeline (21 steps — Java reference)
The `DocSpecProcessor` (`@SupportedAnnotationTypes("*")`) orchestrates:
1. Auto-discovery scan → 2. Spring detection → 3. JPA entity extraction → 4. Jackson shape extraction → 5. DataStore extraction → 6. Scheduled job detection → 7. Security extraction → 8. Configuration extraction → 9. Observability extraction → 10-13. Annotation/JavaDoc/description reading → 14. OpenAPI detection → 15. DSTI intent graph → 16. External dependency extraction → 17. Privacy extraction → 18. Errors/events → 19. Cross-refs → 20. Coverage → 21. Kind category assignment + JSON serialization

Non-Java processors implement the same pipeline adapted for each language's AST.

### v3 Documentation Domains
Seven domains added in v3 (each with its own extractor):
- **Data Stores** — databases, caches, message brokers (auto-detected from JPA/Spring Data/Redis/Kafka)
- **Configuration** — `@Value("${...}")` and `@ConfigurationProperties` extraction
- **Security** — `@PreAuthorize`, `@Secured`, `@RolesAllowed` detection
- **Observability** — Micrometer `@Timed`/`@Counted`, `HealthIndicator` detection
- **External Dependencies** — `RestTemplate`, `WebClient`, `@FeignClient` detection
- **Privacy** — `@DocPII`, `@DocSensitive` field-level PII tracking
- **DSTI (Intent Graph)** — 13-channel semantic analysis of method intent from source code

### DSTI (Deep Structural & Textual Intent)
13 channels: nameSemantics, parameters, returnType, annotations, exceptions, methodBody, dataFlow, loopProperties, nullChecks, assertions, validationAnnotations, logStatements, methodCalls. Each processor implements all 13 channels. `IntentDensityCalculator` produces an ISD score (0.0–1.0).

### AI Integration
- **llms.txt/llms-full.txt** — Generated from docspec.json for LLM consumption
- **MCP server** — 6 tools for AI agents to query documentation
- **Property DSL** — Domain-specific language for expressing invariants

### Key Design Decisions
- **Framework detection without compile deps:** Uses `processingEnv.getElementUtils().getTypeElement("org.springframework...")` — null means not on classpath
- **Programmatic javac invocation:** Maven plugin uses `ToolProvider.getSystemJavaCompiler()` with `-proc:only` so users only add ONE plugin
- **Processing rounds:** Types processed in first round, `finalizeSpec()` called during `processingOver()` round
- **Config via `-A` options:** Maven plugin converts XML config to `-Adocspec.*` compiler options
- **Extractor interface:** All language processors implement a common `DocSpecExtractor` pattern with `isAvailable()`/`extract()` for classpath-safe operation
- **Self-documenting:** The DocSpec codebase is annotated with its own annotations (meta-project)

### Module Dependencies (Java)
```
docspec-annotations-java (zero deps)
    ↓
docspec-processor-java (depends on: annotations + Jackson)
    ↓
docspec-maven-plugin (depends on: processor + annotations + maven-plugin-api + json-schema-validator)
```

## Key Packages (Java)

| Package | Purpose |
|---------|---------|
| `io.docspec.annotation` | 42 annotations (core, privacy, semantic/DSTI, testing, performance, protocol) |
| `io.docspec.processor` | `DocSpecProcessor` — main orchestrator |
| `io.docspec.processor.model` | 54 POJOs mapping 1:1 to JSON schema objects |
| `io.docspec.processor.scanner` | `AutoDiscoveryScanner` + `PackageFilter` |
| `io.docspec.processor.framework` | `SpringFrameworkDetector`, `JpaEntityExtractor`, `JacksonShapeExtractor` |
| `io.docspec.processor.extractor` | `DocSpecExtractor` interface + 7 extractors (Security, Config, Observability, DataStore, ExternalDependency, Privacy, ErrorEvent) |
| `io.docspec.processor.dsti` | `IntentGraphExtractor`, `NamingAnalyzer`, `IntentDensityCalculator`, `PropertyDSL` |
| `io.docspec.processor.reader` | `AnnotationReader`, `JavaDocReader`, `DescriptionInferrer` |
| `io.docspec.processor.metrics` | `CoverageCalculator` |
| `io.docspec.processor.output` | `SpecSerializer` (Jackson ObjectMapper) |
| `io.docspec.maven` | 10 Mojos: Generate, Validate, Coverage, Publish, VerifyExamples, Aggregate, GenerateTests, SchemaSync + 2 more |

## Schema

The schema (`spec/docspec.schema.json`) is the source of truth. It is also bundled inside the processor JAR at `src/main/resources/docspec.schema.json` — **both copies must be kept in sync**.

## 19 Page Types

Landing, Guide, Module, Member, Endpoint, Flow, DataModel, ErrorCatalog, EventCatalog, Graph, Operations, Changelog, DataStore, Configuration, Security, DependencyMap, Privacy, TestOverview, IntentGraph

## 10 CLI Commands

`dev`, `build`, `resolve`, `validate`, `coverage`, `context`, `graph`, `diff`, `export`, `test-report`

## Acceptance Gates

5 verification gates in `tests/gates/`:
1. **Structural** — file counts, annotation counts per language, schema files exist
2. **Functional** — Java processor produces valid v3 docspec.json
3. **Parity** — each language has 42/42 annotations, 13/13 DSTI channels
4. **Self-Doc** — package-info.java files exist, coverage >= 50%
5. **Integration** — full pipeline: source → docspec.json → resolve → site pages

## CI Workflows

7 workflows in `.github/workflows/`: `java.yml`, `site.yml`, `typescript-processor.yml`, `python-processor.yml`, `rust-processor.yml`, `examples.yml`, `acceptance-gates.yml`
