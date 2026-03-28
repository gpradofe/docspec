import React from "react";
import { PageType } from "@docspec/core";
import type { LandingPageData, ArtifactSummary } from "@docspec/core";
import { Layout } from "@docspec/theme-stripe";
import { loadSiteData } from "../lib/load-site-data";

export default async function HomePage() {
  const siteData = await loadSiteData();
  const landingPage = siteData.pages.find((p) => p.type === PageType.LANDING);
  const artifacts: ArtifactSummary[] = landingPage
    ? (landingPage.data as LandingPageData).artifacts
    : [];

  return (
    <Layout
      navigation={siteData.navigation}
      siteName={siteData.config.siteName}
      logo={siteData.config.logo}
    >
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          {siteData.config.siteName}
        </h1>
        <p className="text-text-secondary mb-8">
          Documentation powered by DocSpec
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {artifacts.map((art) => (
            <a
              key={art.slug}
              href={`/${art.slug}`}
              className="block p-6 rounded-xl border border-border hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                {art.color && (
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: art.color }}
                  />
                )}
                <h2 className="text-lg font-semibold text-text-primary group-hover:text-primary-600">
                  {art.label}
                </h2>
              </div>
              {art.description && (
                <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                  {art.description}
                </p>
              )}
              <div className="flex gap-4 text-xs text-text-tertiary">
                <span>{art.moduleCount} modules</span>
                <span>{art.memberCount} classes</span>
                {art.endpointCount > 0 && (
                  <span>{art.endpointCount} endpoints</span>
                )}
                {art.coveragePercent !== undefined && (
                  <span>{art.coveragePercent}% coverage</span>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </Layout>
  );
}
