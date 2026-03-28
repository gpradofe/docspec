# Claude Code Prompt: DocSpec Codebase Restructuring & Fix

## Context

You are working on DocSpec, a universal documentation specification and testing intelligence system. The codebase has been audited against the specification in `SPEC.md` (docspec-v3-final-spec.md). This prompt describes all issues found and what needs to be done.

The full audit report is in `AUDIT-REPORT.md`. Read both `SPEC.md` and `AUDIT-REPORT.md` before starting.

**Key principle:** DocSpec should look and feel like Stripe's API documentation. The current implementation looks like generic Tailwind documentation. Every visual component should be compared against https://docs.stripe.com/api for reference.

---

## PHASE A: Critical Fixes (Do These First)

### A1: Add Root Files

Create these files in the project root:
- `README.md` — Project overview, what DocSpec is, quick start, architecture diagram (ASCII), links to spec
- `LICENSE` — MIT license, copyright Gustavo Aniceto / Aniceto Holdings 2026
- Root `package.json` or `Makefile` that orchestrates building all subprojects. At minimum: `npm run build:all`, `npm run test:all`, `npm run lint:all`

### A2: Restructure Into `packages/` Layout

Move from flat language-first to concern-first layout:

```
# Current:
java/docspec-annotations-java/ → packages/annotations/java/
java/docspec-processor-java/   → packages/processor/java/
java/docspec-maven-plugin/     → packages/build-plugins/maven/
typescript/annotations/        → packages/annotations/typescript/
typescript/processor/          → packages/processor/typescript/
python/annotations/            → packages/annotations/python/
python/processor/              → packages/processor/python/
rust/annotations/              → packages/annotations/rust/
rust/processor/                → packages/processor/rust/
go/annotations/                → packages/annotations/go/
go/processor/                  → packages/processor/go/
csharp/annotations/            → packages/annotations/csharp/
csharp/processor/              → packages/processor/csharp/
dsti/core/                     → packages/dsti/core/
dsti/generators/java/          → packages/test-generator/java/
dsti/generators/typescript/    → packages/test-generator/typescript/
dsti/generators/python/        → packages/test-generator/python/
dsti/generators/rust/          → packages/test-generator/rust/
dsti/generators/csharp/        → packages/test-generator/csharp/
plugins/gradle/                → packages/build-plugins/gradle/
plugins/cargo/                 → packages/build-plugins/cargo/
plugins/dotnet/                → packages/build-plugins/dotnet/
typescript/plugin/             → packages/build-plugins/npm/
python/plugin/                 → packages/build-plugins/pip/
go/plugin/                     → packages/build-plugins/go/
site/                          → packages/site/ (keep internal structure)
spec/                          → packages/spec/
```

Framework detector JSONs should be consolidated:
```
typescript/frameworks/*.json   → packages/frameworks/typescript/
python/frameworks/*.json       → packages/frameworks/python/
rust/frameworks/*.json         → packages/frameworks/rust/
go/frameworks/*.json           → packages/frameworks/go/
csharp/frameworks/*.json       → packages/frameworks/csharp/
```

DSTI-related code inside processors should be kept inside processors (they share one pass), but the generators are separate packages. Also keep `packages/dsti/core/` as the language-agnostic engine.

Update all import paths, pom.xml references, package.json references, and tsconfig paths after moving.

### A3: Stripe-Style 3-Panel EndpointPage

Rewrite `packages/site/themes/stripe/src/components/pages/EndpointPage.tsx` to match Stripe's API reference layout:

```
┌─────────────────────────────────────────────────────────┐
│ POST /v1/curricula/generate          [Curriculum Agent] │
├──────────────────────────┬──────────────────────────────┤
│                          │  ┌─ curl ─ java ─ ts ─ py ─┐│
│ Description text...      │  │                          ││
│                          │  │ curl https://api...      ││
│ ── PARAMETERS ────────── │  │   -H "Authorization..." ││
│                          │  │   -d '{...}'             ││
│ goal_id  string REQUIRED │  │                          ││
│   The goal to generate   │  └──────────────────────────┘│
│   a curriculum for.      │                              │
│                          │  ── RESPONSE ──────────────  │
│ difficulty  enum         │  ┌──────────────────────────┐│
│   beginner | advanced    │  │ {                        ││
│                          │  │   "id": "cur_1a2b3c",    ││
│ weekly_hours  integer    │  │   "title": "Full-Stack", ││
│   Available hours/week.  │  │   "milestones": [...]    ││
│                          │  │ }                        ││
│ ── INTERNAL PATH ─────── │  └──────────────────────────┘│
│ ▸ Show execution flow    │                              │
├──────────────────────────┴──────────────────────────────┤
│ Related: Errors | Events | Data Models                  │
└─────────────────────────────────────────────────────────┘
```

Key requirements:
- Left panel (60%): description, parameters table, internal flow trace (collapsible)
- Right panel (40%): dark background, language tabs (curl/java/typescript/python), code example, response preview
- Language tabs should be stateful (remembering user's language choice across pages)
- The right panel should be sticky (stays visible while scrolling left panel)
- Internal flow trace links to the FlowPage for the triggered @DocFlow
- Bottom: cross-links to related errors, events, data models

### A4: Syntax Highlighting in CodeBlock

Install and integrate Shiki (preferred for SSR/Next.js) or Prism into the CodeBlock component. Must support: java, typescript, python, rust, go, csharp, bash/shell, json, yaml, xml, sql, graphql.

```tsx
// Use Shiki for server-side highlighting
import { codeToHtml } from 'shiki';

// The CodeBlock should:
// 1. Highlight syntax with proper colors
// 2. Show line numbers (optional)
// 3. Have a copy button
// 4. Show language label
// 5. Support a title bar (filename)
```

### A5: Language Tabs Component

Create a `LanguageTabs` component used by EndpointPage and MemberPage:

```tsx
interface LanguageTabsProps {
  examples: Record<string, string>; // { curl: "...", java: "...", typescript: "...", python: "..." }
  defaultLanguage?: string;
}
```

Use React context or localStorage to persist language preference across pages (like Stripe does — choose Java once, all pages show Java).

### A6: Separate DSTI Channels Into Individual Files

In `packages/processor/java/src/main/java/io/docspec/processor/intent/channels/`, create 13 files:

```
NamingChannel.java            — Channel 1: Method name verb extraction
GuardClauseChannel.java       — Channel 2: if/throw pattern extraction
BranchStructureChannel.java   — Channel 3: if/else/switch tree extraction
NameBehaviorGapChannel.java   — Channel 4: Cross-reference channels 1 & 3
ReturnTypeChannel.java        — Channel 5: Return type field analysis
AssignmentPatternChannel.java — Channel 6: Builder/constructor data flow
LoopPatternChannel.java       — Channel 7: Stream/for-each analysis
ErrorHandlingChannel.java     — Channel 8: try/catch behavior
AssignmentChainChannel.java   — Channel 9: Field source tracing
ExceptionMessageChannel.java  — Channel 10: Message text parsing
ConstantChannel.java          — Channel 11: Named constant extraction
LoggingChannel.java           — Channel 12: Log statement analysis
EqualityChannel.java          — Channel 13: equals/hashCode contract
```

Each channel should implement a common interface:
```java
public interface IntentChannel {
    String channelName();
    int channelNumber();
    IntentSignals extract(ExecutableElement method, TypeElement owner, Trees trees);
}
```

The `IntentExtractor` (previously `IntentGraphExtractor`) orchestrates all channels and merges their signals. This is critical for the research paper's ablation study.

### A7: DSTI Generators Must Produce Real Assertions

Replace all `// TODO: implement` and `prop_assert!(true)` stubs with actual assertions derived from intent signals.

For guard clause tests, the generator should:
```java
// FROM intent signal: { condition: "goal == null", error: "IllegalArgumentException" }
// GENERATE:
@Test
void generate_nullGoal_throwsIllegalArgument() {
    assertThrows(IllegalArgumentException.class,
        () -> agent.generate(null, null));
}
```

For property tests from monotonic signals:
```java
// FROM intent signal: { rule: "weeklyHours UP → estimatedWeeks DOWN" }
// GENERATE:
@Property
void moreHours_meansFewerWeeks(
        @ForAll @IntRange(min=1, max=40) int h1,
        @ForAll @IntRange(min=1, max=40) int h2) {
    Assumptions.assumeThat(h1).isLessThan(h2);
    Curriculum c1 = agent.generate(goalWith(h1));
    Curriculum c2 = agent.generate(goalWith(h2));
    assertThat(c1.getEstimatedWeeks())
        .isGreaterThanOrEqualTo(c2.getEstimatedWeeks());
}
```

The generators must read the ACTUAL signal data (guard conditions, boundary values, monotonic rules, data flow paths) and produce REAL assertions. No TODOs.

### A8: Add `@DocCommutative` Annotation

Add to all 6 language annotation libraries:

Java: `java/docspec-annotations-java/src/main/java/io/docspec/annotation/DocCommutative.java`
```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface DocCommutative {
    String value() default "";
}
```

And equivalent in TypeScript, Rust, Python, C#, Go.

### A9: Expand Intent Graph Schema

Expand `packages/spec/intent-graph.schema.json` from 32 lines to a full standalone schema defining:
- All 13 channel signal types with their specific fields
- Guard clause signal: { condition, error, boundary: { below?, above?, exact? } }
- Naming signal: { verb, noun, implies[] }
- Branch signal: { conditions[], paths[], exhaustive }
- Data flow signal: { from, to, type: passthrough|aggregation|derived|generated }
- Loop signal: { over, operation: filter|map|flatMap|distinct|sorted, implies }
- Error handling signal: { catches, handling: wrap_and_throw|retry|log_and_continue|fallback }
- Constant signal: { name, value, type, implies }
- Cross-channel verification results: { issues[], methodsChecked, issueCount }
- ISD scores: { score, channelBreakdown{} }
- Gap report: { gaps[], recommendations[] }

Target: ~300-500 lines of comprehensive JSON Schema.

---

## PHASE B: Functional Completeness

### B1: GuidePage with Markdoc

Install `@markdoc/markdoc` and implement proper Markdoc rendering in GuidePage:
- Parse .md files as Markdoc
- Generate table of contents from headings
- Support custom Markdoc tags (callouts, code examples, tabs)
- Render with the theme's components (CodeBlock for fenced code, etc.)

### B2: Implement Search with FlexSearch

Install `flexsearch` and implement in SearchDialog:
- Build search index at build time from all page data
- Implement Cmd+K keyboard shortcut
- Show results grouped by section (API, Libraries, Architecture, etc.)
- Highlight matching text in results

### B3: MemberPage Split Layout

Rewrite MemberPage with split layout similar to EndpointPage:
- Left: method signature, description, parameters, return type, throws, since/deprecated badges
- Right: code examples with language tabs, "Referenced In" panel showing flows/endpoints/contexts
- Each method should be individually linkable (anchor links)

### B4: Cross-Linking Implementation

In `packages/site/core/src/cross-linker/`:
- `referenced-in.ts`: For each member, compute which endpoints call it, which flows reference it as an actor, which contexts mention it. Populate `referencedBy` on the member data.
- `trace-builder.ts`: For each endpoint with a linked @DocFlow, build the full trace view combining OpenAPI trigger → controller → flow steps → data store ops. Generate the ASCII-style trace used by TraceView component.
- `config-enricher.ts`: Link configuration properties to the flows/methods that read them.
- `security-enricher.ts`: Link security rules to endpoints.

### B5: ChangelogPage with Version Differ

Wire `site/core/src/diff/engine.ts` to the ChangelogPage. Given two versions of a docspec.json:
- Compute added/removed/modified members, methods, fields
- Compute added/removed flows, errors, events
- Render as a timeline with version tags

### B6: Missing Resolvers

Implement in `packages/site/core/src/resolver/`:
- `crates-resolver.ts` — Download crate, extract docspec.json
- `pypi-resolver.ts` — Download wheel/sdist, extract docspec.json
- `nuget-resolver.ts` — Download nupkg, extract docspec.json
- `npmrc-parser.ts` — Parse .npmrc for registry URLs and auth tokens

### B7: Flow Step Data Store Operations

In FlowPage, render `dataStoreOps` for each step:
```
Step 4: Persist
  💾 PostgreSQL: INSERT curricula, milestones, tasks
  🔒 @Transactional (all-or-nothing)
```

Show database icons, table names, operation types, and transaction boundaries.

---

## PHASE C: Quality & Polish

### C1: Add Tests

Priority test targets:
- Java processor: test that processing the waypoint-engine example produces correct docspec.json
- DSTI core: test cross-channel verifier, ISD calculator, gap reporter
- Site core: test page generator, navigation builder, cross-linker
- Stripe theme: test key components render without errors
- Target: 80%+ coverage on core packages

### C2: Connect Property DSL to Generators

The `property-dsl-parser.ts` in DSTI core parses expressions like `output.milestones SIZE > 0`. Connect this to the test generators so that `@DocInvariant(rules = {"milestones SIZE > 0"})` produces:
```java
assertThat(result.getMilestones()).isNotEmpty();
```

### C3: Full Database Schema Introspection

Complete `DatabaseSchemaIntrospector.java`:
- Parse JPA `@Table`, `@Column`, `@Index` annotations fully
- Extract CHECK constraints
- Extract FK cascade behavior
- Compare against live DB schema if connection URL provided
- Generate consistency report (schema vs entity mismatches)

### C4: MCP Server Tools

Verify/implement all 7 tools in `packages/site/mcp-server/`:
- `search(query)` — Full-text search
- `get-class(qualifiedName)` — Class documentation
- `get-endpoint(method, path)` — Endpoint documentation
- `get-flow(flowId)` — Flow with all steps
- `get-trace(endpoint)` — Full execution trace
- `get-errors(code)` — Error details
- `get-tests(qualifiedName)` — DSTI tests for a method

### C5: Example Projects Config

Add `docspec.config.yaml` to `examples/spring-boot-zero-config/` and `examples/waypoint-engine/` demonstrating the full pipeline from code → docspec.json → docs site.

### C6: FlowDiagram Visual Enhancement

Improve the SVG FlowDiagram:
- Add project boundary coloring (different colors per project in cross-project flows)
- Add retry loop arrows (curved arrow from retry step back to retryTarget)
- Add animation on load (steps appearing sequentially)
- Show data store icons on steps with `dataStoreOps`
- Make the diagram wider and more horizontal for complex flows
- Add hover tooltips showing step description

---

## Important Notes

- Read SPEC.md (docspec-v3-final-spec.md) for the full specification
- The visual benchmark is Stripe's API docs (https://docs.stripe.com/api)
- This project targets academic publication (ISSTA/FSE) and EB-1A immigration evidence
- The meta-dogfooding goal: DocSpec should document and test itself
- All 6 languages (Java, TypeScript, Rust, Python, C#, Go) should have feature parity in annotations and processors
- DSTI test generators must produce REAL executable tests, not stubs
# DocSpec Audit Addendum: Visual Quality & Scaffolder Design

## Addendum to AUDIT-REPORT.md — Additional Critical Issues

---

## 🔴 VISUAL AUDIT: Current vs Our Prototypes

### The Core Problem

Our prototypes (docs-platform.jsx, docspec-explorer.jsx, docspec-v2.jsx) used **intentional, precise design** with hand-tuned inline styles. The current codebase uses **generic Tailwind utility classes** that produce a cookie-cutter documentation look.

Key differences:

| Aspect | Our Prototypes | Current Codebase |
|--------|---------------|------------------|
| **Fonts** | Inter + JetBrains Mono via Google Fonts, with precise weights (550, 650) | Tailwind default `font-sans` / `font-mono` |
| **Colors** | Hand-picked palette: `#0f172a` dark, `#818cf8` accent, `#e2e8f0` borders with exact opacity values | Generic Tailwind color scale (`text-text-primary`, `border-border`) |
| **Endpoint layout** | Split: 60% params left, 40% dark code panel right (sticky) | Single column, everything stacked |
| **Code blocks** | Dark `#0f172a` background, syntax highlighted, language tabs, copy button with green flash | Gray background, no syntax highlighting, no language tabs |
| **Sidebar** | 260px with project switcher dropdown, colored project icons, method badges inline, collapsible endpoint lists | Basic nav with emoji icons (`📖`, `🔌`), no project switcher |
| **Method badges** | Colored bg + border + monospace (`GET` blue, `POST` green, `DELETE` red) | Generic `Badge` component with simple variants |
| **Top bar** | 52px with logo, search box with ⌘K hint, colored project dots | Simple header with hamburger toggle |
| **Flow diagrams** | Animated step-by-step reveal, color-coded project boundaries, hover descriptions, emoji type icons, retry loop arrows | Static vertical SVG, narrow, no animation, no hover |
| **Spacing** | Exact pixel values (letterSpacing: "-0.02em", gap: "10px") | Tailwind spacing scale (generic `mb-4`, `gap-3`) |
| **Visual richness** | 40 style declarations with gradients, transitions, hover effects per component | 36 className strings (generic utilities) |
| **Overall feel** | Stripe-quality, futuristic, intentional | Generic docs template, could be any Tailwind site |

### Specific Components That Need Visual Redesign

**C14: Sidebar Must Match Prototype**

Prototype sidebar had:
- Project switcher dropdown at top with colored square icons and version numbers
- Collapsible sections with uppercase 10.5px labels (letter-spacing 0.08em)
- Method badges (GET/POST/PATCH/DELETE) inline with endpoint names in the sidebar
- Active item highlighted with project color, not generic blue
- Hover transitions on every item
- Fixed width 260px, scrollable, border-right separator
- "Auto-generated from source" footer

Current sidebar has:
- No project switcher
- Emoji icons for sections
- No method badges
- Generic text styling
- No footer

**C15: Top Bar Must Match Prototype**

Prototype top bar had:
- 52px height, logo + "Docs" label on left
- Search box with "Search docs..." placeholder and ⌘K shortcut hint on right
- Colored dots representing each project (clickable to switch)
- Clean, minimal, Stripe-like

Current header has:
- Site name + hamburger toggle
- Docs/Tests tab switcher
- No search integration
- No project dots

**C16: EndpointPage Must Be Split Layout**

This is the single most important visual component. Our prototype had:

```
┌──────────────────────────────────────────────────┐
│  POST  /curricula/generate            [ai] tag   │
│  Generate a curriculum                           │
│  "Generates a complete curriculum from a goal..." │
├────────────────────────┬─────────────────────────┤
│                        │ ┌ curl │ ts │ py │ java┐│
│  PARAMETERS            │ │                      ││
│  ─────────────────     │ │ curl https://api...  ││
│  goal_id   string REQ  │ │   -H "Auth: ..."    ││
│    The goal to...      │ │   -d '{ "goal":...}'││
│                        │ │                      ││
│  difficulty  enum      │ └──────────────────────┘│
│    beginner | inter... │                         │
│                        │  RESPONSE               │
│  weekly_hours integer  │ ┌──────────────────────┐│
│    Available hours...  │ │ {                    ││
│                        │ │   "id": "cur_1a2b",  ││
│                        │ │   "milestones": [...] ││
│                        │ │ }                    ││
│                        │ └──────────────────────┘│
└────────────────────────┴─────────────────────────┘
```

The RIGHT PANEL must:
- Have a dark background (#0f172a)
- Be sticky (position: sticky, top: offset)
- Have language tabs at the top
- Show code with syntax highlighting
- Show response JSON below the code
- Stay visible while the left panel scrolls

**C17: Code Block Must Have Syntax Highlighting + Copy Feedback**

Prototype CodeBlock had:
- Background: #0f172a (near-black)
- Font: JetBrains Mono 12.5px, line-height 1.65
- Copy button: top-right, changes to green "Copied!" with background flash
- Title bar: darker header with language label + filename
- Border-radius: 8px

Current CodeBlock has:
- Background: gray-950 (close but generic)
- No syntax highlighting library
- Basic copy button
- No visual richness

**C18: FlowDiagram Must Be Rich and Animated**

Prototype FlowDiagram had:
- Animated step-by-step reveal (each step fades in with delay)
- Color-coded by project (each project gets its own color: indigo for engine, blue for API, orange for FindDoc)
- Emoji icons per step type (🧠 AI, 💾 storage, 🔄 retry, ⚙️ process)
- Hover: shows description text, highlights the step
- Retry loop: visual arrow from retry step back to target
- Project boundary indicators (colored tags showing which project each step belongs to)
- Substeps: expandable inline details

Current FlowDiagram has:
- Static vertical column
- No animation
- Has colors and emojis (good) but narrow single-column layout
- No hover descriptions
- Has retry support but basic

---

## 🔴 SCAFFOLDER: Must Be Interactive Like Docusaurus

### Current State

The scaffolder (`create-docspec-site`) does:
1. Creates a directory
2. Writes package.json, docspec.config.yaml, getting-started.md
3. Prints "Done!"

No interactivity. No questions. No dependency setup. No registry configuration.

### What It Should Do (Like Docusaurus + Better)

When you run `npx create-docspec-site my-docs`, it should:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   ◆ Create DocSpec Site                          │
│                                                  │
│   What is your project name?                     │
│   › my-docs                                      │
│                                                  │
│   What theme would you like?                     │
│   ● Stripe (clean, API-focused)                  │
│   ○ Dark (code-forward)                          │
│   ○ Minimal (simple, single-column)              │
│                                                  │
│   What languages does your project use?          │
│   ☑ Java                                         │
│   ☑ TypeScript                                   │
│   ☐ Python                                       │
│   ☐ Rust                                         │
│   ☐ C#                                           │
│   ☐ Go                                           │
│                                                  │
│   Do you have artifacts to document?             │
│   ● Yes, let me configure them                   │
│   ○ No, I'll add them later                      │
│                                                  │
│   ── Maven Artifact ──────────────────────       │
│   Group ID: com.waypoint                         │
│   Artifact ID: waypoint-engine                   │
│   Version: 2.3.1                                 │
│   Label: Waypoint Engine                         │
│   + Add another artifact                         │
│                                                  │
│   Do you use private registries?                 │
│   ● Yes                                          │
│   ○ No (public only)                             │
│                                                  │
│   How should we resolve credentials?             │
│   ● Import from ~/.m2/settings.xml               │
│   ○ Import from ~/.npmrc                         │
│   ○ Configure manually                           │
│   ○ Use environment variables                    │
│                                                  │
│   Do you have an OpenAPI spec?                   │
│   ● Yes: ./specs/api.json                        │
│   ○ No                                           │
│                                                  │
│   Enable DSTI test generation?                   │
│   ● Yes                                          │
│   ○ No                                           │
│                                                  │
│   Enable LLM integration?                        │
│   ☑ Generate llms.txt                            │
│   ☑ Generate CLAUDE.md                           │
│   ☐ MCP Server                                   │
│   ☐ Embeddings                                   │
│                                                  │
└──────────────────────────────────────────────────┘

Creating DocSpec site in ./my-docs...

  ✓ Created package.json
  ✓ Created docspec.config.yaml (with your artifacts)
  ✓ Created docs/getting-started/introduction.md
  ✓ Created docs/getting-started/quickstart.md
  ✓ Created docs/architecture/overview.md
  ✓ Created .gitignore
  ✓ Detected ~/.m2/settings.xml — imported registry config
  ✓ Resolved com.waypoint:waypoint-engine:2.3.1 ✓

  Done! Your DocSpec site is ready.

  Next steps:

    cd my-docs
    npm install
    npx docspec dev     ← starts at http://localhost:3000

  Your site will show:
    • 1 artifact (Waypoint Engine)
    • API Reference from ./specs/api.json
    • 3 getting-started guides
    • DSTI test documentation
```

### Technical Implementation

Use `@clack/prompts` (the library Astro and SvelteKit use) for the interactive CLI:

```typescript
import { intro, outro, text, select, multiselect, confirm, group, spinner } from '@clack/prompts';

async function create() {
  intro('Create DocSpec Site');

  const project = await group({
    name: () => text({ message: 'Project name', defaultValue: 'my-docs' }),
    theme: () => select({
      message: 'Theme',
      options: [
        { value: 'stripe', label: 'Stripe', hint: 'clean, API-focused' },
        { value: 'dark', label: 'Dark', hint: 'code-forward' },
        { value: 'minimal', label: 'Minimal', hint: 'simple' },
      ]
    }),
    languages: () => multiselect({
      message: 'Project languages',
      options: [
        { value: 'java', label: 'Java' },
        { value: 'typescript', label: 'TypeScript' },
        { value: 'python', label: 'Python' },
        { value: 'rust', label: 'Rust' },
        { value: 'csharp', label: 'C#' },
        { value: 'go', label: 'Go' },
      ]
    }),
    hasArtifacts: () => confirm({ message: 'Add artifacts now?' }),
  });

  // If Java selected, ask about Maven settings
  if (project.languages.includes('java')) {
    const mavenSettings = await confirm({
      message: 'Import registries from ~/.m2/settings.xml?'
    });
    // ... detect and import
  }

  // If has artifacts, loop to collect them
  if (project.hasArtifacts) {
    // ... collect artifact coordinates
  }

  // Scaffold with all collected config
  const s = spinner();
  s.start('Creating project...');
  await scaffold(project);
  s.stop('Project created!');

  // Try to resolve artifacts immediately
  if (project.hasArtifacts) {
    s.start('Resolving artifacts...');
    await resolveArtifacts(project);
    s.stop('Artifacts resolved!');
  }

  outro('Your DocSpec site is ready!');
}
```

### What Gets Generated

The scaffolder should create a RICH starter project, not a minimal one:

```
my-docs/
├── package.json              ← with correct dependencies
├── docspec.config.yaml       ← pre-filled with user's artifacts + registries
├── .gitignore
├── .docspec-cache/           ← pre-populated if artifacts were resolved
├── docs/
│   ├── getting-started/
│   │   ├── introduction.md   ← "Welcome to [Project Name] docs"
│   │   ├── quickstart.md     ← language-specific quickstart based on selection
│   │   └── installation.md
│   ├── architecture/
│   │   └── overview.md       ← placeholder with section structure
│   └── guides/
│       └── first-guide.md    ← example guide showing Markdoc features
├── specs/                    ← if user said they have OpenAPI
│   └── .gitkeep
└── assets/
    └── .gitkeep
```

The `docspec.config.yaml` should be FULLY POPULATED based on user answers, not commented-out examples.

---

## Amended Claude Code Prompt Addition

Add these to the Claude Code prompt as additional Phase A items:

### A10: Visual Redesign — Match Prototypes

The current theme uses generic Tailwind. It needs to match the visual quality of our prototypes (docs-platform.jsx, docspec-explorer.jsx, docspec-v2.jsx). Reference these files — they are the design system.

Key visual requirements:
1. **Fonts:** Import Inter (weights 300-700) + JetBrains Mono from Google Fonts. Use Inter for all body text, JetBrains Mono for all code/monospace. Use specific fractional weights: 550 for semi-bold, 650 for emphasis.
2. **Colors:** Use the prototype's exact palette, not generic Tailwind. Primary: #6366f1 (indigo), surfaces: #ffffff/#f8fafc/#f1f5f9, borders: #e2e8f0, text: #0f172a/#475569/#94a3b8, code backgrounds: #0f172a.
3. **Spacing:** Use precise values (letter-spacing: -0.02em for headings, padding: "10px 12px" for interactive elements). Don't rely on Tailwind's generic spacing scale for key elements.
4. **Transitions:** All interactive elements (sidebar items, buttons, tabs) should have `transition: all 0.15s ease`. Hover states should be intentional, not just color changes.
5. **The dark code panel** on EndpointPage and MemberPage must be #0f172a with syntax-highlighted code. This is the signature visual element.

### A11: Sidebar Redesign

Rewrite Sidebar to match prototype. Must have:
- **Project Switcher** at top: dropdown showing all artifacts with colored square icons, names, versions. Clicking switches the sidebar navigation context.
- **Section headers**: 10.5px uppercase, letter-spacing 0.08em, muted color
- **Items**: 13px, hover background transition, active item highlighted in project color
- **Resource items** (classes/modules) should show inline method badges when expanded
- **Endpoint items** should show method badges (GET/POST/PATCH/DELETE) inline
- Fixed 260px width, full-height, border-right #e2e8f0

### A12: Top Bar Redesign

Rewrite Header/TopBar to match prototype:
- 52px height, border-bottom
- Left: logo icon (colored square with first letter) + "Docs" text
- Center-right: search box with "Search docs..." placeholder + ⌘K hint (monospace, muted)
- Far right: colored dots for each project (7px circles, click to switch project)

### A13: Interactive Scaffolder

Rewrite `create-docspec-site` with `@clack/prompts` for interactive CLI:
- Project name
- Theme selection
- Language selection (multiselect)
- Artifact configuration wizard (Maven group/artifact/version, npm scope/package, etc.)
- Registry configuration (import from settings.xml / .npmrc / manual / env vars)
- OpenAPI spec path
- DSTI toggle
- LLM integration options
- Generate fully populated docspec.config.yaml from answers
- Try to resolve artifacts immediately and report success/failure
- Create rich starter docs (not just one file)
