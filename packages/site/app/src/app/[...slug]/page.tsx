import React from "react";
import { loadSiteData } from "../../lib/load-site-data";
import { ClientApp } from "../../lib/client-app";

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

  return <ClientApp siteData={siteData} initialSlug={slugPath} />;
}
