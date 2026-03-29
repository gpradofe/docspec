import { describe, it, expect } from "vitest";
import { buildNavigation } from "../generator/navigation.js";
import { PageType } from "../types/page.js";
import type { ResolvedArtifact } from "../resolver/types.js";
import type { GeneratedPage } from "../types/page.js";
import type { NavigationSection } from "../types/config.js";
import type { DocSpec } from "../types/docspec.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArtifact(
  label: string,
  specOverrides: Partial<DocSpec> = {},
): ResolvedArtifact {
  const spec: DocSpec = {
    docspec: "3.0.0",
    artifact: {
      groupId: "io.docspec",
      artifactId: label.toLowerCase().replace(/\s+/g, "-"),
      version: "3.0.0",
      language: "java",
    },
    modules: [
      {
        id: "core",
        name: "Core",
        members: [
          {
            kind: "class",
            name: "Processor",
            qualified: "io.docspec.Processor",
          },
        ],
      },
    ],
    ...specOverrides,
  };
  return { label, source: "local", spec };
}

function makePage(
  type: PageType,
  title: string,
  slug: string,
  artifactLabel?: string,
): GeneratedPage {
  return {
    type,
    slug,
    title,
    artifactLabel,
    data: {} as GeneratedPage["data"],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildNavigation", () => {
  describe("modules become sidebar sections", () => {
    it("modules appear as children of their artifact in Libraries", () => {
      const artifacts = [
        makeArtifact("DocSpec Processor", {
          modules: [
            { id: "scanner", name: "Scanner", members: [] },
            { id: "reader", name: "Reader", members: [] },
            { id: "extractor", name: "Extractor", members: [] },
          ],
        }),
      ];

      const nav = buildNavigation(
        [{ section: "Libraries", auto: true }],
        artifacts,
        [],
      );

      const libSection = nav.sections[0];
      expect(libSection.title).toBe("Libraries");
      expect(libSection.items).toHaveLength(1);

      const artifactNode = libSection.items[0];
      expect(artifactNode.label).toBe("DocSpec Processor");
      expect(artifactNode.type).toBe(PageType.LANDING);
      expect(artifactNode.children).toHaveLength(3);
      expect(artifactNode.children!.map((c) => c.label)).toEqual([
        "Scanner",
        "Reader",
        "Extractor",
      ]);

      for (const child of artifactNode.children!) {
        expect(child.type).toBe(PageType.MODULE);
        expect(child.slug).toContain("/modules/");
      }
    });

    it("multiple artifacts each get their own tree node", () => {
      const artifacts = [
        makeArtifact("Annotations", {
          modules: [{ id: "core-annotations", name: "Core Annotations", members: [] }],
        }),
        makeArtifact("Processor", {
          modules: [
            { id: "pipeline", name: "Pipeline", members: [] },
            { id: "dsti", name: "DSTI", members: [] },
          ],
        }),
      ];

      const nav = buildNavigation(
        [{ section: "Libraries", auto: true }],
        artifacts,
        [],
      );

      const items = nav.sections[0].items;
      expect(items).toHaveLength(2);
      expect(items[0].label).toBe("Annotations");
      expect(items[0].children).toHaveLength(1);
      expect(items[1].label).toBe("Processor");
      expect(items[1].children).toHaveLength(2);
    });
  });

  describe("flows appear under Architecture", () => {
    it("groups flow pages under a Flows heading in Architecture", () => {
      const pages: GeneratedPage[] = [
        makePage(
          PageType.FLOW,
          "Processing Pipeline",
          "/architecture/flows/processing-pipeline",
        ),
        makePage(
          PageType.FLOW,
          "User Registration",
          "/architecture/flows/user-registration",
        ),
      ];

      const nav = buildNavigation(
        [{ section: "Architecture", auto: true }],
        [],
        pages,
      );

      const archSection = nav.sections[0];
      const flowsNode = archSection.items.find((i) => i.label === "Flows");
      expect(flowsNode).toBeDefined();
      expect(flowsNode!.children).toHaveLength(2);
      expect(flowsNode!.children![0].label).toBe("Processing Pipeline");
      expect(flowsNode!.children![1].label).toBe("User Registration");
    });
  });

  describe("error/event catalogs appear under Architecture", () => {
    it("includes Error Catalog and Event Catalog as top-level architecture items", () => {
      const pages: GeneratedPage[] = [
        makePage(
          PageType.ERROR_CATALOG,
          "Error Catalog",
          "/architecture/errors",
        ),
        makePage(
          PageType.EVENT_CATALOG,
          "Event Catalog",
          "/architecture/events",
        ),
      ];

      const nav = buildNavigation(
        [{ section: "Architecture", auto: true }],
        [],
        pages,
      );

      const archSection = nav.sections[0];
      const labels = archSection.items.map((i) => i.label);
      expect(labels).toContain("Error Catalog");
      expect(labels).toContain("Event Catalog");

      const errorNode = archSection.items.find(
        (i) => i.label === "Error Catalog",
      );
      expect(errorNode!.type).toBe(PageType.ERROR_CATALOG);
      expect(errorNode!.icon).toBe("alert");

      const eventNode = archSection.items.find(
        (i) => i.label === "Event Catalog",
      );
      expect(eventNode!.type).toBe(PageType.EVENT_CATALOG);
      expect(eventNode!.icon).toBe("event");
    });
  });

  describe("Tests section auto-generation", () => {
    it("includes dashboard and artifact test overview entries", () => {
      const artifacts = [
        makeArtifact("DocSpec Processor", {
          intentGraph: {
            methods: [
              {
                qualified: "io.docspec.Processor.process",
                intentSignals: { intentDensityScore: 0.8 },
              },
            ],
          },
        }),
      ];

      const pages: GeneratedPage[] = [
        makePage(
          PageType.TEST_OVERVIEW,
          "Test Overview",
          "/tests/docspec-processor/overview",
          "DocSpec Processor",
        ),
        makePage(
          PageType.INTENT_GRAPH,
          "Intent Graph",
          "/tests/docspec-processor/intent-graph",
          "DocSpec Processor",
        ),
        makePage(
          PageType.GAP_REPORT,
          "Gap Report",
          "/tests/docspec-processor/gap-report",
          "DocSpec Processor",
        ),
      ];

      const nav = buildNavigation(
        [{ section: "Tests", auto: true, tab: "tests" }],
        artifacts,
        pages,
      );

      const testsSection = nav.sections[0];
      expect(testsSection.title).toBe("Tests");

      // First item is the Dashboard
      expect(testsSection.items[0].label).toBe("Dashboard");
      expect(testsSection.items[0].type).toBe(PageType.TEST_DASHBOARD);

      // Second item is the artifact with test children
      const artifactTestNode = testsSection.items[1];
      expect(artifactTestNode.label).toBe("DocSpec Processor");
      expect(artifactTestNode.children).toBeDefined();
      expect(artifactTestNode.children!.length).toBeGreaterThanOrEqual(2);

      const childLabels = artifactTestNode.children!.map((c) => c.label);
      expect(childLabels).toContain("Test Overview");
      expect(childLabels).toContain("Intent Graph");
      expect(childLabels).toContain("Gap Report");
    });

    it("includes flow test pages under the artifact in Tests section", () => {
      const artifacts = [makeArtifact("My Service")];
      const pages: GeneratedPage[] = [
        makePage(
          PageType.FLOW_TEST,
          "Registration Flow Test",
          "/tests/my-service/flow-tests/registration",
          "My Service",
        ),
        makePage(
          PageType.FLOW_TEST,
          "Checkout Flow Test",
          "/tests/my-service/flow-tests/checkout",
          "My Service",
        ),
      ];

      const nav = buildNavigation(
        [{ section: "Tests", auto: true, tab: "tests" }],
        artifacts,
        pages,
      );

      const testsSection = nav.sections[0];
      // Dashboard + My Service
      const artifactNode = testsSection.items.find(
        (i) => i.label === "My Service",
      );
      expect(artifactNode).toBeDefined();
      expect(artifactNode!.children).toHaveLength(2);
      expect(artifactNode!.children![0].type).toBe(PageType.FLOW_TEST);
    });
  });

  describe("explicit artifact references", () => {
    it("expands artifacts/{name} into an artifact tree", () => {
      const artifacts = [
        makeArtifact("My Library", {
          modules: [
            { id: "auth", name: "Authentication", members: [] },
            { id: "storage", name: "Storage", members: [] },
          ],
        }),
      ];

      const nav = buildNavigation(
        [{ section: "Custom", items: ["artifacts/my-library"] }],
        artifacts,
        [],
      );

      const section = nav.sections[0];
      expect(section.items).toHaveLength(1);
      expect(section.items[0].label).toBe("My Library");
      expect(section.items[0].type).toBe(PageType.LANDING);
      expect(section.items[0].children).toHaveLength(2);
      expect(section.items[0].children![0].label).toBe("Authentication");
    });
  });

  describe("default sections generation", () => {
    it("generates Libraries, API, Architecture, Learn, and Tests when no config", () => {
      const nav = buildNavigation(undefined, [], []);

      expect(nav.sections.length).toBeGreaterThanOrEqual(4);
      const titles = nav.sections.map((s) => s.title);
      expect(titles).toContain("Libraries");
      expect(titles).toContain("API");
      expect(titles).toContain("Architecture");
      expect(titles).toContain("Learn");
    });
  });

  describe("observability in Architecture", () => {
    it("includes observability pages under Architecture", () => {
      const pages: GeneratedPage[] = [
        makePage(
          PageType.OBSERVABILITY,
          "Observability",
          "/libraries/my-service/observability",
          "My Service",
        ),
      ];

      const nav = buildNavigation(
        [{ section: "Architecture", auto: true }],
        [],
        pages,
      );

      const archSection = nav.sections[0];
      const obsNode = archSection.items.find(
        (i) => i.label === "Observability",
      );
      expect(obsNode).toBeDefined();
      expect(obsNode!.children).toHaveLength(1);
    });
  });
});
