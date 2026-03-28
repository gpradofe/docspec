import React from "react";
import { Layout } from "@docspec/theme-stripe";
import { loadSiteData } from "../../lib/load-site-data";
import { PageRenderer } from "../../lib/page-renderer";
import { PageType } from "@docspec/core";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const siteData = await loadSiteData();

  return siteData.pages
    .filter((p) => p.slug && p.slug !== "/")
    .map((p) => ({
      slug: p.slug.split("/").filter(Boolean),
    }));
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const siteData = await loadSiteData();

  const page = siteData.pages.find(
    (p) => p.slug === slugPath || p.slug === `/${slugPath}`,
  );

  if (!page) {
    return (
      <Layout
        navigation={siteData.navigation}
        siteName={siteData.config.siteName}
        logo={siteData.config.logo}
        currentSlug={slugPath}
      >
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Page Not Found
          </h1>
          <p className="text-text-secondary">
            No page found at /{slugPath}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      navigation={siteData.navigation}
      siteName={siteData.config.siteName}
      logo={siteData.config.logo}
      currentSlug={slugPath}
    >
      <PageRenderer page={page} referenceIndex={siteData.referenceIndex} />
    </Layout>
  );
}
