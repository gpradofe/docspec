/**
 * Full DocSpec build pipeline.
 * config → resolve → generate → cross-link → SiteData
 */

import path from "node:path";
import { loadConfig } from "./config/loader.js";
import { resolveArtifacts } from "./resolver/index.js";
import { generatePages } from "./generator/index.js";
import { crossLink } from "./cross-linker/index.js";
import type { SiteData } from "./types/page.js";
import { DEFAULT_BUILD_CONFIG } from "./config/defaults.js";

export async function buildSite(configPath: string): Promise<SiteData> {
  const configDir = path.dirname(path.resolve(configPath));

  // 1. Load config
  const config = await loadConfig(configPath);

  const cacheDir = config.build?.cacheDir || DEFAULT_BUILD_CONFIG.cacheDir;

  // 2. Resolve artifacts
  const artifacts = await resolveArtifacts(
    config.artifacts || [],
    cacheDir,
    configDir,
    config,
  );

  // 3. Generate pages
  const guidePaths = (config.guides || []).map((g) => ({
    path: g.path,
    label: g.label,
  }));

  const { pages, navigation } = await generatePages(
    artifacts,
    config.navigation,
    guidePaths
  );

  // 4. Cross-link
  const { pages: linkedPages, referenceIndex } = crossLink(pages);

  // 5. Return SiteData
  return {
    pages: linkedPages,
    navigation,
    referenceIndex,
    config: {
      siteName: config.site.name,
      logo: config.site.logo,
      favicon: config.site.favicon,
      baseUrl: config.site.baseUrl,
    },
  };
}
