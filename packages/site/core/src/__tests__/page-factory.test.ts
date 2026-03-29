import { describe, it, expect } from "vitest";
import { generateArtifactPages } from "../generator/page-factory.js";
import { PageType } from "../types/page.js";
import type { ResolvedArtifact } from "../resolver/types.js";
import type { DocSpec } from "../types/docspec.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpec(overrides: Partial<DocSpec> = {}): DocSpec {
  return {
    docspec: "3.0.0",
    artifact: {
      groupId: "io.docspec",
      artifactId: "docspec-processor-java",
      version: "3.0.0",
      language: "java",
    },
    modules: [
      {
        id: "processor-core",
        name: "Processor Core",
        description: "Main processing pipeline",
        members: [
          {
            kind: "class",
            name: "DocSpecProcessor",
            qualified: "io.docspec.processor.DocSpecProcessor",
            description: "Main annotation processor orchestrator",
            methods: [
              {
                name: "process",
                description: "Runs the 21-step pipeline",
                params: [
                  { name: "types", type: "Set<TypeElement>", required: true },
                ],
                returns: { type: "void" },
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function makeArtifact(specOverrides: Partial<DocSpec> = {}): ResolvedArtifact {
  return {
    label: "DocSpec Processor",
    color: "#6366f1",
    source: "local",
    spec: makeSpec(specOverrides),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PageFactory — generateArtifactPages", () => {
  it("generates a landing-related set of pages from minimal spec", () => {
    const artifact = makeArtifact();
    const pages = generateArtifactPages(artifact);

    // Should generate at minimum: module, member, graph, gap-report pages
    expect(pages.length).toBeGreaterThanOrEqual(4);

    const types = new Set(pages.map((p) => p.type));
    expect(types.has(PageType.MODULE)).toBe(true);
    expect(types.has(PageType.MEMBER)).toBe(true);
    expect(types.has(PageType.GRAPH)).toBe(true);
    expect(types.has(PageType.GAP_REPORT)).toBe(true);
  });

  it("generates member pages for each class", () => {
    const artifact = makeArtifact({
      modules: [
        {
          id: "processor-core",
          name: "Processor Core",
          members: [
            {
              kind: "class",
              name: "DocSpecProcessor",
              qualified: "io.docspec.processor.DocSpecProcessor",
              description: "Main annotation processor orchestrator",
            },
            {
              kind: "class",
              name: "AutoDiscoveryScanner",
              qualified: "io.docspec.processor.scanner.AutoDiscoveryScanner",
              description: "Scans for public types automatically",
            },
          ],
        },
        {
          id: "dsti",
          name: "DSTI",
          members: [
            {
              kind: "class",
              name: "IntentGraphExtractor",
              qualified: "io.docspec.processor.dsti.IntentGraphExtractor",
              description: "Extracts 13-channel intent signals",
            },
          ],
        },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const memberPages = pages.filter((p) => p.type === PageType.MEMBER);

    expect(memberPages).toHaveLength(3);
    expect(memberPages.map((p) => p.title)).toEqual([
      "DocSpecProcessor",
      "AutoDiscoveryScanner",
      "IntentGraphExtractor",
    ]);

    // Each member page should have artifact metadata
    for (const page of memberPages) {
      expect(page.artifactLabel).toBe("DocSpec Processor");
      expect(page.artifactColor).toBe("#6366f1");
    }
  });

  it("generates flow pages", () => {
    const artifact = makeArtifact({
      flows: [
        {
          id: "processing-pipeline",
          name: "Processing Pipeline",
          steps: [
            {
              id: "1",
              name: "Auto-Discovery",
              actor: "AutoDiscoveryScanner",
              type: "process",
            },
            {
              id: "2",
              name: "Read Metadata",
              actor: "AnnotationReader",
              type: "process",
            },
          ],
        },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const flowPages = pages.filter((p) => p.type === PageType.FLOW);

    expect(flowPages).toHaveLength(1);
    expect(flowPages[0].title).toBe("Processing Pipeline");
    expect(flowPages[0].slug).toBe("/architecture/flows/processing-pipeline");
  });

  it("generates error catalog page when errors exist", () => {
    const artifact = makeArtifact({
      errors: [
        {
          code: "DOCSPEC_PROC_001",
          description: "Processing failed",
          httpStatus: 500,
        },
        {
          code: "DOCSPEC_PROC_002",
          description: "Invalid annotation usage",
          httpStatus: 400,
        },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const errorPages = pages.filter((p) => p.type === PageType.ERROR_CATALOG);

    expect(errorPages).toHaveLength(1);
    expect(errorPages[0].slug).toBe("/architecture/errors");
  });

  it("does not generate error catalog when errors array is empty", () => {
    const artifact = makeArtifact({ errors: [] });
    const pages = generateArtifactPages(artifact);
    const errorPages = pages.filter((p) => p.type === PageType.ERROR_CATALOG);

    expect(errorPages).toHaveLength(0);
  });

  it("generates intent graph page when DSTI data exists", () => {
    const artifact = makeArtifact({
      intentGraph: {
        methods: [
          {
            qualified: "io.docspec.processor.DocSpecProcessor.process",
            intentSignals: {
              nameSemantics: { verb: "process", intent: "transformation" },
              intentDensityScore: 5.5,
            },
          },
        ],
      },
    });

    const pages = generateArtifactPages(artifact);
    const intentPages = pages.filter((p) => p.type === PageType.INTENT_GRAPH);
    const testOverviewPages = pages.filter(
      (p) => p.type === PageType.TEST_OVERVIEW,
    );

    expect(intentPages).toHaveLength(1);
    expect(testOverviewPages).toHaveLength(1);
    expect(intentPages[0].slug).toContain("intent-graph");
    expect(testOverviewPages[0].slug).toContain("overview");
  });

  it("generates correct navigation-relevant slugs for all page types", () => {
    const artifact = makeArtifact({
      modules: [
        {
          id: "core",
          name: "Core",
          members: [
            {
              kind: "class",
              name: "Processor",
              qualified: "io.docspec.Processor",
              methods: [
                {
                  name: "handle",
                  params: [],
                  returns: { type: "void" },
                  endpointMapping: { method: "POST", path: "/api/process" },
                },
              ],
            },
          ],
        },
      ],
      flows: [
        {
          id: "main-flow",
          name: "Main Flow",
          steps: [{ id: "s1", name: "Step 1" }],
        },
      ],
      errors: [{ code: "E001", description: "Error" }],
      events: [{ name: "processing.started", description: "Started" }],
      dataModels: [
        {
          name: "User",
          qualified: "io.docspec.User",
          fields: [{ name: "id", type: "Long" }],
        },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const slugs = pages.map((p) => p.slug);

    // Module slug
    expect(slugs).toContain("/libraries/docspec-processor/modules/core");
    // Flow slug
    expect(slugs).toContain("/architecture/flows/main-flow");
    // Error catalog slug
    expect(slugs).toContain("/architecture/errors");
    // Event catalog slug
    expect(slugs).toContain("/architecture/events");
    // Endpoint page slug
    expect(slugs.some((s) => s.includes("/endpoints/"))).toBe(true);
    // Data model slug
    expect(slugs.some((s) => s.includes("/data-models/"))).toBe(true);
  });

  it("generates data store, configuration, security, and privacy pages", () => {
    const artifact = makeArtifact({
      dataStores: [
        {
          id: "primary-db",
          type: "rdbms",
          name: "Primary Database",
          tables: ["users", "orders"],
        },
      ],
      configuration: [
        {
          key: "app.max-retries",
          type: "int",
          default: "3",
          description: "Maximum retry attempts",
        },
      ],
      security: {
        authMechanism: "jwt",
        roles: ["ADMIN", "USER"],
      },
      privacy: [
        {
          field: "User.email",
          piiType: "email",
          encrypted: true,
        },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const types = new Set(pages.map((p) => p.type));

    expect(types.has(PageType.DATA_STORE)).toBe(true);
    expect(types.has(PageType.CONFIGURATION)).toBe(true);
    expect(types.has(PageType.SECURITY)).toBe(true);
    expect(types.has(PageType.PRIVACY)).toBe(true);
  });

  it("generates flow test pages for each flow", () => {
    const artifact = makeArtifact({
      flows: [
        {
          id: "registration",
          name: "Registration",
          steps: [{ id: "s1", name: "Validate" }],
        },
        {
          id: "checkout",
          name: "Checkout",
          steps: [{ id: "s1", name: "Pay" }],
        },
      ],
    });

    const pages = generateArtifactPages(artifact);
    const flowTestPages = pages.filter((p) => p.type === PageType.FLOW_TEST);

    expect(flowTestPages).toHaveLength(2);
    expect(flowTestPages[0].slug).toContain("flow-tests/registration");
    expect(flowTestPages[1].slug).toContain("flow-tests/checkout");
  });

  it("always generates a gap report page", () => {
    const artifact = makeArtifact({ modules: [] });
    const pages = generateArtifactPages(artifact);
    const gapPages = pages.filter((p) => p.type === PageType.GAP_REPORT);

    expect(gapPages).toHaveLength(1);
    expect(gapPages[0].slug).toContain("gap-report");
  });

  it("generates observability page when observability data exists", () => {
    const artifact = makeArtifact({
      observability: {
        metrics: [
          {
            name: "docspec.processing.duration",
            type: "timer",
            labels: ["module"],
          },
        ],
        healthChecks: [
          {
            path: "/actuator/health",
            checks: ["db", "disk"],
          },
        ],
      },
    });

    const pages = generateArtifactPages(artifact);
    const obsPages = pages.filter((p) => p.type === PageType.OBSERVABILITY);

    expect(obsPages).toHaveLength(1);
    expect(obsPages[0].slug).toContain("observability");
  });
});
