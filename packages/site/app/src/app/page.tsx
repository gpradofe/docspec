import React from "react";
import { loadSiteData } from "../lib/load-site-data";
import { ClientApp } from "../lib/client-app";

export default async function HomePage() {
  const siteData = await loadSiteData();
  return <ClientApp siteData={siteData} />;
}
