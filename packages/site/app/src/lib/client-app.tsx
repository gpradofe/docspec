"use client";

import React from "react";
import { Layout, useLens } from "@docspec/theme-stripe";
import type { SiteData, GeneratedPage, LandingPageData, ArtifactSummary } from "@docspec/core";
// NOTE: Cannot import PageType enum directly in client component — @docspec/core has Node.js deps.
// Use string comparison instead.
import { PageRenderer } from "./page-renderer";

interface ClientAppProps {
  siteData: SiteData;
  initialSlug?: string;
}

export function ClientApp({ siteData, initialSlug }: ClientAppProps) {
  // Infer initial lens from URL — /tests/* pages should start in tests lens
  const inferredLens = initialSlug?.startsWith("tests") ? "tests" : "docs";

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

  return (
    <Layout
      navigation={siteData.navigation}
      siteName={siteData.config.siteName || "DocSpec"}
      logo={siteData.config.logo}
      currentSlug={initialSlug}
      lens={inferredLens as any}
      artifacts={artifacts.map((a) => ({
        label: a.label,
        color: a.color,
      }))}
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

  return (
    <PageRenderer page={page} referenceIndex={referenceIndex} lens={lens} />
  );
}
