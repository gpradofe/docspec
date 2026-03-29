import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════
// DESIGN TOKENS — matching our dark-themed prototypes exactly
// ═══════════════════════════════════════════════════════════════════
const T = {
  bg: "#0a0e17",
  surface: "rgba(255,255,255,0.02)",
  surfaceBorder: "#1e2430",
  surfaceHover: "#141926",
  cardBg: "rgba(255,255,255,0.015)",
  text: "#e2e8f0",
  textMuted: "#8b95a5",
  textDim: "#4b5563",
  textFaint: "#374151",
  accent: "#818cf8",
  accentDim: "#6366f1",
  accentBg: "rgba(129,140,248,0.08)",
  accentBorder: "rgba(129,140,248,0.15)",
  accentText: "#a5b4fc",
  green: "#34d399",
  greenBg: "rgba(52,211,153,0.08)",
  greenBorder: "rgba(52,211,153,0.15)",
  red: "#f87171",
  redBg: "rgba(248,113,113,0.08)",
  redBorder: "rgba(248,113,113,0.15)",
  yellow: "#fbbf24",
  yellowBg: "rgba(251,191,36,0.08)",
  yellowBorder: "rgba(251,191,36,0.15)",
  blue: "#38bdf8",
  blueBg: "rgba(56,189,248,0.08)",
  blueBorder: "rgba(56,189,248,0.15)",
  orange: "#fb923c",
  orangeBg: "rgba(251,146,60,0.08)",
  pink: "#f472b6",
  codeBg: "#0d1117",
  codeBorder: "#1a1f2e",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  sans: "'DM Sans', system-ui, sans-serif",
};
const MC = {
  GET: {
    bg: "rgba(59,130,246,0.12)",
    text: "#60a5fa",
    border: "rgba(59,130,246,0.25)",
  },
  POST: {
    bg: "rgba(52,211,153,0.12)",
    text: "#34d399",
    border: "rgba(52,211,153,0.25)",
  },
  PUT: {
    bg: "rgba(168,85,247,0.12)",
    text: "#c084fc",
    border: "rgba(168,85,247,0.25)",
  },
  DELETE: {
    bg: "rgba(248,113,113,0.12)",
    text: "#f87171",
    border: "rgba(248,113,113,0.25)",
  },
  CLI: {
    bg: "rgba(52,211,153,0.12)",
    text: "#34d399",
    border: "rgba(52,211,153,0.25)",
  },
};
const CH = {
  naming: { i: "🔤", l: "Naming", c: "#818cf8" },
  guards: { i: "🛡️", l: "Guards", c: "#34d399" },
  branches: { i: "🌿", l: "Branches", c: "#38bdf8" },
  gap: { i: "⚠️", l: "Gap", c: "#fbbf24" },
  dataflow: { i: "🔀", l: "Data Flow", c: "#06b6d4" },
  loops: { i: "🔄", l: "Loops", c: "#60a5fa" },
  errors: { i: "💥", l: "Errors", c: "#f87171" },
  constants: { i: "📌", l: "Constants", c: "#c084fc" },
  messages: { i: "💬", l: "Messages", c: "#fb923c" },
  types: { i: "📐", l: "Types", c: "#a78bfa" },
};
const SC = {
  process: { bg: "rgba(129,140,248,0.08)", bd: "#818cf8", i: "⚙️" },
  ai: { bg: "rgba(168,85,247,0.08)", bd: "#a855f7", i: "🧠" },
  storage: { bg: "rgba(52,211,153,0.08)", bd: "#34d399", i: "💾" },
  retry: { bg: "rgba(248,113,113,0.08)", bd: "#f87171", i: "🔄" },
  merge: { bg: "rgba(251,146,60,0.08)", bd: "#fb923c", i: "🔀" },
};

const PROJECTS = [
  {
    key: "proc",
    name: "DocSpec Processor",
    color: "#818cf8",
    ver: "3.0.0",
    desc: "Annotation processor & auto-discovery",
  },
  {
    key: "site",
    name: "DocSpec Site",
    color: "#38bdf8",
    ver: "3.0.0",
    desc: "Docs framework & CLI",
  },
  {
    key: "dsti",
    name: "DSTI Engine",
    color: "#fb923c",
    ver: "3.0.0",
    desc: "Test intelligence & intent extraction",
  },
];

// ── DATA ──
const CLASS_DATA = {
  name: "IntentGraphExtractor",
  qual: "io.docspec.processor.dsti.IntentGraphExtractor",
  kind: "class",
  since: "3.0.0",
  tags: ["dsti", "core"],
  desc: "Orchestrates DSTI intent extraction across all 13 channels. For each method in a type, runs NamingChannel, GuardClauseChannel, BranchStructureChannel and 10 others to build the intent graph. Cross-verifies signals and computes Intent Signal Density (ISD).",
  fields: [
    {
      name: "DOC_INTENTIONAL",
      type: "String",
      value: '"io.docspec.annotation.DocIntentional"',
      mods: ["static", "final"],
      desc: "Fully qualified name of the @DocIntentional annotation used to suppress gap warnings.",
    },
    {
      name: "dstiEnabled",
      type: "boolean",
      mods: ["private", "final"],
      desc: "Whether DSTI extraction is active. Set from processor config.",
    },
  ],
  methods: [
    {
      name: "extract",
      ret: "void",
      params: [
        {
          n: "typeElement",
          t: "TypeElement",
          req: true,
          d: "The class/interface to analyze",
        },
        {
          n: "processingEnv",
          t: "ProcessingEnvironment",
          req: true,
          d: "Annotation processing environment",
        },
        {
          n: "model",
          t: "DocSpecModel",
          req: true,
          d: "Output model to populate with intent signals",
        },
      ],
      throws: [{ t: "NullPointerException", d: "If typeElement is null" }],
      returns: {
        t: "void",
        d: "Populates model.intentGraph with extracted signals",
      },
      desc: "Runs all 13 intent channels on every public method in the type. Populates the intent graph section of the DocSpec model. Gracefully degrades if com.sun.source.util.Trees API is unavailable.",
      since: "3.0.0",
      example: `IntentGraphExtractor extractor =
    new IntentGraphExtractor(true);
DocSpecModel model = new DocSpecModel();

// Process a type through all 13 channels
extractor.extract(
    curriculumAgentElement,
    processingEnv,
    model
);

// Intent graph is now populated
IntentGraphModel graph = model.getIntentGraph();
System.out.println(graph.getMethods().size());
// => 12 methods with intent signals`,
    },
    {
      name: "extractMethodIntent",
      ret: "IntentSignalsModel",
      params: [
        {
          n: "method",
          t: "ExecutableElement",
          req: true,
          d: "The method to extract intent from",
        },
        {
          n: "trees",
          t: "Trees",
          req: false,
          d: "AST trees for deeper analysis (nullable)",
        },
      ],
      returns: {
        t: "IntentSignalsModel",
        d: "Extracted intent signals from all available channels",
      },
      desc: "Extracts intent signals from a single method. Runs naming analysis, guard detection, branch extraction, data flow tracing, and all other channels. Returns the merged signal set.",
      since: "3.0.0",
    },
  ],
  deps: [
    { n: "namingChannel", t: "NamingChannel", cl: "pure_logic" },
    { n: "guardChannel", t: "GuardClauseChannel", cl: "pure_logic" },
    { n: "branchChannel", t: "BranchStructureChannel", cl: "pure_logic" },
    { n: "crossVerifier", t: "CrossChannelVerifier", cl: "pure_logic" },
    { n: "isdCalculator", t: "ISDCalculator", cl: "pure_logic" },
  ],
  refs: {
    Endpoints: ["docspec:generate"],
    Flows: ["processor-pipeline (Phase 4)"],
    Tests: ["19 auto-generated tests"],
  },
};

const FLOW_DATA = {
  name: "DocSpec Processor Pipeline",
  trigger: "mvn docspec:generate",
  desc: "The 7-phase annotation processing pipeline producing docspec.json with documentation and DSTI intent data.",
  steps: [
    {
      id: "1",
      n: "Auto-Discovery",
      a: "AutoDiscoveryScanner",
      tp: "process",
      d: "Scans public classes, detects Spring/JPA/NestJS/FastAPI frameworks",
    },
    {
      id: "2",
      n: "Read Metadata",
      a: "AnnotationReader + DocReader",
      tp: "process",
      d: "Reads @DocModule, @DocFlow, @DocInvariant and doc comments",
    },
    {
      id: "3",
      n: "Extract System Info",
      a: "Extractors",
      tp: "process",
      d: "Config, security, database schemas, observability, privacy",
      ops: "READ application.yml, @Value",
    },
    {
      id: "4",
      n: "DSTI Intent Extraction",
      a: "IntentGraphExtractor",
      tp: "ai",
      d: "13 channels on every method. Cross-verifies signals.",
      highlight: true,
    },
    {
      id: "5",
      n: "Flow Resolution",
      a: "FlowResolver",
      tp: "merge",
      d: "Resolves @DocFlow, stitches cross-project refs via @DocUses",
    },
    {
      id: "6",
      n: "Coverage",
      a: "CoverageCalculator",
      tp: "process",
      d: "Doc coverage %, ISD distribution, gap recommendations",
    },
    {
      id: "7",
      n: "Serialize",
      a: "SpecSerializer",
      tp: "storage",
      d: "Writes docspec.json",
      ops: "WRITE target/docspec.json",
    },
  ],
};

const TEST_DATA = {
  method: "IntentGraphExtractor.extract",
  isd: 12.5,
  channels: [
    {
      ch: "naming",
      sig: 'Verb "extract" implies produces_output_from_input',
      t: 2,
      sourceLines: [
        "public void extract(TypeElement typeElement, ProcessingEnvironment env, DocSpecModel model)",
      ],
      intentClaim: "Method name claims it extracts/produces output from input",
    },
    {
      ch: "guards",
      sig: "dstiEnabled==false skips; typeElement==null throws",
      t: 4,
      sourceLines: [
        "if (!dstiEnabled) return;",
        "if (typeElement == null) throw new NullPointerException()",
      ],
      intentClaim: "Two preconditions must hold before extraction begins",
    },
    {
      ch: "branches",
      sig: "3 branches: Trees available, Trees unavailable, empty type",
      t: 6,
      sourceLines: [
        "try { trees = Trees.instance(processingEnv); }",
        "catch (IllegalArgumentException e) { trees = null; }",
        "if (enclosedElements.isEmpty()) return;",
      ],
      intentClaim: "Graceful degradation when Trees API unavailable",
    },
    {
      ch: "dataflow",
      sig: "model.intentGraph populated from extracted signals",
      t: 2,
      sourceLines: [
        "model.setIntentGraph(graphModel);",
        "graphModel.addMethod(methodModel);",
      ],
      intentClaim: "Output model receives all extracted data",
    },
    {
      ch: "loops",
      sig: "forEach enclosedElements → extractMethodIntent",
      t: 2,
      sourceLines: [
        "for (Element elem : typeElement.getEnclosedElements()) {",
        "  IntentSignalsModel signals = extractMethodIntent(method, trees);",
      ],
      intentClaim: "Every public method in the type gets analyzed",
    },
    {
      ch: "errors",
      sig: "catch ReflectiveOperationException → graceful degrade",
      t: 2,
      sourceLines: [
        "catch (ReflectiveOperationException e) {",
        "  processingEnv.getMessager().printMessage(WARNING, msg);",
      ],
      intentClaim: "Trees API failure is non-fatal",
    },
    {
      ch: "constants",
      sig: "DOC_INTENTIONAL used as annotation filter",
      t: 1,
      sourceLines: [
        'private static final String DOC_INTENTIONAL = "io.docspec.annotation.DocIntentional";',
      ],
      intentClaim: "Named constant defines the annotation to check",
    },
  ],
  tests: [
    {
      n: "extract_disabledDsti_skips",
      ch: "guards",
      status: "pass",
      flowStep: { id: "4", name: "DSTI Intent Extraction", type: "ai" },
      intentLine: "if (!dstiEnabled) return;",
      codeLine:
        "IntentGraphExtractor(false) then extract() results in model.intentGraph == null",
      code: `@Test
void extract_disabledDsti_skipsExtraction() {
    var extractor = new IntentGraphExtractor(false);
    var model = new DocSpecModel();
    extractor.extract(typeElement, env, model);
    assertNull(model.getIntentGraph());
}`,
      why: "Guard clause says dstiEnabled==false should skip. Test verifies no intent graph is produced when disabled.",
    },
    {
      n: "extract_nullType_throws",
      ch: "guards",
      status: "pass",
      flowStep: { id: "4", name: "DSTI Intent Extraction", type: "ai" },
      intentLine: "if (typeElement == null) throw new NullPointerException()",
      codeLine: "extract(null, env, model) → NullPointerException",
      code: `@Test
void extract_nullType_throwsNullPointer() {
    assertThrows(NullPointerException.class,
        () -> extractor.extract(null, env, model));
}`,
      why: "Guard clause says null input produces NullPointerException. Test verifies the boundary.",
    },
    {
      n: "extract_allMethodsProcessed",
      ch: "loops",
      status: "pass",
      flowStep: { id: "4", name: "DSTI Intent Extraction", type: "ai" },
      intentLine: "for (Element elem : typeElement.getEnclosedElements())",
      codeLine:
        "every public method → extractMethodIntent called → appears in intent graph",
      code: `@Property
void extract_processesEveryMethod(
        @ForAll("typesWithMethods") TypeElement type) {
    var model = new DocSpecModel();
    extractor.extract(type, env, model);
    long expected = type.getEnclosedElements().stream()
        .filter(e -> e.getKind() == METHOD)
        .filter(e -> e.getModifiers().contains(PUBLIC))
        .count();
    assertEquals(expected,
        model.getIntentGraph().getMethods().size());
}`,
      why: "Loop iterates every enclosed element. Property test verifies ALL public methods appear in output.",
    },
    {
      n: "extract_gracefulWithoutTrees",
      ch: "errors",
      status: "pass",
      flowStep: { id: "4", name: "DSTI Intent Extraction", type: "ai" },
      intentLine: "catch (ReflectiveOperationException e) { trees = null; }",
      codeLine:
        "mockWithoutTrees() → extract succeeds → signals still produced",
      code: `@Test
void extract_worksWithoutTreesAPI() {
    ProcessingEnvironment limited = mockWithoutTrees();
    var model = new DocSpecModel();
    assertDoesNotThrow(() ->
        extractor.extract(type, limited, model));
    assertFalse(model.getIntentGraph()
        .getMethods().isEmpty());
}`,
      why: "Error handling says Trees failure is caught. Test verifies extraction still works without it.",
    },
    {
      n: "extract_gapDetection_nameVsBranch",
      ch: "gap",
      status: "fail",
      flowStep: { id: "1", name: "Auto-Discovery", type: "process" },
      intentLine: 'Name: "scanPublicClasses" → only public',
      codeLine:
        "Implementation: includeProtected config → includes protected too",
      code: `@Test // GAP: name says "public" but includes protected
void scanPublicClasses_includesProtected_isIntentional() {
    scanner.setIncludeProtected(true);
    var result = scanner.scanPublicClasses(pkg);
    // This test PASSES with current impl.
    // If the name is correct, fix the filter.
    // If the impl is correct, rename the method.
    assertTrue(result.stream()
        .anyMatch(c -> c.isProtected()));
}`,
      why: "Cross-channel gap: naming channel says 'public only' but branch analysis shows protected is included. Either the name or the code is wrong.",
    },
  ],
};

const OVERVIEW_DATA = {
  stats: { tot: 847, meth: 213, avg: 9.2, min: 2.1, max: 18.6, cov: 87.3 },
  channels: [
    { ch: "Guards", t: 186, b: 34 },
    { ch: "Naming", t: 142, b: 28 },
    { ch: "Branches", t: 128, b: 22 },
    { ch: "Data Flow", t: 97, b: 15 },
    { ch: "Loops", t: 84, b: 12 },
    { ch: "Errors", t: 72, b: 19 },
    { ch: "Constants", t: 54, b: 8 },
    { ch: "Messages", t: 42, b: 11 },
    { ch: "Gaps", t: 22, b: 18 },
    { ch: "Types", t: 20, b: 3 },
  ],
  gaps: [
    {
      m: "AutoDiscoveryScanner.scanPublicClasses",
      g: "Name says 'public' but includeProtected also includes protected",
      s: "error",
    },
    {
      m: "DescriptionInferrer.inferDescription",
      g: "Returns null for generic names like 'process'",
      s: "warning",
    },
    {
      m: "CoverageCalculator.calculateCoverage",
      g: "Name implies single metric but returns 4 dimensions",
      s: "info",
    },
  ],
};

const EP_CODE = {
  cli: `npx docspec generate \\
  --source ./src \\
  --discovery hybrid \\
  --dsti true \\
  --output ./target/docspec.json`,
  maven: `<!-- pom.xml -->
<plugin>
  <groupId>io.docspec</groupId>
  <artifactId>docspec-maven-plugin</artifactId>
  <version>3.0.0</version>
  <configuration>
    <discovery>
      <mode>hybrid</mode>
    </discovery>
    <dsti><enabled>true</enabled></dsti>
  </configuration>
</plugin>`,
  python: `# pyproject.toml
[tool.docspec]
packages = ["mypackage"]
dsti = { enabled = true }

# CLI: docspec-py generate --source ./src`,
};

const NAV = [
  {
    title: "LEARN",
    tab: "docs",
    items: [{ id: "landing", label: "Introduction", icon: "📖" }],
  },
  {
    title: "CLI",
    tab: "docs",
    items: [{ id: "endpoint", label: "docspec generate", badge: "CLI" }],
  },
  {
    title: "PROCESSOR",
    tab: "docs",
    items: [
      { id: "class", label: "IntentGraphExtractor", kind: "class" },
      { id: "class2", label: "DocSpecProcessor", kind: "class" },
    ],
  },
  {
    title: "ARCHITECTURE",
    tab: "docs",
    items: [
      { id: "flow", label: "Processor Pipeline", icon: "🔀" },
      { id: "graph", label: "Dependency Graph", icon: "🕸️" },
    ],
  },
  {
    title: "TESTS",
    tab: "tests",
    items: [
      { id: "overview", label: "Dashboard", icon: "🧪" },
      { id: "detail", label: "IntentGraphExtractor.extract", icon: "🔬" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function Tag({ children, color = T.accent }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 4,
        background: color + "14",
        color,
        border: `1px solid ${color}30`,
        fontFamily: T.mono,
        letterSpacing: "0.02em",
        lineHeight: "16px",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

function ChTag({ ch }) {
  const c = CH[ch];
  if (!c) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 4,
        background: c.c + "14",
        color: c.c,
        border: `1px solid ${c.c}30`,
      }}
    >
      {c.i} {c.l}
    </span>
  );
}

function Code({ code, title, lang }) {
  const [cp, setCp] = useState(false);
  return (
    <div
      style={{
        borderRadius: 9,
        overflow: "hidden",
        border: `1px solid ${T.codeBorder}`,
        background: T.codeBg,
      }}
    >
      {title && (
        <div
          style={{
            padding: "8px 14px",
            borderBottom: `1px solid ${T.codeBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}>
            {title}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {lang && (
              <span
                style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono }}
              >
                {lang}
              </span>
            )}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(code);
                setCp(true);
                setTimeout(() => setCp(false), 1500);
              }}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 4,
                border: `1px solid ${T.surfaceBorder}`,
                background: cp ? "rgba(52,211,153,0.12)" : "transparent",
                color: cp ? T.green : T.textDim,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: T.mono,
              }}
            >
              {cp ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
      <pre
        style={{
          padding: title ? "14px 16px" : "14px 16px",
          margin: 0,
          overflowX: "auto",
          fontSize: 12.5,
          lineHeight: 1.7,
          fontFamily: T.mono,
        }}
      >
        {code.split("\n").map((ln, i) => {
          let c = T.text;
          if (/^\s*(\/\/|#|<!--|--)/.test(ln)) c = T.textDim;
          else if (/^\s*@/.test(ln)) c = "#93c5fd";
          else if (/^\s*</.test(ln) && !ln.includes("=")) c = T.pink;
          else if (/\b(assert\w+)\b/.test(ln)) c = T.yellow;
          else if (
            /\b(import|from|const|var|let|def|class|public|private|void|return|new|await|async|if|else|for|try|catch|throw|throws|package|interface|extends|implements|static|final)\b/.test(
              ln,
            )
          )
            c = T.accentText;
          else if (/["']/.test(ln)) c = T.green;
          return (
            <div key={i} style={{ color: c, minHeight: 18 }}>
              {ln || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════

function Landing() {
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div
        style={{
          display: "inline-block",
          padding: "3px 10px",
          borderRadius: 6,
          background: T.accentBg,
          border: `1px solid ${T.accentBorder}`,
          color: T.accent,
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        Meta-dogfooding · DocSpec documents itself
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.03em",
          margin: "0 0 8px",
        }}
      >
        DocSpec Documentation
      </h1>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.7,
          color: T.textMuted,
          margin: "0 0 32px",
          maxWidth: 560,
        }}
      >
        Universal documentation specification & test intelligence engine. This
        entire site — and 847 tests — are auto-generated from DocSpec's own
        source code.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {PROJECTS.map((p, i) => (
          <div
            key={p.key}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(-1)}
            style={{
              padding: "20px 18px",
              borderRadius: 10,
              border: `1px solid ${hoveredIdx === i ? p.color + "60" : T.surfaceBorder}`,
              background: T.cardBg,
              cursor: "pointer",
              transition: "all 0.25s ease",
              transform: hoveredIdx === i ? "translateY(-3px)" : "none",
              boxShadow: hoveredIdx === i ? `0 8px 30px ${p.color}15` : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: `linear-gradient(135deg,${p.color},${p.color}90)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {p.name.split(" ").pop()[0]}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 650, color: T.text }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: T.textDim,
                    fontFamily: T.mono,
                  }}
                >
                  {p.ver}
                </div>
              </div>
            </div>
            <p
              style={{
                fontSize: 12.5,
                color: T.textMuted,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {p.desc}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "20px 24px",
          borderRadius: 10,
          background: T.surface,
          border: `1px solid ${T.surfaceBorder}`,
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 14,
          }}
        >
          Quick Stats
        </div>
        <div style={{ display: "flex", gap: 40 }}>
          {[
            ["52", "Classes", T.accent],
            ["213", "Methods", T.blue],
            ["847", "DSTI Tests", T.orange],
            ["13", "Channels", T.green],
            ["87%", "Coverage", T.green],
            ["9.2", "Avg ISD", T.accentText],
          ].map(([v, l, c]) => (
            <div key={l}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 780,
                  color: c,
                  letterSpacing: "-0.02em",
                }}
              >
                {v}
              </div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EndpointPage() {
  const [lang, setLang] = useState("cli");
  const langs = Object.keys(EP_CODE);
  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <Tag color={T.green}>CLI</Tag>
        <code
          style={{
            fontSize: 15,
            fontWeight: 550,
            fontFamily: T.mono,
            color: T.text,
          }}
        >
          /docspec/generate
        </code>
      </div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 720,
          color: T.text,
          letterSpacing: "-0.02em",
          margin: "0 0 8px",
        }}
      >
        Generate docspec.json
      </h2>
      <p
        style={{
          fontSize: 14,
          color: T.textMuted,
          lineHeight: 1.7,
          margin: "0 0 24px",
          maxWidth: 520,
        }}
      >
        Runs the full processor pipeline: auto-discovery → framework detection →
        annotation reading → intent extraction → serialization.
      </p>
      <div
        style={{
          display: "flex",
          border: `1px solid ${T.surfaceBorder}`,
          borderRadius: 10,
          overflow: "hidden",
          minHeight: 500,
        }}
      >
        <div style={{ flex: 1, padding: "24px 28px", overflow: "auto" }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Parameters
          </div>
          {[
            {
              n: "source_dir",
              t: "string",
              r: true,
              d: "Root directory of source code",
            },
            {
              n: "discovery_mode",
              t: "enum",
              d: "zero-config | minimal | full | hybrid",
            },
            {
              n: "dsti_enabled",
              t: "boolean",
              d: "Enable 13-channel intent extraction. Default: true",
            },
            {
              n: "audience",
              t: "enum",
              d: "Audience filter: public | partner | internal",
            },
          ].map((p) => (
            <div
              key={p.n}
              style={{
                padding: "10px 0",
                borderBottom: `1px solid ${T.surfaceBorder}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 3,
                }}
              >
                <code
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: T.text,
                    fontFamily: T.mono,
                  }}
                >
                  {p.n}
                </code>
                <span
                  style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}
                >
                  {p.t}
                </span>
                {p.r && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: T.red,
                      textTransform: "uppercase",
                    }}
                  >
                    required
                  </span>
                )}
              </div>
              <div
                style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}
              >
                {p.d}
              </div>
            </div>
          ))}
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: T.textDim,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginTop: 24,
              marginBottom: 10,
            }}
          >
            Internal Pipeline
          </div>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 11.5,
              color: T.textMuted,
              padding: "12px 14px",
              borderRadius: 8,
              background: T.surface,
              border: `1px solid ${T.surfaceBorder}`,
              lineHeight: 2,
            }}
          >
            {[
              "→ AutoDiscoveryScanner.scan()  ⚙️",
              "  → AnnotationReader.read()  📝",
              "  → SpringDetector.detect()  🔍",
              "  → IntentGraphExtractor.extract()  🧠 13 channels",
              "    → NamingChannel → GuardChannel → ...  🔤🛡️🌿",
              "    → CrossChannelVerifier.verify()  ⚠️",
              "  → FlowResolver.resolve()  🔀",
              "  → SpecSerializer.write()  💾 docspec.json",
            ].map((ln, i) => (
              <div
                key={i}
                style={{ color: ln.includes("🧠") ? T.orange : T.textMuted }}
              >
                {ln}
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            width: 380,
            background: T.codeBg,
            borderLeft: `1px solid ${T.codeBorder}`,
            flexShrink: 0,
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 650,
              color: T.textFaint,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Usage
          </div>
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 6,
              padding: 3,
            }}
          >
            {langs.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  flex: 1,
                  padding: "5px 4px",
                  fontSize: 10.5,
                  fontWeight: lang === l ? 650 : 400,
                  background:
                    lang === l ? "rgba(255,255,255,0.07)" : "transparent",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  color: lang === l ? T.text : "rgba(255,255,255,0.25)",
                  fontFamily: T.mono,
                  transition: "all 0.15s",
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <Code code={EP_CODE[lang] || ""} />
          <div
            style={{
              fontSize: 10,
              fontWeight: 650,
              color: T.textFaint,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginTop: 8,
            }}
          >
            Output
          </div>
          <Code
            code={`{\n  "docspec": "3.0.0",\n  "modules": ["...52 classes"],\n  "intentGraph": {\n    "methods": 213,\n    "avgISD": 9.2\n  },\n  "discovery": {\n    "coveragePercent": 90.4\n  }\n}`}
          />
        </div>
      </div>
    </div>
  );
}

function ClassPage() {
  const cls = CLASS_DATA;
  const [expandedMethod, setExpandedMethod] = useState("extract");
  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <Tag color={T.accent}>{cls.kind}</Tag>
        {cls.tags.map((t) => (
          <Tag key={t} color={T.textDim}>
            {t}
          </Tag>
        ))}
        <span
          style={{
            fontSize: 10.5,
            color: T.textDim,
            fontFamily: T.mono,
            marginLeft: "auto",
          }}
        >
          since {cls.since}
        </span>
      </div>
      <h2
        style={{
          fontSize: 24,
          fontWeight: 740,
          color: T.text,
          letterSpacing: "-0.025em",
          margin: "0 0 4px",
        }}
      >
        {cls.name}
      </h2>
      <code
        style={{
          fontSize: 12,
          color: T.textDim,
          fontFamily: T.mono,
          display: "block",
          marginBottom: 14,
        }}
      >
        {cls.qual}
      </code>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: T.textMuted,
          margin: "0 0 28px",
          maxWidth: 620,
        }}
      >
        {cls.desc}
      </p>

      {/* Fields */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Fields
        </div>
        {cls.fields.map((f) => (
          <div
            key={f.name}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${T.surfaceBorder}`,
              background: T.cardBg,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <code
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.text,
                  fontFamily: T.mono,
                }}
              >
                {f.name}
              </code>
              <span
                style={{ fontSize: 11, color: T.textDim, fontFamily: T.mono }}
              >
                {f.type}
              </span>
              {f.mods?.map((m) => (
                <Tag key={m} color={T.textDim}>
                  {m}
                </Tag>
              ))}
              {f.value && (
                <code
                  style={{ fontSize: 11, color: T.accent, fontFamily: T.mono }}
                >
                  = {f.value}
                </code>
              )}
            </div>
            <div
              style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}
            >
              {f.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Dependencies */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Dependencies
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {cls.deps.map((d) => {
            const cc = d.cl === "file_system" ? T.yellow : T.blue;
            return (
              <div
                key={d.n}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${T.surfaceBorder}`,
                  background: T.cardBg,
                  fontSize: 12,
                }}
              >
                <code
                  style={{ fontWeight: 600, fontFamily: T.mono, color: T.text }}
                >
                  {d.n}
                </code>
                <span
                  style={{
                    fontSize: 10,
                    marginLeft: 6,
                    padding: "1px 5px",
                    borderRadius: 3,
                    background: cc + "14",
                    color: cc,
                    fontWeight: 600,
                    fontFamily: T.mono,
                  }}
                >
                  {d.cl}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Methods — rich rendering */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 10,
        }}
      >
        Methods
      </div>
      {cls.methods.map((m) => {
        const expanded = expandedMethod === m.name;
        return (
          <div
            key={m.name}
            style={{
              marginBottom: 16,
              borderRadius: 10,
              border: `1px solid ${expanded ? T.accent + "40" : T.surfaceBorder}`,
              background: T.cardBg,
              overflow: "hidden",
              transition: "border-color 0.2s",
            }}
          >
            <button
              onClick={() => setExpandedMethod(expanded ? null : m.name)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "16px 18px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Tag color={T.accent}>method</Tag>
              <code
                style={{
                  fontSize: 14,
                  fontWeight: 650,
                  color: T.accent,
                  fontFamily: T.mono,
                }}
              >
                {m.name}
              </code>
              {m.since && (
                <span
                  style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono }}
                >
                  since {m.since}
                </span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  transform: expanded ? "rotate(90deg)" : "none",
                  transition: "transform 0.15s",
                  color: T.textDim,
                }}
              >
                ▶
              </span>
            </button>
            {expanded && (
              <div
                style={{
                  padding: "0 18px 18px",
                  borderTop: `1px solid ${T.surfaceBorder}`,
                }}
              >
                <p
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.7,
                    color: T.textMuted,
                    margin: "14px 0",
                  }}
                >
                  {m.desc}
                </p>

                {m.params && (
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 650,
                        color: T.textDim,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                      }}
                    >
                      Parameters
                    </div>
                    {m.params.map((p) => (
                      <div
                        key={p.n}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 8,
                          padding: "5px 0",
                          fontSize: 12.5,
                        }}
                      >
                        <code
                          style={{
                            color: T.text,
                            fontFamily: T.mono,
                            fontWeight: 550,
                          }}
                        >
                          {p.n}
                        </code>
                        <span
                          style={{
                            color: T.textDim,
                            fontFamily: T.mono,
                            fontSize: 11,
                          }}
                        >
                          {p.t}
                        </span>
                        {p.req && (
                          <span
                            style={{
                              fontSize: 9,
                              color: T.red,
                              fontWeight: 650,
                            }}
                          >
                            REQUIRED
                          </span>
                        )}
                        <span style={{ color: T.textMuted }}>— {p.d}</span>
                      </div>
                    ))}
                  </div>
                )}

                {m.returns && (
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 650,
                        color: T.textDim,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 4,
                      }}
                    >
                      Returns
                    </div>
                    <div style={{ fontSize: 12.5 }}>
                      <code style={{ color: T.green, fontFamily: T.mono }}>
                        {m.returns.t}
                      </code>
                      <span style={{ color: T.textMuted }}>
                        {" "}
                        — {m.returns.d}
                      </span>
                    </div>
                  </div>
                )}

                {m.throws && (
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 650,
                        color: T.textDim,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 4,
                      }}
                    >
                      Throws
                    </div>
                    {m.throws.map((t) => (
                      <div
                        key={t.t}
                        style={{ fontSize: 12.5, padding: "2px 0" }}
                      >
                        <code style={{ color: T.red, fontFamily: T.mono }}>
                          {t.t}
                        </code>
                        <span style={{ color: T.textMuted }}> — {t.d}</span>
                      </div>
                    ))}
                  </div>
                )}

                {m.example && (
                  <Code code={m.example} lang="java" title="Example" />
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Annotation Source */}
      <div style={{ marginTop: 28 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Annotation Source
        </div>
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 10,
            background: T.accentBg,
            border: `1px solid ${T.accentBorder}`,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: T.accent,
              marginBottom: 8,
            }}
          >
            How DocSpec extracts this class
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: T.textMuted }}>
            The processor reads{" "}
            <code
              style={{ color: T.accentText, fontFamily: T.mono, fontSize: 12 }}
            >
              @DocModule
            </code>{" "}
            to create the module entry, then scans each public method for{" "}
            <code
              style={{ color: T.accentText, fontFamily: T.mono, fontSize: 12 }}
            >
              @DocMethod
            </code>{" "}
            metadata. DSTI runs 13 intent channels on each method body via AST
            analysis.
          </div>
        </div>
        <Code
          code={`@DocModule(id = "dsti-engine",
    name = "DSTI Engine",
    description = "Test intelligence & intent extraction",
    since = "3.0.0")
@DocTags({"dsti", "core"})
public class IntentGraphExtractor
        implements DocSpecExtractor {

    @DocMethod(since = "3.0.0")
    @DocBoundary("DSTI intent graph extraction")
    public void extract(
            TypeElement typeElement,
            ProcessingEnvironment processingEnv,
            DocSpecModel model) {
        // ... 13 channels run here
    }
}`}
          lang="java"
          title="IntentGraphExtractor.java — annotated source"
        />
      </div>

      {/* Referenced In */}
      <div style={{ marginTop: 28 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Referenced In
        </div>
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 8,
            background: T.surface,
            border: `1px solid ${T.surfaceBorder}`,
            fontSize: 12.5,
            lineHeight: 2,
          }}
        >
          {Object.entries(cls.refs).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: T.textDim }}>{k}:</span>{" "}
              <span style={{ color: T.accent, fontWeight: 550 }}>
                {v.join(", ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowPage() {
  const f = FLOW_DATA;
  const [hoveredStep, setHoveredStep] = useState(null);
  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Tag color={T.blue}>FLOW</Tag>
        <span style={{ fontSize: 12, color: T.textMuted }}>
          Trigger:{" "}
          <code style={{ fontFamily: T.mono, color: T.accent }}>
            {f.trigger}
          </code>
        </span>
      </div>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.025em",
          margin: "0 0 6px",
        }}
      >
        {f.name}
      </h1>
      <p
        style={{
          fontSize: 14,
          color: T.textMuted,
          lineHeight: 1.7,
          margin: "0 0 28px",
        }}
      >
        {f.desc}
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {f.steps.map((s, i) => {
          const sc = SC[s.tp] || SC.process;
          const hovered = hoveredStep === s.id;
          return (
            <div key={s.id}>
              {i > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    height: 16,
                  }}
                >
                  <div
                    style={{
                      width: 2,
                      height: "100%",
                      background: T.surfaceBorder,
                    }}
                  />
                </div>
              )}
              <div
                onMouseEnter={() => setHoveredStep(s.id)}
                onMouseLeave={() => setHoveredStep(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 20px",
                  borderRadius: 10,
                  border: `2px solid ${hovered ? sc.bd : sc.bd + "40"}`,
                  background: sc.bg,
                  transition: "all 0.2s",
                  cursor: "pointer",
                  maxWidth: 560,
                  transform: hovered ? "translateX(6px)" : "none",
                  boxShadow: hovered ? `0 4px 20px ${sc.bd}15` : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    filter: hovered ? "none" : "grayscale(0.3)",
                    transition: "filter 0.2s",
                  }}
                >
                  {sc.i}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 13.5, fontWeight: 660, color: T.text }}
                  >
                    {s.n}
                  </div>
                  <div
                    style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}
                  >
                    {s.d}
                  </div>
                  <code
                    style={{
                      fontSize: 11,
                      color: T.textDim,
                      fontFamily: T.mono,
                      display: "block",
                      marginTop: 3,
                    }}
                  >
                    {s.a}
                  </code>
                  {s.ops && (
                    <div
                      style={{ fontSize: 10.5, color: T.green, marginTop: 4 }}
                    >
                      💾 {s.ops}
                    </div>
                  )}
                </div>
                <Tag color={sc.bd}>{s.tp}</Tag>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GraphPage() {
  const nodes = [
    {
      id: "proc",
      label: "DocSpecProcessor",
      x: 400,
      y: 40,
      color: T.accent,
      isd: 14.2,
      tests: 24,
      group: "core",
    },
    {
      id: "scan",
      label: "AutoDiscoveryScanner",
      x: 150,
      y: 140,
      color: T.accent,
      isd: 8.1,
      tests: 12,
      group: "discovery",
    },
    {
      id: "annot",
      label: "AnnotationReader",
      x: 350,
      y: 140,
      color: T.accent,
      isd: 6.8,
      tests: 8,
      group: "reader",
    },
    {
      id: "javadoc",
      label: "JavaDocReader",
      x: 500,
      y: 140,
      color: T.accent,
      isd: 5.2,
      tests: 6,
      group: "reader",
    },
    {
      id: "spring",
      label: "SpringDetector",
      x: 650,
      y: 140,
      color: "#38bdf8",
      isd: 7.4,
      tests: 10,
      group: "framework",
    },
    {
      id: "intent",
      label: "IntentGraphExtractor",
      x: 300,
      y: 260,
      color: "#fb923c",
      isd: 12.5,
      tests: 19,
      group: "dsti",
    },
    {
      id: "naming",
      label: "NamingChannel",
      x: 100,
      y: 380,
      color: "#fb923c",
      isd: 9.8,
      tests: 8,
      group: "channel",
    },
    {
      id: "guard",
      label: "GuardClauseChannel",
      x: 260,
      y: 380,
      color: "#fb923c",
      isd: 11.2,
      tests: 14,
      group: "channel",
    },
    {
      id: "branch",
      label: "BranchStructureChannel",
      x: 430,
      y: 380,
      color: "#fb923c",
      isd: 10.1,
      tests: 12,
      group: "channel",
    },
    {
      id: "cross",
      label: "CrossChannelVerifier",
      x: 600,
      y: 380,
      color: "#fbbf24",
      isd: 13.4,
      tests: 16,
      group: "verifier",
    },
    {
      id: "isd",
      label: "ISDCalculator",
      x: 180,
      y: 480,
      color: "#fb923c",
      isd: 7.6,
      tests: 6,
      group: "scoring",
    },
    {
      id: "serial",
      label: "SpecSerializer",
      x: 650,
      y: 260,
      color: "#34d399",
      isd: 5.0,
      tests: 4,
      group: "output",
    },
    {
      id: "flow",
      label: "FlowResolver",
      x: 500,
      y: 260,
      color: T.accent,
      isd: 8.9,
      tests: 10,
      group: "flow",
    },
    {
      id: "cover",
      label: "CoverageCalculator",
      x: 150,
      y: 260,
      color: T.accent,
      isd: 6.2,
      tests: 8,
      group: "metrics",
    },
  ];
  const edges = [
    { from: "proc", to: "scan" },
    { from: "proc", to: "annot" },
    { from: "proc", to: "javadoc" },
    { from: "proc", to: "spring" },
    { from: "proc", to: "intent" },
    { from: "proc", to: "serial" },
    { from: "proc", to: "flow" },
    { from: "proc", to: "cover" },
    { from: "intent", to: "naming" },
    { from: "intent", to: "guard" },
    { from: "intent", to: "branch" },
    { from: "intent", to: "cross" },
    { from: "intent", to: "isd" },
    { from: "cross", to: "naming" },
    { from: "cross", to: "guard" },
    { from: "cross", to: "branch" },
  ];
  const [hovered, setHovered] = useState(null);

  const getNode = (id) => nodes.find((n) => n.id === id);
  const isConnected = (nodeId) => {
    if (!hovered) return true;
    if (nodeId === hovered) return true;
    return edges.some(
      (e) =>
        (e.from === hovered && e.to === nodeId) ||
        (e.to === hovered && e.from === nodeId),
    );
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.025em",
          margin: "0 0 6px",
        }}
      >
        Dependency Graph
      </h1>
      <p
        style={{
          fontSize: 14,
          color: T.textMuted,
          lineHeight: 1.7,
          margin: "0 0 24px",
        }}
      >
        Interactive component map. Hover a node to see its connections. Node
        size reflects ISD score.
      </p>

      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${T.surfaceBorder}`,
          background: T.cardBg,
          overflow: "hidden",
          padding: 10,
        }}
      >
        <svg viewBox="0 0 800 540" style={{ width: "100%", display: "block" }}>
          {/* Edges */}
          {edges.map((e, i) => {
            const f = getNode(e.from),
              t = getNode(e.to);
            if (!f || !t) return null;
            const active = !hovered || e.from === hovered || e.to === hovered;
            return (
              <line
                key={i}
                x1={f.x}
                y1={f.y}
                x2={t.x}
                y2={t.y}
                stroke={
                  active ? T.surfaceBorder + "ff" : T.surfaceBorder + "30"
                }
                strokeWidth={active ? 1.5 : 0.5}
                strokeDasharray={active ? "" : "4,4"}
                style={{ transition: "all 0.3s" }}
              />
            );
          })}
          {/* Edge arrows */}
          {edges.map((e, i) => {
            const f = getNode(e.from),
              t = getNode(e.to);
            if (!f || !t) return null;
            const active = !hovered || e.from === hovered || e.to === hovered;
            if (!active) return null;
            const dx = t.x - f.x,
              dy = t.y - f.y,
              len = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / len,
              uy = dy / len;
            const mx = f.x + dx * 0.65,
              my = f.y + dy * 0.65;
            return (
              <polygon
                key={"a" + i}
                points={`${mx},${my - 3} ${mx + 6 * ux},${my + 6 * uy} ${mx},${my + 3}`}
                fill={T.surfaceBorder}
                style={{ transition: "all 0.3s", opacity: active ? 0.6 : 0 }}
              />
            );
          })}
          {/* Nodes */}
          {nodes.map((n) => {
            const connected = isConnected(n.id);
            const isHov = hovered === n.id;
            const r = 12 + n.isd * 1.2;
            return (
              <g
                key={n.id}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  cursor: "pointer",
                  transition: "opacity 0.3s",
                  opacity: connected ? 1 : 0.15,
                }}
              >
                {/* Glow */}
                {isHov && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r + 8}
                    fill={n.color}
                    opacity={0.12}
                  />
                )}
                {/* Circle */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={isHov ? n.color + "30" : T.bg}
                  stroke={n.color}
                  strokeWidth={isHov ? 2.5 : 1.5}
                />
                {/* ISD badge */}
                <rect
                  x={n.x - 12}
                  y={n.y - 6}
                  width={24}
                  height={12}
                  rx={3}
                  fill={
                    n.isd > 8
                      ? "rgba(52,211,153,0.15)"
                      : "rgba(251,191,36,0.15)"
                  }
                />
                <text
                  x={n.x}
                  y={n.y + 3}
                  textAnchor="middle"
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    fill: n.isd > 8 ? T.green : T.yellow,
                    fontFamily: T.mono,
                  }}
                >
                  {n.isd}
                </text>
                {/* Label */}
                <text
                  x={n.x}
                  y={n.y + r + 14}
                  textAnchor="middle"
                  style={{
                    fontSize: 10,
                    fontWeight: isHov ? 650 : 450,
                    fill: connected ? T.text : T.textFaint,
                    fontFamily: T.sans,
                    transition: "all 0.3s",
                  }}
                >
                  {n.label}
                </text>
                {/* Test count */}
                <text
                  x={n.x}
                  y={n.y + r + 25}
                  textAnchor="middle"
                  style={{ fontSize: 8, fill: T.textDim, fontFamily: T.mono }}
                >
                  {n.tests} tests
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 14,
          justifyContent: "center",
        }}
      >
        {[
          ["Core", T.accent],
          ["DSTI", "#fb923c"],
          ["Framework", "#38bdf8"],
          ["Verifier", "#fbbf24"],
          ["Output", T.green],
        ].map(([l, c]) => (
          <div
            key={l}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: T.textMuted,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: c,
              }}
            />
            {l}
          </div>
        ))}
      </div>

      {/* Hovered node detail */}
      {hovered &&
        (() => {
          const n = getNode(hovered);
          const deps = edges
            .filter((e) => e.from === hovered)
            .map((e) => getNode(e.to)?.label)
            .filter(Boolean);
          const usedBy = edges
            .filter((e) => e.to === hovered)
            .map((e) => getNode(e.from)?.label)
            .filter(Boolean);
          return (
            <div
              style={{
                marginTop: 16,
                padding: "14px 18px",
                borderRadius: 8,
                border: `1px solid ${n.color}30`,
                background: n.color + "08",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Tag color={n.color}>{n.group}</Tag>
                <code
                  style={{
                    fontSize: 13,
                    fontWeight: 650,
                    color: T.text,
                    fontFamily: T.mono,
                  }}
                >
                  {n.label}
                </code>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: n.isd > 8 ? T.greenBg : T.yellowBg,
                    color: n.isd > 8 ? T.green : T.yellow,
                    fontWeight: 650,
                    border: `1px solid ${n.isd > 8 ? T.greenBorder : T.yellowBorder}`,
                  }}
                >
                  ISD {n.isd}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: T.accent,
                    fontWeight: 600,
                    marginLeft: "auto",
                  }}
                >
                  {n.tests} tests
                </span>
              </div>
              {deps.length > 0 && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: T.textMuted,
                    marginBottom: 3,
                  }}
                >
                  <span style={{ color: T.textDim }}>Depends on:</span>{" "}
                  {deps.join(", ")}
                </div>
              )}
              {usedBy.length > 0 && (
                <div style={{ fontSize: 11.5, color: T.textMuted }}>
                  <span style={{ color: T.textDim }}>Used by:</span>{" "}
                  {usedBy.join(", ")}
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}

function TestOverview() {
  const s = OVERVIEW_DATA.stats;
  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.025em",
          margin: "0 0 6px",
        }}
      >
        DSTI Test Intelligence
      </h1>
      <p
        style={{
          fontSize: 14,
          color: T.textMuted,
          lineHeight: 1.7,
          margin: "0 0 24px",
        }}
      >
        {s.tot} tests from {s.meth} methods. 13 channels. Zero annotations.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 10,
          marginBottom: 28,
        }}
      >
        {[
          [s.tot, "Tests", T.accent],
          [`${s.cov}%`, "Coverage", T.green],
          [s.avg, "Avg ISD", T.blue],
          [`${s.min}–${s.max}`, "ISD Range", T.accentText],
        ].map(([v, l, c]) => (
          <div
            key={l}
            style={{
              padding: "16px 14px",
              borderRadius: 10,
              border: `1px solid ${T.surfaceBorder}`,
              background: T.cardBg,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 780,
                color: c,
                letterSpacing: "-0.02em",
              }}
            >
              {v}
            </div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
              {l}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 12,
        }}
      >
        By Channel
      </div>
      {OVERVIEW_DATA.channels.map((ch) => (
        <div
          key={ch.ch}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 0",
            borderBottom: `1px solid ${T.surfaceBorder}`,
          }}
        >
          <div
            style={{ width: 100, fontSize: 12, fontWeight: 550, color: T.text }}
          >
            {ch.ch}
          </div>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: T.surface,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(ch.t / s.tot) * 100}%`,
                height: "100%",
                borderRadius: 3,
                background: T.accent,
              }}
            />
          </div>
          <div
            style={{
              width: 36,
              fontSize: 11,
              fontWeight: 600,
              color: T.text,
              textAlign: "right",
            }}
          >
            {ch.t}
          </div>
          <div
            style={{
              width: 55,
              fontSize: 10,
              color: T.green,
              textAlign: "right",
            }}
          >
            {ch.b} bugs
          </div>
        </div>
      ))}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginTop: 28,
          marginBottom: 12,
        }}
      >
        Cross-Channel Gaps
      </div>
      {OVERVIEW_DATA.gaps.map((g, i) => {
        const sv =
          g.s === "error" ? T.red : g.s === "warning" ? T.yellow : T.blue;
        return (
          <div
            key={i}
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              border: `1px solid ${T.surfaceBorder}`,
              marginBottom: 8,
              borderLeft: `3px solid ${sv}`,
              background: T.cardBg,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <code
                style={{
                  fontSize: 12,
                  fontWeight: 650,
                  fontFamily: T.mono,
                  color: T.accent,
                }}
              >
                {g.m}
              </code>
              <Tag color={sv}>{g.s}</Tag>
            </div>
            <div
              style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}
            >
              {g.g}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TestDetail() {
  const td = TEST_DATA;
  const [expandedTest, setExpandedTest] = useState(null);
  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Tag color={T.orange}>DSTI</Tag>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 4,
            background: T.greenBg,
            border: `1px solid ${T.greenBorder}`,
            color: T.green,
            fontWeight: 650,
          }}
        >
          ISD {td.isd}
        </span>
      </div>
      <h1
        style={{
          fontSize: 20,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.02em",
          margin: "0 0 4px",
          fontFamily: T.mono,
        }}
      >
        {td.method}()
      </h1>
      <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>
        {td.channels.reduce((s, c) => s + c.t, 0)} tests from{" "}
        {td.channels.length} channels
      </p>

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 12,
        }}
      >
        Extracted Intent Signals
      </div>
      {td.channels.map((ch) => (
        <div
          key={ch.ch}
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            border: `1px solid ${T.surfaceBorder}`,
            background: T.cardBg,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: ch.sourceLines ? 8 : 0,
            }}
          >
            <ChTag ch={ch.ch} />
            <div
              style={{
                flex: 1,
                fontSize: 12.5,
                color: T.textMuted,
                lineHeight: 1.5,
              }}
            >
              {ch.sig}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: T.accent,
                whiteSpace: "nowrap",
              }}
            >
              {ch.t} tests
            </span>
          </div>
          {ch.sourceLines && (
            <div
              style={{
                marginTop: 6,
                padding: "8px 10px",
                borderRadius: 6,
                background: T.codeBg,
                border: `1px solid ${T.codeBorder}`,
                fontSize: 11,
                fontFamily: T.mono,
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 650,
                  color: T.textFaint,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                Source evidence
              </div>
              {ch.sourceLines.map((ln, i) => (
                <div key={i} style={{ color: T.textMuted }}>
                  {ln}
                </div>
              ))}
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 650,
                  color: CH[ch.ch]?.c || T.accent,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginTop: 6,
                }}
              >
                Intent: {ch.intentClaim}
              </div>
            </div>
          )}
        </div>
      ))}

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.textDim,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginTop: 28,
          marginBottom: 12,
        }}
      >
        Generated Tests
      </div>
      {td.tests.map((t) => {
        const expanded = expandedTest === t.n;
        const isGap = t.ch === "gap";
        const statusColor = t.status === "pass" ? T.green : T.yellow;
        return (
          <div
            key={t.n}
            style={{
              marginBottom: 12,
              borderRadius: 10,
              border: `1px solid ${expanded ? T.accent + "40" : T.surfaceBorder}`,
              background: T.cardBg,
              overflow: "hidden",
              transition: "border-color 0.2s",
            }}
          >
            {/* Test header */}
            <button
              onClick={() => setExpandedTest(expanded ? null : t.n)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "12px 16px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{ fontSize: 12, fontWeight: 700, color: statusColor }}
              >
                {t.status === "pass" ? "✓" : "⚠"}
              </span>
              <code
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: T.mono,
                  color: T.text,
                }}
              >
                {t.n}
              </code>
              <ChTag ch={t.ch} />
              {isGap && <Tag color={T.yellow}>BUG?</Tag>}
              {t.flowStep && (
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: SC[t.flowStep.type]?.bg || T.surface,
                    border: `1px solid ${SC[t.flowStep.type]?.bd || T.surfaceBorder}40`,
                    color: SC[t.flowStep.type]?.bd || T.textDim,
                    fontWeight: 600,
                    marginLeft: 4,
                  }}
                >
                  Phase {t.flowStep.id}: {t.flowStep.name}
                </span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  transform: expanded ? "rotate(90deg)" : "none",
                  transition: "transform 0.15s",
                  color: T.textDim,
                }}
              >
                ▶
              </span>
            </button>

            {expanded && (
              <div style={{ borderTop: `1px solid ${T.surfaceBorder}` }}>
                {/* Intent vs Code visualization */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    borderBottom: `1px solid ${T.surfaceBorder}`,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRight: `1px solid ${T.surfaceBorder}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: T.accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      📝 Intent (what the developer claims)
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: T.textMuted,
                        fontFamily: T.mono,
                        lineHeight: 1.6,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: T.accentBg,
                        border: `1px solid ${T.accentBorder}`,
                      }}
                    >
                      {t.intentLine}
                    </div>
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: isGap ? T.yellow : T.green,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      {isGap
                        ? "⚠️ Actual behavior (MISMATCH)"
                        : "✓ Actual behavior (MATCHES)"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: T.textMuted,
                        fontFamily: T.mono,
                        lineHeight: 1.6,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: isGap ? T.yellowBg : T.greenBg,
                        border: `1px solid ${isGap ? T.yellowBorder : T.greenBorder}`,
                      }}
                    >
                      {t.codeLine}
                    </div>
                  </div>
                </div>

                {/* Why this test exists */}
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: `1px solid ${T.surfaceBorder}`,
                    background: T.surface,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11.5,
                      color: T.textMuted,
                      lineHeight: 1.6,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: T.text }}>Why:</span>{" "}
                    {t.why}
                  </div>
                </div>

                {/* The actual test code */}
                <Code code={t.code} title={`${t.n}.java`} lang="java" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [pg, setPg] = useState("landing");
  const [tab, setTab] = useState("docs");
  const [pi, setPi] = useState(0);
  const [dr, setDr] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setDr(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const proj = PROJECTS[pi];

  return (
    <div
      style={{
        fontFamily: T.sans,
        color: T.text,
        background: T.bg,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ── TOP BAR ── */}
      <div
        style={{
          height: 48,
          borderBottom: `1px solid ${T.surfaceBorder}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: `linear-gradient(135deg,${T.accent},${T.accentDim})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          D
        </div>
        <span
          style={{ fontSize: 15, fontWeight: 720, letterSpacing: "-0.02em" }}
        >
          DocSpec
        </span>
        <Tag color={T.accent}>v3</Tag>

        <div
          style={{
            display: "flex",
            gap: 2,
            marginLeft: 12,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 7,
            padding: 3,
          }}
        >
          {["docs", "tests"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                const f = NAV.find((s) => s.tab === t)?.items[0];
                if (f) setPg(f.id);
              }}
              style={{
                padding: "5px 14px",
                fontSize: 11.5,
                fontWeight: tab === t ? 650 : 400,
                background:
                  tab === t ? "rgba(129,140,248,0.12)" : "transparent",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                color: tab === t ? T.accentText : T.textDim,
                transition: "all 0.15s",
              }}
            >
              {t === "tests" ? "🧪 Tests" : "📖 Docs"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            background: T.surface,
            border: `1px solid ${T.surfaceBorder}`,
            borderRadius: 8,
            fontSize: 12,
            color: T.textDim,
            minWidth: 180,
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = T.accent + "50")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = T.surfaceBorder)
          }
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            style={{ opacity: 0.4 }}
          >
            <circle
              cx="7"
              cy="7"
              r="5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M11 11l3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Search docs...
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              fontFamily: T.mono,
              opacity: 0.4,
            }}
          >
            ⌘K
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
          {PROJECTS.map((p, i) => (
            <div
              key={p.key}
              onClick={() => setPi(i)}
              title={p.name}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                cursor: "pointer",
                background: i === pi ? p.color : T.textFaint,
                transition: "all 0.2s",
                transform: i === pi ? "scale(1.5)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── SIDEBAR ── */}
        <div
          style={{
            width: 250,
            borderRight: `1px solid ${T.surfaceBorder}`,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div style={{ padding: "12px 10px", position: "relative" }} ref={ref}>
            <button
              onClick={() => setDr(!dr)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "9px 10px",
                background: T.surface,
                border: `1px solid ${T.surfaceBorder}`,
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = T.accent + "40")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = T.surfaceBorder)
              }
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: `linear-gradient(135deg,${proj.color},${proj.color}90)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {proj.name.split(" ").pop()[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 640,
                    color: T.text,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {proj.name}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: T.textDim,
                    fontFamily: T.mono,
                  }}
                >
                  {proj.ver}
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  opacity: 0.3,
                  transition: "transform 0.15s",
                  transform: dr ? "rotate(180deg)" : "none",
                }}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {dr && (
              <div
                style={{
                  position: "absolute",
                  zIndex: 999,
                  left: 10,
                  right: 10,
                  top: "100%",
                  marginTop: 2,
                  background: T.bg,
                  border: `1px solid ${T.surfaceBorder}`,
                  borderRadius: 10,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                  padding: 4,
                }}
              >
                {PROJECTS.map((p, i) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setPi(i);
                      setDr(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 8px",
                      background:
                        i === pi ? "rgba(129,140,248,0.08)" : "transparent",
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (i !== pi)
                        e.currentTarget.style.background = T.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      if (i !== pi)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: `linear-gradient(135deg,${p.color},${p.color}90)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {p.name.split(" ").pop()[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 550,
                          color: T.text,
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: T.textDim,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "0 8px 16px" }}>
            {NAV.filter((s) => s.tab === tab).map((sec) => (
              <div key={sec.title} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 730,
                    color: T.textDim,
                    letterSpacing: "0.1em",
                    padding: "8px 8px 4px",
                  }}
                >
                  {sec.title}
                </div>
                {sec.items.map((item) => {
                  const act = pg === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPg(item.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        width: "100%",
                        padding: "6px 8px",
                        background: act
                          ? "rgba(129,140,248,0.1)"
                          : "transparent",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 12.5,
                        fontWeight: act ? 600 : 420,
                        color: act ? T.accent : T.textMuted,
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        if (!act)
                          e.currentTarget.style.background = T.surfaceHover;
                      }}
                      onMouseLeave={(e) => {
                        if (!act)
                          e.currentTarget.style.background = act
                            ? "rgba(129,140,248,0.1)"
                            : "transparent";
                      }}
                    >
                      {item.badge ? (
                        <Tag color={MC[item.badge]?.text || T.green}>
                          {item.badge}
                        </Tag>
                      ) : item.kind === "class" ? (
                        <Tag color={T.accent}>{item.kind[0].toUpperCase()}</Tag>
                      ) : (
                        item.icon && (
                          <span style={{ fontSize: 12 }}>{item.icon}</span>
                        )
                      )}
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderTop: `1px solid ${T.surfaceBorder}`,
              fontSize: 10,
              color: T.textDim,
            }}
          >
            Generated by{" "}
            <span style={{ fontWeight: 650, color: T.accent }}>DocSpec v3</span>{" "}
            · Self-hosted
          </div>
        </div>

        {/* ── MAIN ── */}
        <main style={{ flex: 1, overflow: "auto" }}>
          <div style={{ padding: "32px 40px 40px" }}>
            {pg === "landing" && <Landing />}
            {pg === "endpoint" && <EndpointPage />}
            {(pg === "class" || pg === "class2") && <ClassPage />}
            {pg === "flow" && <FlowPage />}
            {pg === "graph" && <GraphPage />}
            {pg === "overview" && <TestOverview />}
            {pg === "detail" && <TestDetail />}
          </div>
        </main>
      </div>
    </div>
  );
}
