/**
 * Loads site data from the `.docspec-cache/site-data.json` file.
 * At build time, the CLI pipeline writes this file before running `next build`.
 * At dev time, the CLI re-generates it on config/spec changes.
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { SiteData } from "@docspec/core";

let cachedSiteData: SiteData | null = null;

export async function loadSiteData(): Promise<SiteData> {
  if (cachedSiteData) return cachedSiteData;

  // Look for site-data.json in multiple locations (ordered by priority)
  const candidates = [
    process.env.DOCSPEC_SITE_DATA,
    path.join(process.cwd(), ".docspec-cache", "site-data.json"),
    path.join(process.cwd(), "site-data.json"),
    path.join(process.cwd(), "public", "site-data.json"),
    path.join(process.cwd(), "out", "site-data.json"),
    path.join(process.cwd(), "..", "..", "docspec-docs", ".docspec-cache", "site-data.json"),
    path.join(process.cwd(), "..", "docspec-docs", ".docspec-cache", "site-data.json"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate, "utf-8");
      cachedSiteData = JSON.parse(raw) as SiteData;
      console.log(`[docspec] Loaded site data from ${candidate}`);
      return cachedSiteData;
    } catch {
      // Try next candidate
    }
  }

  console.warn(
    "[docspec] No site-data.json found. Searched:\n" +
      candidates.map((c) => `  - ${c}`).join("\n"),
  );

  // Return empty site data if nothing found
  return {
    pages: [],
    navigation: { sections: [] },
    referenceIndex: {},
    config: { siteName: "DocSpec" },
  };
}
