# DocSpec

**Universal documentation specification & toolchain** — generates structured, machine-readable documentation from any codebase. Not just REST APIs: libraries, SDKs, services, scheduled jobs, event processors, and entire architectures.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/spec-v3.0.0-6366f1.svg)]()
[![Languages](https://img.shields.io/badge/languages-6-22c55e.svg)]()

---

## What is DocSpec?

DocSpec extracts documentation and behavioral intent from source code at build time, producing a universal `docspec.json` artifact that drives documentation sites, test generation, and AI context — all from a single annotation pass.

```
┌─────────────────────────────────────────────────────────────────┐
│                     SOURCE CODE + ANNOTATIONS                    │
│  Java · TypeScript · Python · Rust · C# · Go                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Build-time processors
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        docspec.json v3                           │
│  Modules · Methods · Flows · Data Models · Errors · Events      │
│  Data Stores · Config · Security · Privacy · Intent Graph        │
└──────────┬──────────────┬──────────────┬───────────────┬────────┘
           │              │              │               │
           ▼              ▼              ▼               ▼
      ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌────────────┐
      │ Docs    │  │ Tests     │  │ AI       │  │ Changelog  │
      │ Site    │  │ (DSTI)    │  │ Context  │  │ & Diff     │
      │ 19 page │  │ 13-channel│  │ llms.txt │  │ engine     │
      │ types   │  │ intent    │  │ MCP srv  │  │            │
      └─────────┘  └───────────┘  └──────────┘  └────────────┘
```

## Key Features

| Feature | Description |
|---------|-------------|
| **42 Annotations** | Comprehensive annotation set across all 6 languages with full parity |
| **3-Tier Model** | Zero-config → Minimal → Full annotations. Useful docs from day zero |
| **13 DSTI Channels** | Deep Structural & Textual Intent — deterministic test generation from code semantics |
| **19 Page Types** | From landing pages to intent graphs, all auto-generated |
| **3 Themes** | Stripe (professional), Dark (code-forward), Minimal (simple) |
| **6 Languages** | Java (reference), TypeScript, Python, Rust, C#, Go |
| **AI Integration** | llms.txt, MCP server, CLAUDE.md generation |
| **Framework Detection** | Spring Boot, Express, FastAPI, Axum, ASP.NET, Gin — auto-discovered |

## Quick Start

### Generate documentation (Java)

```bash
# Add the Maven plugin to your pom.xml, then:
mvn docspec:generate        # → produces docspec.json
mvn docspec:validate        # → validates against schema
mvn docspec:coverage        # → checks documentation coverage
```

### Create a documentation site

```bash
npx create-docspec-site my-docs
cd my-docs
npm install
npx docspec dev             # → http://localhost:3000
```

### Build everything from source

```bash
git clone https://github.com/aniceto-holdings/docspec.git
cd docspec

# Java (reference implementation)
cd java && mvn install -DskipTests

# Documentation site
cd ../site && pnpm install && pnpm -r build

# Run acceptance gates
bash tests/gates/run-all-gates.sh
```

## Repository Structure

```
docspec/
├── spec/                    # JSON Schema source of truth (v3.0.0)
├── java/                    # Java: annotations, processor, Maven plugin
├── typescript/              # TypeScript: decorators, processor, npm plugin
├── python/                  # Python: decorators, processor, pip plugin
├── rust/                    # Rust: attribute macros, processor
├── csharp/                  # C#: attributes, Roslyn processor
├── go/                      # Go: struct tags, processor
├── dsti/                    # DSTI: shared core + test generators
├── site/                    # Documentation site framework (pnpm workspace)
│   ├── core/                #   @docspec/core — config, resolver, generator
│   ├── cli/                 #   docspec CLI — 10 commands
│   ├── themes/stripe/       #   @docspec/theme-stripe — Stripe-style theme
│   ├── themes/dark/         #   @docspec/theme-dark
│   ├── themes/minimal/      #   @docspec/theme-minimal
│   └── app/                 #   Next.js 15 app shell
├── examples/                # 21 example projects (3 tiers × 6 languages)
├── tests/                   # 5 acceptance gates + E2E tests
└── research/                # Research paper materials
```

## DSTI: Test Intelligence

DocSpec's **Deep Structural & Textual Intent** engine extracts behavioral signals through 13 independent channels:

1. **Naming** — Method name verb/noun extraction
2. **Guard Clauses** — if/throw input validation patterns
3. **Branch Structure** — if/else/switch decision trees
4. **Name-Behavior Gaps** — Cross-reference naming vs. actual branches
5. **Return Type** — Return type field analysis
6. **Assignment Patterns** — Builder/constructor data flow
7. **Loop Patterns** — Stream/for-each semantics
8. **Error Handling** — try/catch behavior classification
9. **Assignment Chains** — Field source tracing
10. **Exception Messages** — Null check patterns
11. **Constants** — Named constant extraction
12. **Logging** — Log statement behavioral markers
13. **Equality Contracts** — equals/hashCode/compareTo verification

Each channel produces testable signals. The generators turn these into real executable tests — JUnit 5, Vitest, pytest, xUnit, and more.

## Documentation Specification

The complete v3 specification is in [`docspec-v3-final-spec.md`](docspec-v3-final-spec.md). The JSON Schema source of truth is [`spec/docspec.schema.json`](spec/docspec.schema.json).

## License

[MIT](LICENSE) — Copyright (c) 2026 Gustavo Aniceto / Aniceto Holdings
