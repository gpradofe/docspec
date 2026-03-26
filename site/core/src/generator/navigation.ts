/**
 * Navigation tree builder.
 *
 * Builds a NavigationTree from the config `navigation[]` sections and the
 * set of generated pages. Supports `auto: true` to auto-populate items
 * for Libraries and Architecture sections.
 */

import type { NavigationSection } from "../types/config.js";
import type { ResolvedArtifact } from "../resolver/types.js";
import type {
  NavigationTree,
  NavSection,
  NavigationNode,
  GeneratedPage,
} from "../types/page.js";
import { PageType } from "../types/page.js";
import {
  slugify,
  artifactLandingSlug,
  modulePageSlug,
  intentGraphPageSlug,
  testOverviewPageSlug,
  errorCatalogSlug,
  eventCatalogSlug,
  operationsPageSlug,
  graphPageSlug,
  observabilityPageSlug,
  gapReportPageSlug,
  testDashboardSlug,
} from "./slug.js";

/**
 * Build the complete navigation tree.
 *
 * @param navigationConfig  The `navigation` array from docspec.config.yaml
 * @param artifacts         All resolved artifacts (for auto-populating)
 * @param pages             All generated pages (for guide entries)
 */
export function buildNavigation(
  navigationConfig: NavigationSection[] | undefined,
  artifacts: ResolvedArtifact[],
  pages: GeneratedPage[],
): NavigationTree {
  // If no navigation config, generate a default one
  const sections = navigationConfig ?? buildDefaultSections();

  const navSections: NavSection[] = sections.map((section) =>
    buildSection(section, artifacts, pages),
  );

  return { sections: navSections };
}

// ---------------------------------------------------------------------------
// Default sections when no navigation config is provided
// ---------------------------------------------------------------------------

function buildDefaultSections(): NavigationSection[] {
  return [
    { section: "Libraries", auto: true, tab: "docs" },
    { section: "API", auto: true, tab: "docs" },
    { section: "Architecture", auto: true, tab: "docs" },
    { section: "Learn", auto: true, tab: "docs" },
    { section: "Tests", auto: true, tab: "tests" },
  ];
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildSection(
  config: NavigationSection,
  artifacts: ResolvedArtifact[],
  pages: GeneratedPage[],
): NavSection {
  const title = config.section;
  const tab = config.tab;

  // If explicit items are listed, use them directly
  if (config.items && config.items.length > 0) {
    return {
      title,
      items: config.items.map((item) => resolveNavItem(item, artifacts, pages)),
      tab,
    };
  }

  // Auto-generate based on section name
  if (config.auto) {
    return {
      title,
      items: autoGenerateItems(title, artifacts, pages),
      tab,
    };
  }

  return { title, items: [], tab };
}

/**
 * Resolve a single navigation item string to a NavigationNode.
 *
 * Supports three patterns:
 *   1. `artifacts/{name}` — expands into the artifact's module tree
 *   2. Exact page slug match
 *   3. Case-insensitive page title match
 */
function resolveNavItem(
  item: string,
  artifacts: ResolvedArtifact[],
  pages: GeneratedPage[],
): NavigationNode {
  // Handle artifact references like "artifacts/docspec-processor-java"
  if (item.startsWith("artifacts/")) {
    const artifactRef = item.slice("artifacts/".length);
    const artifact = artifacts.find(
      (a) => slugify(a.label) === artifactRef || a.label === artifactRef,
    );
    if (artifact) {
      const children: NavigationNode[] = artifact.spec.modules.map((mod) => ({
        label: mod.name ?? mod.id,
        slug: modulePageSlug(artifact.label, mod.id),
        type: PageType.MODULE,
      }));
      return {
        label: artifact.label,
        slug: artifactLandingSlug(artifact.label),
        type: PageType.LANDING,
        children,
      };
    }
  }

  // Try exact slug match
  const bySlug = pages.find((p) => p.slug === item);
  if (bySlug) {
    return {
      label: bySlug.title,
      slug: bySlug.slug,
      type: bySlug.type,
    };
  }

  // Try title match (case-insensitive)
  const lower = item.toLowerCase();
  const byTitle = pages.find((p) => p.title.toLowerCase() === lower);
  if (byTitle) {
    return {
      label: byTitle.title,
      slug: byTitle.slug,
      type: byTitle.type,
    };
  }

  // Fallback: create a label-only node (no link)
  return { label: item };
}

/**
 * Auto-generate navigation items for a given section name.
 */
function autoGenerateItems(
  sectionTitle: string,
  artifacts: ResolvedArtifact[],
  pages: GeneratedPage[],
): NavigationNode[] {
  const normalized = sectionTitle.toLowerCase();

  switch (normalized) {
    case "libraries":
      return autoLibraries(artifacts, pages);
    case "api":
      return autoApi(artifacts, pages);
    case "architecture":
      return autoArchitecture(artifacts, pages);
    case "learn":
    case "guides":
      return autoLearn(pages);
    case "tests":
      return autoTests(artifacts, pages);
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Auto-generators per section
// ---------------------------------------------------------------------------

/**
 * Libraries section: one entry per artifact, with child entries for each module
 * plus intent graph and test overview pages when available.
 */
function autoLibraries(
  artifacts: ResolvedArtifact[],
  pages: GeneratedPage[],
): NavigationNode[] {
  return artifacts.map((art) => {
    const children: NavigationNode[] = art.spec.modules.map((mod) => ({
      label: mod.name ?? mod.id,
      slug: modulePageSlug(art.label, mod.id),
      type: PageType.MODULE,
    }));

    return {
      label: art.label,
      slug: artifactLandingSlug(art.label),
      type: PageType.LANDING,
      children,
    };
  });
}

/**
 * API section: one entry per artifact that has endpoints, with child entries
 * for each endpoint.
 */
function autoApi(
  _artifacts: ResolvedArtifact[],
  pages: GeneratedPage[],
): NavigationNode[] {
  const endpointPages = pages.filter((p) => p.type === PageType.ENDPOINT);

  // Group by artifact
  const byArtifact = new Map<string, NavigationNode[]>();
  for (const page of endpointPages) {
    const key = page.artifactLabel ?? "Unknown";
    if (!byArtifact.has(key)) {
      byArtifact.set(key, []);
    }
    byArtifact.get(key)!.push({
      label: page.title,
      slug: page.slug,
      type: PageType.ENDPOINT,
    });
  }

  const items: NavigationNode[] = [];
  for (const [label, children] of byArtifact) {
    if (children.length > 0) {
      items.push({
        label,
        children,
        icon: "api",
      });
    }
  }

  return items;
}

/**
 * Architecture section: flows, data models, errors, events, operations, graph.
 */
function autoArchitecture(
  _artifacts: ResolvedArtifact[],
  pages: GeneratedPage[],
): NavigationNode[] {
  const items: NavigationNode[] = [];

  // Flows
  const flowPages = pages.filter((p) => p.type === PageType.FLOW);
  if (flowPages.length > 0) {
    items.push({
      label: "Flows",
      icon: "flow",
      children: flowPages.map((p) => ({
        label: p.title,
        slug: p.slug,
        type: PageType.FLOW,
      })),
    });
  }

  // Data Models
  const dmPages = pages.filter((p) => p.type === PageType.DATA_MODEL);
  if (dmPages.length > 0) {
    items.push({
      label: "Data Models",
      icon: "database",
      children: dmPages.map((p) => ({
        label: p.title,
        slug: p.slug,
        type: PageType.DATA_MODEL,
      })),
    });
  }

  // Error Catalog
  const hasErrors = pages.some((p) => p.type === PageType.ERROR_CATALOG);
  if (hasErrors) {
    items.push({
      label: "Error Catalog",
      slug: errorCatalogSlug(),
      type: PageType.ERROR_CATALOG,
      icon: "alert",
    });
  }

  // Event Catalog
  const hasEvents = pages.some((p) => p.type === PageType.EVENT_CATALOG);
  if (hasEvents) {
    items.push({
      label: "Event Catalog",
      slug: eventCatalogSlug(),
      type: PageType.EVENT_CATALOG,
      icon: "event",
    });
  }

  // Operations
  const hasOps = pages.some((p) => p.type === PageType.OPERATIONS);
  if (hasOps) {
    items.push({
      label: "Operations",
      slug: operationsPageSlug(),
      type: PageType.OPERATIONS,
      icon: "ops",
    });
  }

  // Graph
  const hasGraph = pages.some((p) => p.type === PageType.GRAPH);
  if (hasGraph) {
    items.push({
      label: "Dependency Graph",
      slug: graphPageSlug(),
      type: PageType.GRAPH,
      icon: "graph",
    });
  }

  // Observability
  const observabilityPages = pages.filter((p) => p.type === PageType.OBSERVABILITY);
  if (observabilityPages.length > 0) {
    items.push({
      label: "Observability",
      icon: "monitor",
      children: observabilityPages.map((p) => ({
        label: p.title,
        slug: p.slug,
        type: PageType.OBSERVABILITY,
      })),
    });
  }

  // Gap Reports are shown under the Tests tab, not Architecture

  return items;
}

/**
 * Learn / Guides section: lists all guide pages.
 */
function autoLearn(pages: GeneratedPage[]): NavigationNode[] {
  return pages
    .filter((p) => p.type === PageType.GUIDE)
    .map((p) => ({
      label: p.title,
      slug: p.slug,
      type: PageType.GUIDE,
    }));
}

/**
 * Tests section: one entry per artifact with test-related children.
 */
function autoTests(
  artifacts: ResolvedArtifact[],
  pages: GeneratedPage[],
): NavigationNode[] {
  // Dashboard link
  const items: NavigationNode[] = [
    {
      label: "Dashboard",
      slug: testDashboardSlug(),
      type: PageType.TEST_DASHBOARD,
      icon: "dashboard",
    },
  ];

  for (const art of artifacts) {
    const children: NavigationNode[] = [];

    // Test Overview
    const toSlug = testOverviewPageSlug(art.label);
    if (pages.some((p) => p.slug === toSlug)) {
      children.push({
        label: "Test Overview",
        slug: toSlug,
        type: PageType.TEST_OVERVIEW,
      });
    }

    // Intent Graph
    const igSlug = intentGraphPageSlug(art.label);
    if (pages.some((p) => p.slug === igSlug)) {
      children.push({
        label: "Intent Graph",
        slug: igSlug,
        type: PageType.INTENT_GRAPH,
      });
    }

    // Gap Report
    const grSlug = gapReportPageSlug(art.label);
    if (pages.some((p) => p.slug === grSlug)) {
      children.push({
        label: "Gap Report",
        slug: grSlug,
        type: PageType.GAP_REPORT,
      });
    }

    // Flow Tests
    const flowTestPages = pages.filter(
      (p) => p.type === PageType.FLOW_TEST && p.artifactLabel === art.label,
    );
    for (const ftp of flowTestPages) {
      children.push({
        label: ftp.title,
        slug: ftp.slug,
        type: PageType.FLOW_TEST,
      });
    }

    if (children.length > 0) {
      items.push({
        label: art.label,
        slug: testOverviewPageSlug(art.label),
        type: PageType.TEST_OVERVIEW,
        children,
      });
    }
  }

  return items;
}
