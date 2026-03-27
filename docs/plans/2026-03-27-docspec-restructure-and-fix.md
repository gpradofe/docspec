# DocSpec Codebase Restructuring & Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the DocSpec codebase to match the v3 specification, add Stripe-quality visual design, separate DSTI channels for ablation studies, produce real test assertions from intent signals, and fill all functional gaps identified in the audit.

**Architecture:** The work is organized into 6 independent streams that can be parallelized. Stream 1 (Infrastructure) and Stream 2 (Visual/UI) are the highest impact. Stream 3 (DSTI) is critical for the research paper. The `packages/` restructure (Task 2) is deferred to last within Stream 1 because it touches every import path — all other work should be done in the current layout first, then moved.

**Tech Stack:** React 18 + Next.js 15, TypeScript, Shiki (syntax highlighting), @clack/prompts (interactive CLI), FlexSearch, @markdoc/markdoc, Tailwind CSS (with precise overrides), Java 17+ annotation processing, jqwik (property tests), pnpm workspace

---

## Audit & Acceptance Flow

**After EVERY task, the implementing agent MUST verify these before marking complete:**

### Per-Task Acceptance Checklist
1. **Files exist** — Every file listed under "Create:" exists at the expected path
2. **No syntax errors** — TypeScript files: `npx tsc --noEmit` passes. Java: `mvn compile` passes. JSON: valid JSON.
3. **No broken imports** — Every `import` / `require` resolves to an existing file
4. **Exports registered** — New components are exported from their package's `index.ts` / barrel file
5. **Types match** — New props/interfaces are compatible with existing consumers (check `page.ts` types)
6. **No TODO/stub left** — grep for `// TODO` in modified files; none allowed in Phase A
7. **Visual spec met** — For UI tasks: specific pixel values, colors, fonts match the plan (not generic Tailwind)

### Per-Batch Audit (run after each parallel batch completes)
```bash
# 1. TypeScript compilation check (site workspace)
cd site && pnpm -r build 2>&1 | tail -20

# 2. Java compilation check
cd java && mvn compile -DskipTests 2>&1 | tail -20

# 3. Grep for leftover TODOs in modified files
grep -rn "// TODO" --include="*.ts" --include="*.tsx" --include="*.java" site/ java/ dsti/

# 4. Verify all exports
node -e "require('./site/themes/stripe/dist/index.js')" 2>&1

# 5. JSON schema validation
python -c "import json; json.load(open('spec/intent-graph.schema.json'))" 2>&1
```

### Batch Execution Order
| Batch | Tasks (parallel) | Gate |
|-------|-----------------|------|
| **Batch 1** | Task 1 (root files), Task 8c (fonts/colors), Task 9 (DSTI channels), Task 10 (@DocCommutative), Task 11 (intent schema) | All files exist, Java compiles, JSON valid |
| **Batch 2** | Task 5 (Shiki), Task 8a (Sidebar), Task 8b (Header), Task 12 (generators), Task 13 (scaffolder) | Site builds, no TODOs, exports work |
| **Batch 3** | Task 6 (LanguageTabs), Task 7 (EndpointPage) | Full site builds, 3-panel renders |
| **Batch 4** | Phase B tasks (14-19b) | All pages render, cross-links resolve |
| **Batch 5** | Phase C tasks (20-25) | Tests pass, 80%+ coverage on core |
| **FINAL** | Task 26 (packages/ restructure) | `npm run build:all` + `npm run test:gates` pass |

### Task Completion Markers
Each task in this document will be marked with status:
- `[ ]` — Not started
- `[~]` — In progress
- `[✓]` — Completed and verified
- `[!]` — Blocked or needs revision

---

## Dependency Graph

```
Stream 1: Infrastructure          Stream 2: Visual/UI             Stream 3: DSTI/Intent
┌─────────────────────┐          ┌──────────────────────┐        ┌─────────────────────┐
│ Task 1: Root files   │          │ Task 5: Shiki setup  │        │ Task 9: Channel     │
│ (README, LICENSE,    │          │ (CodeBlock rewrite)  │        │   separation (Java) │
│  root package.json)  │          └──────────┬───────────┘        └─────────────────────┘
└─────────────────────┘                      │                    ┌─────────────────────┐
                                  ┌──────────▼───────────┐        │ Task 10: @DocComm.  │
                                  │ Task 6: LanguageTabs  │        │   (6 languages)     │
                                  └──────────┬───────────┘        └─────────────────────┘
                                             │                    ┌─────────────────────┐
                                  ┌──────────▼───────────┐        │ Task 11: Intent     │
                                  │ Task 7: EndpointPage  │        │   graph schema      │
                                  │ (3-panel Stripe)     │        └─────────────────────┘
                                  └──────────────────────┘        ┌─────────────────────┐
                                  ┌──────────────────────┐        │ Task 12: Real test  │
                                  │ Task 8a: Sidebar     │        │   generators        │
                                  │ Task 8b: Header      │        └─────────────────────┘
                                  └──────────────────────┘
                                                                  Stream 4: Scaffolder
Stream 5: Functional             Stream 6: Quality               ┌─────────────────────┐
┌─────────────────────┐          ┌──────────────────────┐        │ Task 13: Interactive │
│ Task 14: GuidePage   │          │ Task 20: Tests       │        │   CLI scaffolder     │
│ Task 15: Search      │          │ Task 21: PropDSL     │        └─────────────────────┘
│ Task 16: MemberPage  │          │ Task 22: DB schema   │
│ Task 17: Cross-links │          │ Task 23: MCP server  │
│ Task 18: Changelog   │          │ Task 24: Examples    │
│ Task 19: Resolvers   │          │ Task 25: FlowDiagram │
│ Task 19b: Flow DSO   │          └──────────────────────┘
└─────────────────────┘

FINAL (after all above):
┌──────────────────────────────────────────┐
│ Task 26: packages/ restructure (A2)       │
│ Move files, update ALL imports, verify    │
└──────────────────────────────────────────┘
```

---

## STREAM 1: Infrastructure & Root Files

### Task 1: Add Root Files (A1) [✓ COMPLETED]

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Create: `package.json` (root orchestrator)
- Create: `Makefile`

**Step 1: Create LICENSE (MIT)**

```
MIT License

Copyright (c) 2026 Gustavo Aniceto / Aniceto Holdings

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 2: Create root `package.json`**

```json
{
  "name": "docspec",
  "version": "3.0.0",
  "private": true,
  "description": "Universal documentation specification & toolchain",
  "scripts": {
    "build:java": "cd java && mvn install -DskipTests",
    "build:site": "cd site && pnpm install && pnpm -r build",
    "build:ts": "cd typescript/processor && npm install && npm run build",
    "build:python": "cd python/processor && pip install -e .",
    "build:rust": "cd rust/processor && cargo build",
    "build:csharp": "cd csharp/processor && dotnet build",
    "build:go": "cd go/processor && go build ./...",
    "build:all": "npm run build:java && npm run build:site && npm run build:ts",
    "test:gates": "bash tests/gates/run-all-gates.sh",
    "test:e2e": "bash tests/e2e/java-pipeline.test.sh && bash tests/e2e/tier-matrix.test.sh",
    "test:all": "npm run test:gates && npm run test:e2e",
    "lint:all": "cd site && pnpm -r lint"
  },
  "license": "MIT",
  "author": "Gustavo Aniceto <gustavo@anicetoholdings.com>"
}
```

**Step 3: Create README.md**

Write a comprehensive README with:
- Project description (what DocSpec is)
- ASCII architecture diagram showing the 3-layer pipeline
- Quick start (Java + site)
- 6-language badge row
- Links to spec, audit, research paper outline
- Feature highlights: 42 annotations, 13 DSTI channels, 19 page types, 3 themes
- License badge

**Step 4: Commit**

```bash
git add README.md LICENSE package.json
git commit -m "feat(root): add README, LICENSE (MIT), and root package.json orchestrator"
```

---

## STREAM 2: Visual/UI Components

### Task 5: Syntax Highlighting with Shiki (A4) [✓ COMPLETED]

**Files:**
- Modify: `site/themes/stripe/src/components/ui/CodeBlock.tsx`
- Modify: `site/themes/stripe/package.json` (add shiki dep)
- Create: `site/themes/stripe/src/lib/highlighter.ts`

**Step 1: Install Shiki**

```bash
cd site/themes/stripe && pnpm add shiki
```

**Step 2: Create highlighter singleton**

Create `site/themes/stripe/src/lib/highlighter.ts`:

```typescript
import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

const SUPPORTED_LANGS = [
  'java', 'typescript', 'python', 'rust', 'go', 'csharp',
  'bash', 'shell', 'json', 'yaml', 'xml', 'sql', 'graphql',
  'javascript', 'tsx', 'jsx', 'toml', 'properties',
] as const;

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: [...SUPPORTED_LANGS],
    });
  }
  return highlighterPromise;
}
```

**Step 3: Rewrite CodeBlock with Shiki**

Rewrite `CodeBlock.tsx`:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { getHighlighter } from "../lib/highlighter.js";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = "java", title, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");

  useEffect(() => {
    getHighlighter().then((highlighter) => {
      const supportedLangs = highlighter.getLoadedLanguages();
      const lang = supportedLangs.includes(language as any) ? language : "text";
      const html = highlighter.codeToHtml(code, { lang, theme: "github-dark" });
      setHighlightedHtml(html);
    });
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #1e293b" }}>
      {(title || language) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 16px", borderBottom: "1px solid #1e293b",
          background: "#0c1222", fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
        }}>
          <span style={{ color: "#94a3b8" }}>{title || language}</span>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? "#166534" : "transparent",
              border: "1px solid " + (copied ? "#22c55e" : "#334155"),
              borderRadius: 4, padding: "2px 8px", cursor: "pointer",
              color: copied ? "#4ade80" : "#94a3b8", fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              transition: "all 0.15s ease",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <div style={{ background: "#0f172a", padding: 16, overflowX: "auto" }}>
        {highlightedHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            style={{ fontSize: 12.5, lineHeight: 1.65, fontFamily: "'JetBrains Mono', monospace" }}
            className="shiki-container"
          />
        ) : (
          <pre style={{ margin: 0 }}>
            <code style={{
              fontSize: 12.5, lineHeight: 1.65, color: "#e2e8f0",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {code}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Add global Shiki CSS override**

In `site/app/src/app/globals.css`, add:
```css
/* Shiki overrides — remove default background so our container controls it */
.shiki-container pre { background: transparent !important; margin: 0; padding: 0; }
.shiki-container code { font-family: 'JetBrains Mono', monospace; }
```

**Step 5: Commit**

```bash
git add site/themes/stripe/src/components/ui/CodeBlock.tsx site/themes/stripe/src/lib/highlighter.ts site/themes/stripe/package.json site/app/src/app/globals.css
git commit -m "feat(theme-stripe): add Shiki syntax highlighting to CodeBlock"
```

---

### Task 6: LanguageTabs Component (A5) [✓ COMPLETED]

**Files:**
- Create: `site/themes/stripe/src/components/ui/LanguageTabs.tsx`
- Create: `site/themes/stripe/src/context/LanguageContext.tsx`
- Modify: `site/themes/stripe/src/index.ts` (export new components)

**Step 1: Create LanguageContext**

```tsx
"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "docspec-preferred-language";
const DEFAULT_LANGUAGE = "curl";

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setLanguageState(stored);
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
```

**Step 2: Create LanguageTabs component**

```tsx
"use client";

import React from "react";
import { useLanguage } from "../context/LanguageContext.js";
import { CodeBlock } from "./CodeBlock.js";

interface LanguageTabsProps {
  examples: Record<string, string>;
  defaultLanguage?: string;
  title?: string;
}

const LANG_LABELS: Record<string, string> = {
  curl: "cURL", java: "Java", typescript: "TypeScript", python: "Python",
  go: "Go", rust: "Rust", csharp: "C#", bash: "Shell",
};

export function LanguageTabs({ examples, title }: LanguageTabsProps) {
  const { language, setLanguage } = useLanguage();
  const languages = Object.keys(examples);
  const active = languages.includes(language) ? language : languages[0];

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #1e293b" }}>
      {/* Tab bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        background: "#0c1222", borderBottom: "1px solid #1e293b",
        padding: "0 8px",
      }}>
        {title && (
          <span style={{
            fontSize: 11, color: "#64748b", padding: "8px 12px 8px 8px",
            borderRight: "1px solid #1e293b", marginRight: 4,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {title}
          </span>
        )}
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            style={{
              padding: "8px 12px", fontSize: 12, cursor: "pointer",
              background: lang === active ? "#1e293b" : "transparent",
              color: lang === active ? "#e2e8f0" : "#64748b",
              border: "none", borderBottom: lang === active ? "2px solid #6366f1" : "2px solid transparent",
              fontFamily: "'JetBrains Mono', monospace",
              transition: "all 0.15s ease",
            }}
          >
            {LANG_LABELS[lang] || lang}
          </button>
        ))}
      </div>
      {/* Code content */}
      <div style={{ background: "#0f172a" }}>
        <CodeBlock code={examples[active]} language={active} />
      </div>
    </div>
  );
}
```

**Step 3: Export from index.ts**

Add to `site/themes/stripe/src/index.ts`:
```typescript
export { LanguageTabs } from "./components/ui/LanguageTabs.js";
export { LanguageProvider, useLanguage } from "./context/LanguageContext.js";
```

**Step 4: Commit**

```bash
git add site/themes/stripe/src/components/ui/LanguageTabs.tsx site/themes/stripe/src/context/LanguageContext.tsx site/themes/stripe/src/index.ts
git commit -m "feat(theme-stripe): add LanguageTabs with persistent language preference"
```

---

### Task 7: Stripe-Style 3-Panel EndpointPage (A3) [✓ COMPLETED]

**Files:**
- Modify: `site/themes/stripe/src/components/pages/EndpointPage.tsx`
- Modify: `site/core/src/types/page.ts` (add `examples` field to EndpointPageData)

**Step 1: Extend EndpointPageData type**

In `site/core/src/types/page.ts`, add `examples` and `responseExample` to `EndpointPageData`:

```typescript
export interface EndpointPageData {
  type: PageType.ENDPOINT;
  method: Method;
  memberQualified: string;
  memberName: string;
  artifact: { label: string; color?: string };
  examples?: Record<string, string>;        // { curl: "...", java: "...", ... }
  responseExample?: string;                  // JSON response preview
  linkedFlowId?: string;                     // For "Show execution flow" link
}
```

**Step 2: Rewrite EndpointPage as 3-panel split**

Full rewrite of `EndpointPage.tsx` — left panel (60%) for description + params, right panel (40%) dark sticky code panel with LanguageTabs + response preview. Include:

- HTTP method badge + path in header spanning both panels
- Left: description, PARAMETERS section with `ParameterTable`, collapsible "Internal Flow" section linking to FlowPage
- Right: sticky `position: sticky; top: 80px`, dark `#0f172a` background, `LanguageTabs` for request examples, `ResponsePreview` for response JSON
- Bottom: cross-links row (Related Errors | Events | Data Models)

Key layout CSS:
```tsx
<div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 0, minHeight: "100vh" }}>
  {/* Left panel */}
  <div style={{ padding: "32px 40px 32px 0", borderRight: "1px solid #e2e8f0" }}>
    ...
  </div>
  {/* Right panel — sticky dark code */}
  <div style={{
    position: "sticky", top: 56, alignSelf: "start",
    padding: 24, background: "#0f172a", minHeight: "calc(100vh - 56px)",
  }}>
    ...
  </div>
</div>
```

**Step 3: Commit**

```bash
git add site/themes/stripe/src/components/pages/EndpointPage.tsx site/core/src/types/page.ts
git commit -m "feat(theme-stripe): rewrite EndpointPage as Stripe-style 3-panel split layout"
```

---

### Task 8a: Sidebar Redesign (A11) [✓ COMPLETED]

**Files:**
- Modify: `site/themes/stripe/src/components/layout/Sidebar.tsx`
- Modify: `site/themes/stripe/src/components/ui/ProjectSwitcher.tsx`
- Modify: `site/themes/stripe/src/components/ui/Badge.tsx` (ensure HTTP method badge variants exist)

**Step 1: Rewrite Sidebar**

Complete rewrite with:
- `ProjectSwitcher` dropdown at top (colored square icons, artifact names, versions)
- Section headers: 10.5px uppercase, letter-spacing 0.08em, `#94a3b8` color
- Items: 13px Inter, hover `background: #f8fafc` with `transition: all 0.15s ease`
- Active item highlighted in project color (from artifact `color` field)
- Endpoint items show inline HTTP method badges (GET blue, POST green, DELETE red, PATCH orange)
- Fixed 260px width, full height, border-right `#e2e8f0`
- "Generated by DocSpec" footer at bottom

**Step 2: Update ProjectSwitcher to be a dropdown**

The existing `ProjectSwitcher.tsx` should render as a styled dropdown with colored square icons per artifact.

**Step 3: Commit**

```bash
git add site/themes/stripe/src/components/layout/Sidebar.tsx site/themes/stripe/src/components/ui/ProjectSwitcher.tsx
git commit -m "feat(theme-stripe): redesign Sidebar with project switcher, method badges, precise typography"
```

---

### Task 8b: Header/TopBar Redesign (A12) [✓ COMPLETED]

**Files:**
- Modify: `site/themes/stripe/src/components/layout/Header.tsx`

**Step 1: Rewrite Header**

- 52px height (`height: 52px`), `border-bottom: 1px solid #e2e8f0`, white background (not dark)
- Left: colored square (12px, `border-radius: 3px`, uses first artifact color) + site name in 14px Inter semibold
- Center-right: search box — `background: #f8fafc`, `border: 1px solid #e2e8f0`, `border-radius: 6px`, placeholder "Search docs..." + `⌘K` in monospace muted badge
- Far-right: colored dots (7px circles) for each artifact, click to switch project context
- Remove hamburger toggle, Docs/Tests tabs (move to sidebar if needed)

**Step 2: Wire SearchDialog open**

Connect search button `onClick` to open `SearchDialog` component.

**Step 3: Commit**

```bash
git add site/themes/stripe/src/components/layout/Header.tsx
git commit -m "feat(theme-stripe): redesign Header — clean white bar, search box, project dots"
```

---

### Task 8c: Font & Color Foundation (A10) [✓ COMPLETED]

**Files:**
- Modify: `site/app/src/app/layout.tsx` (add Google Fonts link)
- Modify: `site/app/src/app/globals.css` (add CSS custom properties)
- Modify: `site/themes/stripe/tailwind.config.ts` or equivalent

**Step 1: Add Google Fonts**

In layout.tsx `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;550;600;650;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

**Step 2: Add CSS custom properties**

In `globals.css`:
```css
:root {
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --color-primary: #6366f1;
  --color-surface-primary: #ffffff;
  --color-surface-secondary: #f8fafc;
  --color-surface-tertiary: #f1f5f9;
  --color-border: #e2e8f0;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-tertiary: #94a3b8;
  --color-code-bg: #0f172a;
}
body { font-family: var(--font-body); color: var(--color-text-primary); }
code, pre, kbd { font-family: var(--font-mono); }
```

**Step 3: Commit**

```bash
git add site/app/src/app/layout.tsx site/app/src/app/globals.css
git commit -m "feat(app): add Inter + JetBrains Mono fonts and Stripe-matched color palette"
```

---

## STREAM 3: DSTI & Intent

### Task 9: Separate DSTI Channels Into Individual Files (A6) [✓ COMPLETED]

**Files:**
- Create: `java/docspec-processor-java/src/main/java/io/docspec/processor/dsti/channel/IntentChannel.java`
- Create: 13 channel files in `java/docspec-processor-java/src/main/java/io/docspec/processor/dsti/channel/`
- Modify: `java/docspec-processor-java/src/main/java/io/docspec/processor/dsti/IntentGraphExtractor.java`

**Step 1: Create IntentChannel interface**

```java
package io.docspec.processor.dsti.channel;

import io.docspec.processor.model.IntentSignalsModel;
import javax.annotation.processing.ProcessingEnvironment;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.TypeElement;

public interface IntentChannel {
    String channelName();
    int channelNumber();
    boolean requiresTrees();
    void extract(ExecutableElement method, TypeElement owner,
                 Object trees, ProcessingEnvironment env,
                 IntentSignalsModel signals);
}
```

**Step 2: Create 13 channel implementations**

Each channel extracts from the current monolithic `analyzeWithTrees()` + annotation-based logic into its own class:

1. `NamingChannel.java` (1) — Uses `NamingAnalyzer` to set `nameSemantics`
2. `GuardClauseChannel.java` (2) — if-throw patterns → `guardClauses`
3. `BranchStructureChannel.java` (3) — if/else/switch tree → `branches`
4. `NameBehaviorGapChannel.java` (4) — Cross-references channels 1 & 3
5. `ReturnTypeChannel.java` (5) — Return type analysis → `returnType`
6. `AssignmentPatternChannel.java` (6) — Builder/constructor data flow
7. `LoopPatternChannel.java` (7) — Stream/for-each → `loopProperties`
8. `ErrorHandlingChannel.java` (8) — try/catch → `errorHandling`
9. `AssignmentChainChannel.java` (9) — Field source tracing → constants
10. `ExceptionMessageChannel.java` (10) — Null checks
11. `ConstantChannel.java` (11) — Named constants (UPPER_CASE pattern) + assertions
12. `LoggingChannel.java` (12) — Logger calls → `logStatements`
13. `EqualityChannel.java` (13) — Validation annotations → `validationAnnotations`

**Step 3: Refactor IntentGraphExtractor as orchestrator**

```java
// In IntentGraphExtractor.extract():
List<IntentChannel> channels = List.of(
    new NamingChannel(namingAnalyzer),
    new GuardClauseChannel(),
    new BranchStructureChannel(),
    new NameBehaviorGapChannel(),
    new ReturnTypeChannel(),
    new AssignmentPatternChannel(),
    new LoopPatternChannel(),
    new ErrorHandlingChannel(),
    new AssignmentChainChannel(),
    new ExceptionMessageChannel(),
    new ConstantChannel(),
    new LoggingChannel(),
    new EqualityChannel()
);

for (IntentChannel channel : channels) {
    if (!channel.requiresTrees() || trees != null) {
        channel.extract(method, typeElement, trees, processingEnv, signals);
    }
}
```

**Step 4: Commit**

```bash
git add java/docspec-processor-java/src/main/java/io/docspec/processor/dsti/channel/
git add java/docspec-processor-java/src/main/java/io/docspec/processor/dsti/IntentGraphExtractor.java
git commit -m "refactor(dsti): separate 13 intent channels into individual files for ablation study"
```

---

### Task 10: Add @DocCommutative Annotation (A8) [✓ COMPLETED]

**Files:**
- Create: `java/docspec-annotations-java/src/main/java/io/docspec/annotation/DocCommutative.java`
- Create: `typescript/annotations/src/decorators/DocCommutative.ts`
- Create: `python/annotations/src/docspec_py/decorators/doc_commutative.py`
- Create: `rust/annotations/src/doc_commutative.rs`
- Create: `csharp/annotations/src/DocCommutative.cs`
- Create: `go/annotations/doc_commutative.go`

**Step 1: Java**

```java
package io.docspec.annotation;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface DocCommutative {
    String value() default "";
}
```

**Step 2: TypeScript, Python, Rust, C#, Go equivalents**

Each language's annotation file, plus update the barrel export (index.ts / __init__.py / lib.rs / etc.).

**Step 3: Commit**

```bash
git add java/docspec-annotations-java/src/main/java/io/docspec/annotation/DocCommutative.java
git add typescript/annotations/ python/annotations/ rust/annotations/ csharp/annotations/ go/annotations/
git commit -m "feat(annotations): add @DocCommutative to all 6 languages (43rd annotation)"
```

---

### Task 11: Expand Intent Graph Schema (A9) [✓ COMPLETED]

**Files:**
- Modify: `spec/intent-graph.schema.json`

**Step 1: Expand to ~400 lines**

Replace the current 32-line schema with a comprehensive standalone schema defining:
- All 13 channel signal types with specific fields
- `GuardClauseSignal`: condition, error, boundary (below/above/exact)
- `NamingSignal`: verb, noun, intent, implies[]
- `BranchSignal`: conditions[], paths[], exhaustive boolean
- `DataFlowSignal`: from, to, type (passthrough|aggregation|derived|generated)
- `LoopSignal`: over, operation, implies
- `ErrorHandlingSignal`: catches, handling (wrap_and_throw|retry|log_and_continue|fallback)
- `ConstantSignal`: name, value, type, implies
- `CrossChannelVerification`: issues[], methodsChecked, issueCount
- `ISDScore`: score (0.0-1.0), channelBreakdown{}
- `GapReport`: gaps[], recommendations[]

**Step 2: Commit**

```bash
git add spec/intent-graph.schema.json
git commit -m "feat(spec): expand intent-graph schema to full 13-channel definition (~400 lines)"
```

---

### Task 12: Real Test Generator Assertions (A7) [✓ COMPLETED]

**Files:**
- Modify: `dsti/generators/java/src/templates/guard-tests.ts`
- Modify: `dsti/generators/java/src/templates/property-tests.ts`
- Modify: `dsti/generators/java/src/templates/mock-setup.ts`
- Modify: `dsti/generators/typescript/src/templates/guard-tests.ts`
- Modify: `dsti/generators/python/src/templates/guard-tests.ts`
- Modify: `dsti/generators/rust/src/templates/guard-tests.ts`
- Modify: `dsti/generators/csharp/src/templates/guard-tests.ts`

**Step 1: Fix Java guard-tests.ts**

Replace `// TODO: Call methodName with invalid input` with actual assertion code derived from intent signals:

```typescript
// For each guard clause with structured signal data:
if (guardInfo?.condition && guardInfo?.error) {
  // Parse condition to determine what input to pass
  const input = deriveInvalidInput(guardInfo.condition);
  testBody = `assertThrows(${guardInfo.error}.class, () -> {
            sut.${methodName}(${input});
        });`;
}
```

The generator should:
- Parse `condition` strings like `"goal == null"` → pass `null`
- Parse `condition` strings like `"amount < 0"` → pass `-1`
- Parse `error` strings to get the exception class
- Generate real `assertThrows` calls with concrete inputs

**Step 2: Fix Java property-tests.ts**

Replace commented-out assertions with real ones:
- Query → uncomment idempotency assertions, generate concrete method calls
- Mutation → uncomment state change assertions
- Conservation → uncomment data integrity assertions
- Add monotonicity tests from `@DocMonotonic` signals

**Step 3: Fix all other language generators similarly**

TypeScript (vitest), Python (pytest), Rust (proptest), C# (xUnit).

**Step 4: Commit**

```bash
git add dsti/generators/
git commit -m "feat(dsti-generators): replace TODO stubs with real assertions from intent signals"
```

---

## STREAM 4: Scaffolder

### Task 13: Interactive CLI Scaffolder (A13) [✓ COMPLETED]

**Files:**
- Modify: `site/create-docspec-site/src/index.ts`
- Modify: `site/create-docspec-site/src/scaffold.ts`
- Modify: `site/create-docspec-site/package.json` (add @clack/prompts)
- Create: `site/create-docspec-site/src/prompts.ts`
- Create: `site/create-docspec-site/src/templates/` (additional templates)

**Step 1: Install @clack/prompts**

```bash
cd site/create-docspec-site && pnpm add @clack/prompts
```

**Step 2: Create prompts.ts with interactive wizard**

Use `@clack/prompts` group/text/select/multiselect/confirm:
- Project name
- Theme selection (stripe/dark/minimal)
- Language selection (multiselect: java, typescript, python, rust, csharp, go)
- Artifact configuration wizard (loop to add Maven/npm/crate coordinates)
- Registry configuration (import from settings.xml / .npmrc / manual / env vars)
- OpenAPI spec path (optional)
- DSTI toggle
- LLM integration options (multiselect: llms.txt, CLAUDE.md, MCP server, embeddings)

**Step 3: Update scaffold.ts to use collected answers**

Generate fully populated `docspec.config.yaml` from the wizard answers. Create rich starter docs:
```
docs/getting-started/introduction.md
docs/getting-started/quickstart.md
docs/getting-started/installation.md
docs/architecture/overview.md
docs/guides/first-guide.md
```

**Step 4: Add artifact resolution attempt**

After scaffolding, use a spinner to try resolving any configured artifacts immediately.

**Step 5: Commit**

```bash
git add site/create-docspec-site/
git commit -m "feat(scaffolder): interactive CLI with @clack/prompts, wizard, and artifact resolution"
```

---

## STREAM 5: Functional Completeness (Phase B)

### Task 14: GuidePage with Markdoc (B1)

**Files:**
- Modify: `site/themes/stripe/src/components/pages/GuidePage.tsx`
- Modify: `site/themes/stripe/package.json` (add @markdoc/markdoc)
- Create: `site/themes/stripe/src/lib/markdoc-config.ts`

Implement Markdoc rendering: parse markdown, generate ToC from headings, support custom tags (callouts, code tabs), render using theme components.

---

### Task 15: Search with FlexSearch (B2)

**Files:**
- Modify: `site/themes/stripe/src/components/ui/SearchDialog.tsx`
- Modify: `site/core/src/search/index.ts`
- Modify: `site/themes/stripe/package.json` (add flexsearch)

Implement: build index at build time, Cmd+K shortcut, grouped results, highlighted matches.

---

### Task 16: MemberPage Split Layout (B3)

**Files:**
- Modify: `site/themes/stripe/src/components/pages/MemberPage.tsx`

Split layout like EndpointPage: left (signature, description, methods, parameters) + right (code examples with LanguageTabs, ReferencedIn panel). Each method individually linkable.

---

### Task 17: Cross-Linking Implementation (B4)

**Files:**
- Modify: `site/core/src/cross-linker/referenced-in.ts`
- Modify: `site/core/src/cross-linker/trace-builder.ts`
- Create: `site/core/src/cross-linker/config-enricher.ts`
- Create: `site/core/src/cross-linker/security-enricher.ts`

Compute `referencedBy` for members, build full execution traces, link config properties to flows, link security rules to endpoints.

---

### Task 18: ChangelogPage with Version Differ (B5)

**Files:**
- Modify: `site/themes/stripe/src/components/pages/ChangelogPage.tsx`
- Modify: `site/core/src/diff/engine.ts`

Wire diff engine to ChangelogPage. Compute added/removed/modified entities between versions. Render as timeline.

---

### Task 19: Missing Resolvers (B6)

**Files:**
- Create: `site/core/src/resolver/crates-resolver.ts`
- Create: `site/core/src/resolver/pypi-resolver.ts`
- Create: `site/core/src/resolver/nuget-resolver.ts`
- Create: `site/core/src/resolver/npmrc-parser.ts`

Each resolver downloads from the respective package registry and extracts `docspec.json`.

---

### Task 19b: Flow Step Data Store Operations (B7)

**Files:**
- Modify: `site/themes/stripe/src/components/pages/FlowPage.tsx`

Render `dataStoreOps` for each flow step: database icons, table names, operation types, transaction boundaries.

---

## STREAM 6: Quality & Polish (Phase C)

### Task 20: Add Tests (C1)

Priority targets:
- Java processor: test waypoint-engine → docspec.json
- DSTI core: test cross-channel verifier, ISD calculator
- Site core: test page generator, nav builder, cross-linker
- Stripe theme: test components render
- Target: 80%+ on core packages

---

### Task 21: Connect Property DSL to Generators (C2)

**Files:**
- Modify: `dsti/core/src/property-dsl-parser.ts`
- Modify: all generator templates

Parse `@DocInvariant(rules = {"milestones SIZE > 0"})` → generate `assertThat(result.getMilestones()).isNotEmpty()`.

---

### Task 22: Full Database Schema Introspection (C3)

**Files:**
- Modify: `java/docspec-processor-java/src/main/java/io/docspec/processor/extractor/DatabaseSchemaIntrospector.java`

Parse JPA annotations fully: `@Table`, `@Column`, `@Index`, CHECK constraints, FK cascades. Compare vs live DB if URL provided.

---

### Task 23: MCP Server Tools (C4)

**Files:**
- Modify: `site/core/src/mcp/server.ts`

Verify/implement all 7 tools: search, get-class, get-endpoint, get-flow, get-trace, get-errors, get-tests.

---

### Task 24: Example Project Configs (C5)

**Files:**
- Create: `examples/spring-boot-zero-config/docspec.config.yaml`
- Create: `examples/waypoint-engine/docspec.config.yaml`

Full pipeline configs demonstrating code → docspec.json → docs site.

---

### Task 25: FlowDiagram Visual Enhancement (C6)

**Files:**
- Modify: `site/themes/stripe/src/components/ui/FlowDiagram.tsx`

Add: project boundary coloring, retry loop arrows, load animation, data store icons, wider horizontal layout, hover tooltips.

---

## FINAL TASK

### Task 26: Restructure Into `packages/` Layout (A2)

**This task MUST be done last, after all other changes are complete and committed.**

**Step 1: Create target directory structure**

```bash
mkdir -p packages/{annotations,processor,build-plugins,test-generator,dsti,frameworks,spec,site}
mkdir -p packages/annotations/{java,typescript,python,rust,csharp,go}
mkdir -p packages/processor/{java,typescript,python,rust,csharp,go}
mkdir -p packages/build-plugins/{maven,gradle,npm,pip,cargo,dotnet,go}
mkdir -p packages/test-generator/{java,typescript,python,rust,csharp}
mkdir -p packages/frameworks/{typescript,python,rust,csharp,go}
```

**Step 2: Move files using `git mv`**

```bash
# Annotations
git mv java/docspec-annotations-java/* packages/annotations/java/
git mv typescript/annotations/* packages/annotations/typescript/
git mv python/annotations/* packages/annotations/python/
git mv rust/annotations/* packages/annotations/rust/
git mv csharp/annotations/* packages/annotations/csharp/
git mv go/annotations/* packages/annotations/go/

# Processors
git mv java/docspec-processor-java/* packages/processor/java/
git mv typescript/processor/* packages/processor/typescript/
# ... etc for all languages

# Build plugins
git mv java/docspec-maven-plugin/* packages/build-plugins/maven/
git mv plugins/gradle/* packages/build-plugins/gradle/
# ... etc

# DSTI
git mv dsti/core/* packages/dsti/core/
git mv dsti/generators/java/* packages/test-generator/java/
# ... etc

# Frameworks
git mv typescript/frameworks/* packages/frameworks/typescript/
# ... etc

# Site
git mv site/* packages/site/

# Spec
git mv spec/* packages/spec/
```

**Step 3: Update all import paths**

- Java: Update `pom.xml` module paths, parent references
- TypeScript: Update `tsconfig.json` paths, `package.json` references
- Python: Update `pyproject.toml` / `setup.py` paths
- Rust: Update `Cargo.toml` workspace paths
- C#: Update `.csproj` references
- Go: Update `go.mod` module paths
- Site: Update all `@docspec/*` package references
- CI: Update `.github/workflows/*.yml` paths
- Tests: Update `tests/gates/` and `tests/e2e/` paths
- CLAUDE.md: Update all path references

**Step 4: Verify everything still builds**

```bash
npm run build:all
npm run test:gates
```

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: restructure into packages/ concern-first layout

Move from flat language-first (java/, typescript/, ...) to concern-first
(packages/annotations/, packages/processor/, ...) as specified in v3 spec.
All import paths, build configs, CI workflows, and documentation updated."
```

---

## Execution Strategy

**Recommended parallel work streams:**

| Agent | Tasks | Est. Files |
|-------|-------|------------|
| Agent 1 | Task 1 (root files) + Task 8c (fonts/colors) | 5 files |
| Agent 2 | Task 5 (Shiki) → Task 6 (LanguageTabs) → Task 7 (EndpointPage) | 6 files |
| Agent 3 | Task 8a (Sidebar) + Task 8b (Header) | 3 files |
| Agent 4 | Task 9 (DSTI channels) | 15 files |
| Agent 5 | Task 10 (@DocCommutative) + Task 11 (intent schema) | 8 files |
| Agent 6 | Task 12 (real generators) | 10+ files |
| Agent 7 | Task 13 (scaffolder) | 5 files |

After Phase A agents complete, run Phase B (Tasks 14-19b) and Phase C (Tasks 20-25) similarly.

Task 26 (restructure) runs LAST as a single operation after everything else is done and verified.

**Total estimated file changes:** ~120 files across all phases.
