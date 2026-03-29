import { describe, it, expect } from "vitest";
import { buildSearchIndex, buildSearchEntries } from "../search/index.js";
import { PageType } from "../types/page.js";
import type { GeneratedPage } from "../types/page.js";
import type {
  ModulePageData,
  MemberPageData,
  EndpointPageData,
  FlowPageData,
  ErrorCatalogPageData,
  EventCatalogPageData,
  IntentGraphPageData,
  DataStorePageData,
  SecurityPageData,
  PrivacyPageData,
} from "../types/page.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModulePage(
  title: string,
  slug: string,
  description?: string,
): GeneratedPage {
  const data: ModulePageData = {
    type: PageType.MODULE,
    module: {
      id: slug.split("/").pop()!,
      name: title,
      description,
      members: [],
    },
    artifact: { label: "Test App", color: "#3b82f6" },
  };
  return {
    type: PageType.MODULE,
    slug,
    title,
    description,
    artifactLabel: "Test App",
    data,
  };
}

function makeMemberPage(
  name: string,
  qualified: string,
  description?: string,
  methods?: { name: string; description?: string }[],
): GeneratedPage {
  const data: MemberPageData = {
    type: PageType.MEMBER,
    member: {
      kind: "class",
      name,
      qualified,
      description,
      methods: methods?.map((m) => ({
        name: m.name,
        description: m.description,
        params: [],
        returns: { type: "void" },
      })),
    },
    moduleId: "test-module",
    artifact: { label: "Test App", color: "#3b82f6" },
  };
  return {
    type: PageType.MEMBER,
    slug: `/libraries/test-app/members/${qualified.replace(/\./g, "/")}`,
    title: name,
    description,
    artifactLabel: "Test App",
    data,
  };
}

function makeEndpointPage(
  method: string,
  path: string,
  description?: string,
): GeneratedPage {
  const data: EndpointPageData = {
    type: PageType.ENDPOINT,
    method: {
      name: "handler",
      description,
      endpointMapping: { method: method as "GET" | "POST", path },
    },
    memberQualified: "com.example.Controller",
    memberName: "Controller",
    artifact: { label: "Test App", color: "#3b82f6" },
  };
  return {
    type: PageType.ENDPOINT,
    slug: `/api/test-app/endpoints/${method.toLowerCase()}-${path.replace(/\//g, "-").replace(/^-/, "")}`,
    title: `${method} ${path}`,
    description,
    artifactLabel: "Test App",
    data,
  };
}

function makeFlowPage(
  id: string,
  name: string,
  steps: { id: string; name: string; description?: string }[],
): GeneratedPage {
  const data: FlowPageData = {
    type: PageType.FLOW,
    flow: {
      id,
      name,
      description: `The ${name} flow`,
      steps: steps.map((s) => ({ id: s.id, name: s.name, description: s.description })),
    },
    artifact: { label: "Test App", color: "#3b82f6" },
  };
  return {
    type: PageType.FLOW,
    slug: `/architecture/flows/${id}`,
    title: name,
    description: `The ${name} flow`,
    artifactLabel: "Test App",
    data,
  };
}

function makeErrorCatalogPage(
  errors: { code: string; description: string }[],
): GeneratedPage {
  const data: ErrorCatalogPageData = {
    type: PageType.ERROR_CATALOG,
    errors: errors.map((e) => ({ code: e.code, description: e.description })),
    artifact: { label: "Test App", color: "#3b82f6" },
  };
  return {
    type: PageType.ERROR_CATALOG,
    slug: "/architecture/errors",
    title: "Error Catalog",
    artifactLabel: "Test App",
    data,
  };
}

function makeEventCatalogPage(
  events: { name: string; description: string }[],
): GeneratedPage {
  const data: EventCatalogPageData = {
    type: PageType.EVENT_CATALOG,
    events: events.map((e) => ({ name: e.name, description: e.description })),
    artifact: { label: "Test App", color: "#3b82f6" },
  };
  return {
    type: PageType.EVENT_CATALOG,
    slug: "/architecture/events",
    title: "Event Catalog",
    artifactLabel: "Test App",
    data,
  };
}

// ---------------------------------------------------------------------------
// Tests — buildSearchIndex
// ---------------------------------------------------------------------------

describe("buildSearchIndex", () => {
  it("produces entries for all page types", () => {
    const pages: GeneratedPage[] = [
      makeModulePage("Core Module", "/libraries/test-app/modules/core", "Core functionality"),
      makeMemberPage("UserService", "com.example.UserService", "User management"),
      makeEndpointPage("GET", "/api/users", "List users"),
      makeFlowPage("registration", "User Registration", [
        { id: "s1", name: "Validate" },
        { id: "s2", name: "Save" },
      ]),
      makeErrorCatalogPage([
        { code: "ERR_001", description: "Bad request" },
        { code: "ERR_002", description: "Not found" },
      ]),
      makeEventCatalogPage([
        { name: "user.created", description: "User was created" },
      ]),
    ];

    const entries = buildSearchIndex(pages);

    expect(entries).toHaveLength(6);

    const types = entries.map((e) => e.type);
    expect(types).toContain(PageType.MODULE);
    expect(types).toContain(PageType.MEMBER);
    expect(types).toContain(PageType.ENDPOINT);
    expect(types).toContain(PageType.FLOW);
    expect(types).toContain(PageType.ERROR_CATALOG);
    expect(types).toContain(PageType.EVENT_CATALOG);
  });

  it("returns empty array for empty pages", () => {
    const entries = buildSearchIndex([]);
    expect(entries).toHaveLength(0);
  });

  it("preserves slug as the entry id", () => {
    const pages: GeneratedPage[] = [
      makeModulePage("Core", "/libraries/test-app/modules/core"),
    ];

    const entries = buildSearchIndex(pages);

    expect(entries[0].id).toBe("/libraries/test-app/modules/core");
    expect(entries[0].slug).toBe("/libraries/test-app/modules/core");
  });
});

// ---------------------------------------------------------------------------
// Tests — buildSearchEntries
// ---------------------------------------------------------------------------

describe("buildSearchEntries", () => {
  it("produces one entry per page", () => {
    const pages: GeneratedPage[] = [
      makeModulePage("Module A", "/libraries/test-app/modules/a", "First module"),
      makeModulePage("Module B", "/libraries/test-app/modules/b", "Second module"),
      makeMemberPage("Service", "com.example.Service", "A service class"),
    ];

    const entries = buildSearchEntries(pages);
    expect(entries).toHaveLength(3);
  });

  it("categorizes page types into correct sections", () => {
    const pages: GeneratedPage[] = [
      makeModulePage("Core", "/libraries/test-app/modules/core"),
      makeMemberPage("Service", "com.example.Service"),
      makeEndpointPage("GET", "/api/users"),
      makeFlowPage("flow-1", "Main Flow", [{ id: "s1", name: "Step" }]),
      makeErrorCatalogPage([{ code: "E1", description: "Error" }]),
    ];

    const entries = buildSearchEntries(pages);

    const moduleEntry = entries.find((e) => e.type === PageType.MODULE);
    expect(moduleEntry!.section).toBe("Libraries & SDKs");

    const memberEntry = entries.find((e) => e.type === PageType.MEMBER);
    expect(memberEntry!.section).toBe("Libraries & SDKs");

    const endpointEntry = entries.find((e) => e.type === PageType.ENDPOINT);
    expect(endpointEntry!.section).toBe("API Reference");

    const flowEntry = entries.find((e) => e.type === PageType.FLOW);
    expect(flowEntry!.section).toBe("Architecture");

    const errorEntry = entries.find((e) => e.type === PageType.ERROR_CATALOG);
    expect(errorEntry!.section).toBe("API Reference");
  });

  it("extracts text content from member descriptions and method names", () => {
    const pages: GeneratedPage[] = [
      makeMemberPage(
        "DocSpecProcessor",
        "io.docspec.processor.DocSpecProcessor",
        "Main annotation processor orchestrator",
        [
          { name: "process", description: "Runs the 21-step pipeline" },
          { name: "finalizeSpec", description: "Finalizes the specification output" },
        ],
      ),
    ];

    const entries = buildSearchEntries(pages);

    expect(entries).toHaveLength(1);
    const entry = entries[0];

    // Content should include the title, description, and method info
    expect(entry.content).toContain("DocSpecProcessor");
    expect(entry.content).toContain("Main annotation processor orchestrator");
    expect(entry.content).toContain("process");
    expect(entry.content).toContain("Runs the 21-step pipeline");
    expect(entry.content).toContain("finalizeSpec");
  });

  it("extracts keywords from qualified names with camelCase splitting", () => {
    const pages: GeneratedPage[] = [
      makeMemberPage(
        "AutoDiscoveryScanner",
        "io.docspec.processor.scanner.AutoDiscoveryScanner",
      ),
    ];

    const entries = buildSearchEntries(pages);
    const entry = entries[0];

    // Keywords should include parts of the title
    expect(entry.keywords.length).toBeGreaterThan(0);
    // The title "AutoDiscoveryScanner" gets split by extractKeywords
    expect(
      entry.keywords.some((k) => k.toLowerCase().includes("auto")),
    ).toBe(true);
    expect(
      entry.keywords.some((k) => k.toLowerCase().includes("scanner")),
    ).toBe(true);
  });

  it("extracts flow step descriptions into search content", () => {
    const pages: GeneratedPage[] = [
      makeFlowPage("checkout", "Checkout Flow", [
        { id: "s1", name: "Validate Cart", description: "Ensure all items are in stock" },
        { id: "s2", name: "Process Payment", description: "Charge the customer card" },
        { id: "s3", name: "Send Confirmation" },
      ]),
    ];

    const entries = buildSearchEntries(pages);
    const entry = entries[0];

    expect(entry.content).toContain("Checkout Flow");
    expect(entry.content).toContain("The Checkout Flow flow");
  });

  it("includes artifact label in entries", () => {
    const pages: GeneratedPage[] = [
      makeModulePage("Core", "/libraries/test-app/modules/core"),
    ];

    const entries = buildSearchEntries(pages);
    expect(entries[0].artifactLabel).toBe("Test App");
  });

  it("categorizes DSTI-related pages under Testing", () => {
    const intentGraphData: IntentGraphPageData = {
      type: PageType.INTENT_GRAPH,
      intentGraph: {
        methods: [
          {
            qualified: "io.docspec.Processor.process",
            intentSignals: {
              nameSemantics: { verb: "process", intent: "transformation" },
              intentDensityScore: 0.8,
            },
          },
        ],
      },
      artifact: { label: "Test App", color: "#3b82f6" },
    };

    const testOverviewPage: GeneratedPage = {
      type: PageType.TEST_OVERVIEW,
      slug: "/tests/test-app/overview",
      title: "Test Overview",
      artifactLabel: "Test App",
      data: {
        type: PageType.TEST_OVERVIEW,
        intentGraph: intentGraphData.intentGraph,
        artifact: { label: "Test App", color: "#3b82f6" },
      },
    };

    const intentGraphPage: GeneratedPage = {
      type: PageType.INTENT_GRAPH,
      slug: "/tests/test-app/intent-graph",
      title: "Intent Graph",
      artifactLabel: "Test App",
      data: intentGraphData,
    };

    const entries = buildSearchEntries([testOverviewPage, intentGraphPage]);

    expect(entries[0].section).toBe("Testing");
    expect(entries[1].section).toBe("Testing");
  });

  it("handles pages with empty/missing descriptions gracefully", () => {
    const pages: GeneratedPage[] = [
      makeModulePage("Empty Module", "/libraries/test-app/modules/empty"),
    ];

    const entries = buildSearchEntries(pages);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("Empty Module");
    // description should default to empty string, not undefined
    expect(typeof entries[0].description).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Tests — categorizeSection mapping
// ---------------------------------------------------------------------------

describe("section categorization via buildSearchEntries", () => {
  const testCases: [PageType, string][] = [
    [PageType.GUIDE, "Learn"],
    [PageType.MODULE, "Libraries & SDKs"],
    [PageType.MEMBER, "Libraries & SDKs"],
    [PageType.ENDPOINT, "API Reference"],
    [PageType.FLOW, "Architecture"],
    [PageType.DATA_MODEL, "Architecture"],
    [PageType.ERROR_CATALOG, "API Reference"],
    [PageType.EVENT_CATALOG, "Architecture"],
    [PageType.DATA_STORE, "Architecture"],
    [PageType.CONFIGURATION, "Architecture"],
    [PageType.SECURITY, "Architecture"],
    [PageType.PRIVACY, "Architecture"],
    [PageType.TEST_OVERVIEW, "Testing"],
    [PageType.INTENT_GRAPH, "Testing"],
    [PageType.LANDING, "Home"],
    [PageType.GRAPH, "Architecture"],
  ];

  for (const [pageType, expectedSection] of testCases) {
    it(`maps ${pageType} to "${expectedSection}"`, () => {
      const page: GeneratedPage = {
        type: pageType,
        slug: `/test/${pageType}`,
        title: `Test ${pageType}`,
        data: {} as GeneratedPage["data"],
      };

      const entries = buildSearchEntries([page]);
      expect(entries[0].section).toBe(expectedSection);
    });
  }
});
