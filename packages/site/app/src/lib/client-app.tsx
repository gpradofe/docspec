"use client";

import React, { useState } from "react";
import { Layout, SearchDialog, Breadcrumb, useLens } from "@docspec/theme-stripe";
import type { SiteData, GeneratedPage, LandingPageData, ArtifactSummary } from "@docspec/core";
// NOTE: Cannot import PageType enum directly in client component -- @docspec/core has Node.js deps.
// Use string comparison instead.
import { PageRenderer } from "./page-renderer";

/* ------------------------------------------------------------------ */
/*  Search helpers                                                      */
/* ------------------------------------------------------------------ */
interface SearchEntry {
  id: string;
  slug: string;
  title: string;
  type: string;
  description: string;
  content: string;
  section: string;
  keywords: string[];
  artifact?: string;
  artifactLabel?: string;
}

function categorizePageType(type: string): string {
  if (type === "member" || type === "module" || type === "data-model") return "Libraries";
  if (type === "endpoint") return "Endpoints";
  if (type === "flow" || type === "graph" || type === "error-catalog" || type === "event-catalog") return "Architecture";
  if (type === "data-store-page" || type === "configuration" || type === "security" || type === "dependency-map" || type === "privacy" || type === "observability" || type === "operations") return "Operations";
  if (type === "test-overview" || type === "intent-graph" || type === "gap-report" || type === "flow-test" || type === "test-dashboard") return "Testing";
  if (type === "guide" || type === "changelog") return "Guides";
  if (type === "landing") return "Overview";
  return "Other";
}

function buildSearchEntries(pages: GeneratedPage[]): SearchEntry[] {
  return pages.map((p) => ({
    id: p.slug || p.title,
    title: p.title,
    description: p.description || "",
    content: "",
    slug: p.slug || "/",
    section: categorizePageType(p.type),
    type: p.type,
    keywords: [],
    artifact: p.artifactLabel,
    artifactLabel: p.artifactLabel,
  }));
}

/* ------------------------------------------------------------------ */
/*  Breadcrumb helper                                                   */
/* ------------------------------------------------------------------ */
function computeBreadcrumb(page: GeneratedPage): Array<{ label: string; href?: string }> {
  const parts: Array<{ label: string; href?: string }> = [];

  if (page.artifactLabel) {
    const artifactSlug = "/libraries/" + page.artifactLabel.toLowerCase().replace(/\s+/g, "-");
    parts.push({ label: page.artifactLabel, href: artifactSlug });
  }

  if (page.type === "member") {
    const data = page.data as any;
    if (data.member?.moduleId) {
      parts.push({ label: data.member.moduleId });
    }
    parts.push({ label: page.title });
  } else if (page.type === "module") {
    parts.push({ label: page.title });
  } else if (page.type === "flow") {
    parts.push({ label: "Architecture", href: "/" });
    parts.push({ label: page.title });
  } else if (page.type === "endpoint") {
    parts.push({ label: "Endpoints", href: "/" });
    parts.push({ label: page.title });
  } else if (page.type === "landing") {
    // No breadcrumb for landing page
  } else {
    parts.push({ label: page.title });
  }

  return parts;
}

/* ------------------------------------------------------------------ */
/*  ClientApp                                                           */
/* ------------------------------------------------------------------ */
interface ClientAppProps {
  siteData: SiteData;
  initialSlug?: string;
}

export function ClientApp({ siteData, initialSlug }: ClientAppProps) {
  // Find the current page based on slug
  const currentPage = initialSlug
    ? siteData.pages.find(
        (p) => p.slug === initialSlug || p.slug === `/${initialSlug}`,
      )
    : siteData.pages.find((p) => p.type === "landing");

  // Derive artifact summaries for project switcher
  const landingPage = siteData.pages.find((p) => p.type === "landing");
  const artifacts: ArtifactSummary[] = landingPage
    ? (landingPage.data as LandingPageData).artifacts
    : [];

  // Build search entries from all pages
  const searchEntries = buildSearchEntries(siteData.pages);

  // Search dialog state
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <Layout
        navigation={siteData.navigation}
        siteName={siteData.config.siteName || "DocSpec"}
        logo={siteData.config.logo}
        currentSlug={initialSlug}
        initialLens={initialSlug?.startsWith("tests") ? "tests" : "docs"}
        artifacts={artifacts.map((a) => ({
          label: a.label,
          color: a.color,
        }))}
        onArtifactChange={(label: string) => {
          const slug = "/libraries/" + label.toLowerCase().replace(/\s+/g, "-");
          window.location.href = slug;
        }}
        onOpenSearch={() => setSearchOpen(true)}
      >
        {currentPage ? (
          <ClientPageContent
            page={currentPage}
            referenceIndex={siteData.referenceIndex}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              Page Not Found
            </h1>
            <p style={{ color: "#94a3b8" }}>
              No page found{initialSlug ? ` at /${initialSlug}` : ""}
            </p>
          </div>
        )}
      </Layout>

      <SearchDialog
        entries={searchEntries}
        open={searchOpen}
        onOpen={() => setSearchOpen(true)}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}

/**
 * Inner component rendered inside Layout so it can access LensContext via useLens().
 */
function ClientPageContent({
  page,
  referenceIndex,
}: {
  page: GeneratedPage;
  referenceIndex: Record<string, string>;
}) {
  const { lens } = useLens();
  const breadcrumbItems = computeBreadcrumb(page);

  return (
    <>
      {breadcrumbItems.length > 0 && <Breadcrumb items={breadcrumbItems} />}
      <PageRenderer page={page} referenceIndex={referenceIndex} lens={lens} />
    </>
  );
}
