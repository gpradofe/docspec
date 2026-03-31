/**
 * Generator orchestrator.
 *
 * Entry point for page generation. Coordinates the page factory,
 * guide page generation, changelog, landing page, and navigation
 * building into a single GeneratorResult.
 */

import type { NavigationSection } from "../types/config.js";
import type { ResolvedArtifact } from "../resolver/types.js";
import type {
  GeneratedPage,
  NavigationTree,
  ArtifactSummary,
  LandingPageData,
  TestDashboardPageData,
  TestDashboardArtifact,
} from "../types/page.js";
import { PageType } from "../types/page.js";
import { generateArtifactPages } from "./page-factory.js";
import { generateGuidePage } from "./pages/guide.js";
import { generateChangelogPage } from "./pages/changelog.js";
import { generateCombinedGraphPage } from "./pages/graph.js";
import { buildNavigation } from "./navigation.js";
import { artifactLandingSlug, testDashboardSlug, testOverviewPageSlug } from "./slug.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GeneratorResult {
  pages: GeneratedPage[];
  navigation: NavigationTree;
}

export interface GuidePath {
  /** Absolute filesystem path to the markdown / markdoc file. */
  path: string;
  /** Display label (used as fallback title if frontmatter has no title). */
  label?: string;
}

/**
 * Generate all pages and the navigation tree for the entire site.
 *
 * @param artifacts        Resolved artifacts (each containing a DocSpec)
 * @param navigationConfig Navigation sections from docspec.config.yaml
 * @param guidePaths       Paths to guide markdown files
 * @returns pages and navigation tree
 */
export async function generatePages(
  artifacts: ResolvedArtifact[],
  navigationConfig?: NavigationSection[],
  guidePaths?: GuidePath[],
): Promise<GeneratorResult> {
  const pages: GeneratedPage[] = [];

  // ── 1. Generate pages for each artifact ──────────────────────────
  for (const artifact of artifacts) {
    const artifactPages = generateArtifactPages(artifact);
    pages.push(...artifactPages);
  }

  // ── 1b. Generate combined graph page across all artifacts ────────
  const graphArtifacts = artifacts
    .filter((art) => art.spec.modules.length > 0 || (art.spec.crossRefs ?? []).length > 0)
    .map((art) => ({
      modules: art.spec.modules,
      crossRefs: art.spec.crossRefs ?? [],
      artifactLabel: art.label,
    }));
  if (graphArtifacts.length > 0) {
    pages.push(generateCombinedGraphPage({ artifacts: graphArtifacts }));
  }

  // ── 2. Generate guide pages ──────────────────────────────────────
  if (guidePaths && guidePaths.length > 0) {
    const guidePromises = guidePaths.map((gp) => {
      // Derive a relativePath from the full path for slug generation.
      // Use the last segment(s) of the path as the relative portion.
      const segments = gp.path.replace(/\\/g, "/").split("/");
      const relativePath = segments[segments.length - 1] ?? gp.path;

      return generateGuidePage({
        filePath: gp.path,
        relativePath,
      });
    });
    const guidePages = await Promise.all(guidePromises);
    pages.push(...guidePages);
  }

  // ── 3. Generate changelog placeholder ────────────────────────────
  pages.push(generateChangelogPage());

  // ── 4. Generate landing page ─────────────────────────────────────
  const landing = buildLandingPage(artifacts, pages);
  pages.push(landing);

  // ── 4b. Generate test dashboard page ───────────────────────────
  const testDashboard = buildTestDashboardPage(artifacts);
  pages.push(testDashboard);

  // ── 5. Build navigation tree ─────────────────────────────────────
  const navigation = buildNavigation(navigationConfig, artifacts, pages);

  return { pages, navigation };
}

// ---------------------------------------------------------------------------
// Landing page builder
// ---------------------------------------------------------------------------

function buildLandingPage(
  artifacts: ResolvedArtifact[],
  _pages: GeneratedPage[],
): GeneratedPage {
  const summaries: ArtifactSummary[] = artifacts.map((art) => {
    const spec = art.spec;

    // Count members across all modules
    let memberCount = 0;
    let endpointCount = 0;
    for (const mod of spec.modules) {
      memberCount += mod.members?.length ?? 0;
      for (const member of mod.members ?? []) {
        for (const method of member.methods ?? []) {
          if (method.endpointMapping) {
            endpointCount++;
          }
        }
      }
    }

    return {
      label: art.label,
      color: art.color,
      description: spec.project?.description,
      moduleCount: spec.modules.length,
      memberCount,
      endpointCount,
      coveragePercent: spec.discovery?.coveragePercent,
      slug: artifactLandingSlug(art.label),
    };
  });

  const data: LandingPageData = {
    type: PageType.LANDING,
    artifacts: summaries,
  };

  return {
    type: PageType.LANDING,
    slug: "/",
    title: "Home",
    description: "DocSpec documentation site",
    data,
  };
}

// ---------------------------------------------------------------------------
// Test dashboard page builder
// ---------------------------------------------------------------------------

function buildTestDashboardPage(
  artifacts: ResolvedArtifact[],
): GeneratedPage {
  const dashboardArtifacts: TestDashboardArtifact[] = artifacts
    .filter((art) => art.spec.intentGraph)
    .map((art) => {
      const ig = art.spec.intentGraph!;
      const methods = ig.methods || [];
      const totalMethods = methods.length;
      const withSignals = methods.filter((m: any) => m.intentSignals).length;
      const avgIsd =
        totalMethods > 0
          ? methods.reduce(
              (sum: number, m: any) =>
                sum + (m.intentSignals?.intentDensityScore ?? 0),
              0,
            ) / totalMethods
          : 0;

      return {
        label: art.label,
        color: art.color,
        methodCount: totalMethods,
        avgIsd: Math.round(avgIsd * 100) / 100,
        coveragePercent:
          totalMethods > 0 ? Math.round((withSignals / totalMethods) * 100) : 0,
        slug: testOverviewPageSlug(art.label),
      };
    });

  const data: TestDashboardPageData = {
    type: PageType.TEST_DASHBOARD,
    artifacts: dashboardArtifacts,
  };

  return {
    type: PageType.TEST_DASHBOARD,
    slug: testDashboardSlug(),
    title: "Test Dashboard",
    description: "DSTI test intelligence overview across all artifacts",
    data,
  };
}
