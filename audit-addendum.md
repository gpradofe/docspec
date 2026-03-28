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
