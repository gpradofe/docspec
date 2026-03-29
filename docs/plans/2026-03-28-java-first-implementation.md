# Java-First Self-Documenting System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Get DocSpec to fully document and test itself through its own Java toolchain — rich annotations → processor → docspec.json with flows/errors/events/intent → dark-themed site rendering all 15 page types in a browser at localhost:3000.

**Architecture:** Five phases executed sequentially. Phase 1 (annotations) and Phase 2 (processor fixes) produce the DATA. Phase 3 (site rewrite) produces the UI. Phase 4 (pipeline) connects them. Phase 5 (verification) proves it works. Each phase has clear acceptance criteria that must pass before moving to the next.

**Tech Stack:** Java 17 (annotations + processor), Maven 3.9 (build), TypeScript/React 18/Next.js 15 (site), Shiki (syntax highlighting), pnpm workspace, vitest (TS tests)

**Visual Reference:** `docspec-poc.jsx` — this is the design system source of truth for the dark theme.

**Design Reference:** `docs/plans/2026-03-28-final-design.md` — the complete UX specification.

---

## Mandatory Process Rules

### Code Review After Every Phase
After each phase completes, a `superpowers:code-reviewer` agent MUST run against ALL modified files. The review checks:
1. Does each file compile/build without errors?
2. Do annotations match the annotation definition signatures?
3. Are there any TODO/FIXME stubs left?
4. Do ISD scores meet the target thresholds?
5. Do site components match the POC design tokens?
6. Are all imports correct and no dead imports?
7. Does the data flow end-to-end (annotation → docspec.json → site page)?

Bugs found in review MUST be fixed before proceeding to the next phase.

### Plugin Usage
Use ALL available plugins and tools when they help:
- **LSP plugins** (jdtls-lsp, typescript-lsp, pyright-lsp, gopls-lsp, csharp-lsp): Use for type checking, diagnostics, go-to-definition
- **code-reviewer agent**: MANDATORY after each phase completion
- **code-simplifier agent**: Run on complex files to reduce duplication
- **security-guidance plugin**: Check for injection vulnerabilities in site components
- **chrome-devtools-mcp**: For visual verification once the site is running
- **Explore agents**: For deep codebase searches when unsure about existing patterns

Parallel agents SHOULD use LSP plugins to validate their changes compile before returning.

---

## Phase 1: Annotate the Java Codebase

**Current state:** 102 classes discovered, 897 methods, but 0 flows, 0 errors, 0 events, 0 contexts. Only 14 of 42 annotations used. Key classes like DocSpecProcessor, all 13 channels, all 7 extractors are bare.

**Target state:** Rich annotations producing flows, errors, events, contexts, cross-refs, examples, and DSTI semantic properties on every significant class.

### Task 1.1: Add @DocFlow for the Processing Pipeline

**Files to modify:**
- `packages/processor/java/src/main/java/io/docspec/processor/DocSpecProcessor.java`

Add the main processing pipeline flow to DocSpecProcessor. This is a top-level flow with 7 phases:

```java
@DocFlow(id = "processing-pipeline",
    name = "DocSpec Processing Pipeline",
    description = "The 7-phase annotation processing pipeline that produces docspec.json with documentation and DSTI intent data.",
    trigger = "mvn docspec:generate",
    steps = {
        @Step(id = "1", name = "Auto-Discovery", actor = "AutoDiscoveryScanner",
              type = "process", description = "Scans all public classes and detects Spring/JPA/Jackson frameworks"),
        @Step(id = "2", name = "Read Metadata", actor = "AnnotationReader",
              type = "process", description = "Reads @DocModule, @DocFlow, @DocMethod, JavaDoc comments and infers descriptions"),
        @Step(id = "3", name = "Extract System Info", actor = "DocSpecExtractor",
              type = "process", description = "Runs 7 extractors: security, config, observability, data stores, external deps, privacy, errors/events"),
        @Step(id = "4", name = "DSTI Intent Extraction", actor = "IntentGraphExtractor",
              type = "ai", description = "Runs 13 intent channels on every method. Cross-verifies signals and computes ISD scores."),
        @Step(id = "5", name = "Cross-Reference Resolution", actor = "DocSpecProcessor",
              type = "process", description = "Resolves @DocUses, builds error.thrownBy, dataModel.usedBy, member.referencedBy"),
        @Step(id = "6", name = "Coverage Calculation", actor = "CoverageCalculator",
              type = "process", description = "Computes documentation coverage percentage and ISD distribution"),
        @Step(id = "7", name = "Serialize", actor = "SpecSerializer",
              type = "storage", description = "Writes docspec.json to target directory")
    }
)
```

### Task 1.2: Add @DocFlow for DSTI Analysis Sub-Flow

**Files to modify:**
- `packages/processor/java/src/main/java/io/docspec/processor/dsti/IntentGraphExtractor.java`

```java
@DocFlow(id = "dsti-analysis",
    name = "DSTI 13-Channel Intent Analysis",
    description = "Deep Structural and Textual Intent analysis. Runs 13 independent channels on each method, cross-verifies signals, and computes Intent Signal Density.",
    trigger = "IntentGraphExtractor.extract()",
    steps = {
        @Step(id = "d1", name = "Naming Analysis", actor = "NamingChannel", type = "process",
              description = "Extracts verb from method name, maps to behavioral intent category"),
        @Step(id = "d2", name = "Guard Clause Detection", actor = "GuardClauseChannel", type = "process",
              description = "Detects if-throw patterns as input validation preconditions"),
        @Step(id = "d3", name = "Branch Structure", actor = "BranchStructureChannel", type = "process",
              description = "Counts if/else/switch decision paths for path coverage"),
        @Step(id = "d4", name = "Return Type Analysis", actor = "ReturnTypeChannel", type = "process",
              description = "Analyzes return type for Optional, Collection, void patterns"),
        @Step(id = "d5", name = "Loop Pattern Detection", actor = "LoopPatternChannel", type = "process",
              description = "Detects stream operations, enhanced-for loops, stream ops"),
        @Step(id = "d6", name = "Error Handling Analysis", actor = "ErrorHandlingChannel", type = "process",
              description = "Counts try/catch blocks, extracts caught exception types"),
        @Step(id = "d7", name = "Constant Extraction", actor = "ConstantChannel", type = "process",
              description = "Finds UPPER_CASE constant references and assertion calls"),
        @Step(id = "d8", name = "Null Check Detection", actor = "ExceptionMessageChannel", type = "process",
              description = "Counts null-check patterns and Objects.requireNonNull calls"),
        @Step(id = "d9", name = "Logging Analysis", actor = "LoggingChannel", type = "process",
              description = "Detects logger method calls as behavioral markers"),
        @Step(id = "d10", name = "Validation Annotations", actor = "EqualityChannel", type = "process",
              description = "Counts @NotNull, @Valid, @Min, @Max etc. on parameters"),
        @Step(id = "d11", name = "Cross-Channel Verification", actor = "CrossChannelVerifier", type = "process",
              description = "Compares signals across channels to detect name-behavior gaps"),
        @Step(id = "d12", name = "ISD Calculation", actor = "IntentDensityCalculator", type = "process",
              description = "Computes weighted Intent Signal Density score from all channels"),
        @Step(id = "d13", name = "Gap Reporting", actor = "GapReporter", type = "process",
              description = "Generates gap report with severity levels and fix recommendations")
    }
)
```

### Task 1.3: Add @DocError to All Exception Conditions

**Files to modify:** Scan all Java files in processor for throw statements and add @DocError annotations.

Key errors to document:
- `DocSpecProcessor`: processing failure, annotation read error
- `SpecSerializer`: serialization failure, IO error
- `GenerateMojo`: configuration error, source compilation error
- `IntentGraphExtractor`: Trees API unavailable (warning, not error)
- `ValidateMojo`: schema validation failure
- `CoverageMojo`: coverage below threshold

Each @DocError gets: code, httpStatus (if applicable), description, causes, resolution.

### Task 1.4: Add @DocEvent to Processing Milestones

**Files to modify:** DocSpecProcessor.java primarily.

Events to document:
- `docspec.discovery.started` — triggered at pipeline start
- `docspec.discovery.completed` — after auto-discovery with class count
- `docspec.extraction.completed` — after all extractors run
- `docspec.dsti.completed` — after intent analysis with method count and avg ISD
- `docspec.serialization.completed` — after JSON written with file path and size
- `docspec.coverage.calculated` — after coverage with percentage

### Task 1.5: Add @DocContext to Maven Mojos

**Files to modify:** All Mojo files in `packages/build-plugins/maven/src/main/java/io/docspec/maven/`

Each Mojo gets `@DocContext` linking it to the flow it triggers:
- `GenerateMojo` → triggers `processing-pipeline`
- `ValidateMojo` → validates output of `processing-pipeline`
- `CoverageMojo` → reads output of `processing-pipeline`
- `GenerateTestsMojo` → triggers `dsti-analysis` for test generation

### Task 1.6: Add @DocUses Cross-References

**Files to modify:** Key classes that depend on other modules.

- `DocSpecProcessor` → @DocUses annotations module, all extractors
- `IntentGraphExtractor` → @DocUses all 13 channels, NamingAnalyzer, ISDCalculator
- `GenerateMojo` → @DocUses processor, annotations
- Each extractor → @DocUses processor model package

### Task 1.7: Add @DocExample to Key Methods

**Files to modify:** IntentGraphExtractor, DocSpecProcessor, NamingAnalyzer, CoverageCalculator.

Add verified code examples showing how to use each key method.

### Task 1.8: Add Semantic DSTI Annotations

**Files to modify:** All 13 channels + key processor classes.

- `@DocDeterministic` on NamingAnalyzer.analyze(), IntentDensityCalculator.calculate()
- `@DocIdempotent` on SpecSerializer.serialize()
- `@DocBoundary` on all public API entry points
- `@DocInvariant` with Property DSL rules on ISD calculator (score RANGE 0..1)
- `@DocPerformance` on the processing pipeline (expected latency per step)

### Task 1.9: Enrich @DocMethod Descriptions

**Files to modify:** Every significant class in the processor.

Currently most methods have auto-generated descriptions. Add rich `@DocMethod` with proper descriptions on:
- All public methods on all 13 channels
- All public methods on all 7 extractors
- DocSpecProcessor orchestration methods
- AnnotationReader public methods
- NamingAnalyzer and IntentDensityCalculator

**Acceptance gate for Phase 1:**
```bash
cd packages/processor/java && mvn compile -DskipTests -q
# Must compile with zero errors
```
Then re-run `mvn io.docspec:docspec-maven-plugin:generate` and verify:
- docspec.json has `flows` array with at least 2 flows
- docspec.json has `errors` array with at least 5 errors
- docspec.json has `events` array with at least 5 events
- docspec.json has `contexts` array with at least 4 contexts
- At least 30 methods have @DocMethod with custom descriptions

---

## Phase 2: Fix the Processor — ISD Scores and Signal Quality

**Current state:** ISD scores are mostly 0.025 (only nameSemantics contributing minimally). The NamingAnalyzer is returning "unknown" intent for most verbs. Channels execute but produce minimal signals.

### Task 2.1: Debug NamingAnalyzer Intent Detection

**File:** `packages/processor/java/src/main/java/io/docspec/processor/dsti/NamingAnalyzer.java`

Read the analyzer. The verb-to-intent mapping likely has too few verb categories or the regex splitting method names is wrong. Fix so that:
- "extract" → "transformation" or "query"
- "calculate" → "calculation"
- "detect" → "query"
- "read" → "query"
- "write" / "serialize" → "mutation"
- "scan" → "query"
- "build" / "create" → "creation"
- "validate" / "check" / "verify" → "validation"
- "process" → "transformation"
- "find" / "get" / "load" → "query"
- "set" / "add" / "remove" / "delete" → "mutation"
- "is" / "has" / "can" / "should" → "predicate"

After fix, re-run processor and verify <10% of methods show "unknown" intent.

### Task 2.2: Verify Channel Signal Production

Run the processor on itself and check the generated docspec.json:
- Channel 1 (naming): every method should have a nameSemantics with non-unknown intent
- Channel 2 (guards): methods with if-throw should show guardClauses > 0
- Channel 3 (branches): methods with if/else should show branches > 0
- Channel 7 (loops): methods with for/stream should show loopProperties
- Channel 8 (errors): methods with try/catch should show errorHandling
- Channel 12 (logging): methods with logger calls should show logStatements > 0

If any channel is producing all-zeros, read that channel's implementation and fix it.

### Task 2.3: Fix ISD Score Distribution

After fixing naming and channels, re-run and verify:
- Average ISD across all methods > 3.0 (currently ~0.025)
- At least 20% of methods have ISD > 5.0
- Top methods (like extract(), detect(), calculate()) have ISD > 8.0

**Acceptance gate for Phase 2:**
```bash
mvn install -DskipTests -q && cd packages/processor/java && mvn io.docspec:docspec-maven-plugin:generate
# Then check:
node -e "const d=require('./target/docspec.json'); const m=d.intentGraph.methods; const avg=m.reduce((s,m)=>s+m.intentSignals.intentDensityScore,0)/m.length; const high=m.filter(m=>m.intentSignals.intentDensityScore>5).length; console.log('Avg ISD:', avg.toFixed(2), 'High ISD (>5):', high, '/', m.length)"
# Expected: Avg ISD > 3.0, at least 50 methods with ISD > 5
```

---

## Phase 3: Rewrite Site Theme — Dark Theme from POC

**Current state:** Light Stripe theme with broken pipeline. Need to replace with dark theme matching docspec-poc.jsx.

**Target state:** Dark-themed site with two-lens architecture (Docs/Tests), unified sidebar, all page types rendering.

### Task 3.1: Create Dark Design Token System

**File to create:** `packages/site/themes/stripe/src/lib/tokens.ts`

Extract all design tokens from `docspec-poc.jsx` (lines 6-39) into a TypeScript module:
```typescript
export const T = {
  bg: "#0a0e17",
  surface: "rgba(255,255,255,0.02)",
  surfaceBorder: "#1e2430",
  // ... all tokens from POC
};
```

### Task 3.2: Rewrite App Shell (Layout + Header + Sidebar)

**Files to modify:**
- `packages/site/themes/stripe/src/components/layout/Layout.tsx`
- `packages/site/themes/stripe/src/components/layout/Header.tsx`
- `packages/site/themes/stripe/src/components/layout/Sidebar.tsx`
- `packages/site/app/src/app/layout.tsx`
- `packages/site/app/src/app/globals.css`

Rewrite to match POC app shell:
- Dark background (#0a0e17)
- 48px top bar with logo, Docs/Tests tab toggle, search, project switcher
- Unified sidebar (same tree both lenses, badges change)
- DM Sans + JetBrains Mono fonts
- Lens state (docs/tests) in context, preserved on navigation
- Sidebar items show test counts + ISD in Tests lens

### Task 3.3: Rewrite Landing Page

**File:** `packages/site/themes/stripe/src/components/pages/LandingPage.tsx` + `packages/site/app/src/app/page.tsx`

Match POC Landing():
- Project cards with colored icons, versions, descriptions, hover lift
- Quick stats row (classes, methods, tests, channels, coverage, avg ISD)
- "Meta-dogfooding" badge

In Tests lens: Dashboard with treemap/table + channel bars + gap list.

### Task 3.4: Rewrite Class/Member Page

**File:** `packages/site/themes/stripe/src/components/pages/MemberPage.tsx`

Match POC ClassPage():
- Header with kind badge, tags, since version
- CLASS TEST HEALTH box (always visible, methods with progress bars)
- Fields section, Dependencies section (clickable cards)
- Methods: expandable with params/returns/throws/example + DSTI badge
- Annotation Source section
- Referenced In section

In Tests lens: Method table → expandable Source View + Card View.

### Task 3.5: Rewrite Endpoint Page

**File:** `packages/site/themes/stripe/src/components/pages/EndpointPage.tsx`

Match POC EndpointPage():
- Split layout: left params, right dark code panel with language tabs
- Internal Pipeline trace showing call chain
- Response preview

### Task 3.6: Rewrite Flow Page

**File:** `packages/site/themes/stripe/src/components/pages/FlowPage.tsx`

Match POC FlowPage():
- Interactive step diagram with hover effects
- Step type icons and colors
- Data store operation indicators
- Project boundary boxes for cross-project flows

### Task 3.7: Rewrite Dependency Graph Page

**File:** `packages/site/themes/stripe/src/components/pages/GraphPage.tsx`

Match POC GraphPage():
- Interactive SVG with hover → highlight connections
- Node size = ISD score
- Node color = group
- ISD badge on each node
- Test count below each node
- Detail panel on hover

### Task 3.8: Implement Test Dashboard (Tests lens overview)

**File:** `packages/site/themes/stripe/src/components/pages/TestDashboardPage.tsx`

Match POC TestOverview():
- Stats cards (tests, coverage, avg ISD, ISD range)
- Channel breakdown with horizontal bars + bug counts
- Cross-channel gaps list with severity

### Task 3.9: Implement Test Detail Page (Tests lens per-method)

**File:** `packages/site/themes/stripe/src/components/pages/TestDetailPage.tsx`

Match POC TestDetail():
- Intent signals per channel (icon, signal description, test count, source evidence)
- Generated tests as expandable cards
- Intent vs Code side-by-side panels
- "Why this test exists" explanation
- Gap detection with 3 fix options

### Task 3.10: Implement CodeBlock with Dark Theme

**File:** `packages/site/themes/stripe/src/components/ui/CodeBlock.tsx`

Match POC Code():
- Dark background (#0d1117)
- Line-level syntax coloring (comments dim, annotations blue, keywords purple, strings green, assertions yellow)
- Copy button with green flash
- Title bar with language label

**Acceptance gate for Phase 3:**
```bash
cd /path/to/docspec && pnpm -r --filter './packages/site/**' build
# All theme packages must compile. TypeScript errors = 0.
```

---

## Phase 4: Fix End-to-End Pipeline

### Task 4.1: Fix Data Loading

**File:** `packages/site/app/src/lib/load-site-data.ts`

Ensure the site data loads correctly when the Next.js app starts. The `site-data.json` must be findable. Consider using an environment variable `DOCSPEC_SITE_DATA` pointing to the absolute path.

### Task 4.2: Fix Page Router

**File:** `packages/site/app/src/app/[...slug]/page.tsx`

Ensure `generateStaticParams()` works for dev mode (not just static export). For dev, it should return all page slugs from site data.

### Task 4.3: Fix Page Renderer — Two-Lens Dispatch

**File:** `packages/site/app/src/lib/page-renderer.tsx`

Add lens awareness. The PageRenderer should accept a `lens: "docs" | "tests"` prop and dispatch to the correct component variant:

```tsx
// Docs lens
case PageType.MEMBER:
  return <MemberPage data={page.data} lens="docs" />;

// Tests lens - same component, different rendering
case PageType.MEMBER:
  return <MemberPage data={page.data} lens="tests" />;
```

### Task 4.4: Wire CLI → Site Data → Dev Server

Run the full pipeline:
```bash
# 1. Build Java
mvn install -DskipTests

# 2. Generate docspec.json
cd packages/processor/java && mvn io.docspec:docspec-maven-plugin:generate

# 3. Copy to docspec-docs
cp target/docspec.json ../../docspec-docs/docspec-processor.json

# 4. Run CLI resolve
cd docspec-docs && node ../packages/site/cli/dist/index.js resolve -c docspec.config.yaml

# 5. Copy site data to app
cp .docspec-cache/site-data.json ../packages/site/app/.docspec-cache/

# 6. Start dev server
cd ../packages/site/app && npx next dev -p 3000
```

### Task 4.5: Create One-Command Build Script

**File to create:** `scripts/build-and-serve.sh`

Automates the entire pipeline from step 1-6 above into one command.

**Acceptance gate for Phase 4:**
```bash
bash scripts/build-and-serve.sh
# Then: curl -s http://localhost:3000 | grep "DocSpec"
# Must return HTML with DocSpec content
```

---

## Phase 5: End-to-End Verification

### Task 5.1: Verify Landing Page
Open localhost:3000 → see project cards, stats, meta-dogfooding badge.

### Task 5.2: Verify Class Pages
Navigate to IntentGraphExtractor → see fields, dependencies, methods with DSTI badges, annotation source.

### Task 5.3: Verify Flow Pages
Navigate to Processor Pipeline → see 7-step interactive diagram with hover effects.

### Task 5.4: Verify Test Dashboard
Switch to Tests lens → see stats, channel bars, gap list.

### Task 5.5: Verify Test Detail
Click IntentGraphExtractor in Tests lens → see channel signals, generated tests, intent-vs-code.

### Task 5.6: Verify Lens Switching
While on IntentGraphExtractor in Docs → click Tests tab → should stay on IntentGraphExtractor but show test view. And vice versa.

### Task 5.7: Verify Navigation
Click through every sidebar item → every page renders without errors.

### Task 5.8: Screenshot and Document
Take screenshots of each page type for documentation and paper.

**Final acceptance:**
All 8 verification tasks pass. The site renders every page type with real data from DocSpec's own Java codebase.
