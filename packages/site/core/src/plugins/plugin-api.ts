import type { GeneratedPage, SiteData } from "../types/page.js";
import type { DocSpec } from "../types/docspec.js";

/**
 * DocSpec plugin interface. Plugins can hook into the build pipeline
 * to add pages, modify data, or inject custom functionality.
 */
export interface DocSpecPlugin {
  /** Unique plugin name. */
  name: string;
  /** Plugin version. */
  version?: string;

  /** Called once when the plugin is loaded. */
  initialize?(): Promise<void>;

  /** Called after specs are resolved, before page generation. */
  onSpecResolved?(spec: DocSpec): DocSpec;

  /** Called after pages are generated, before writing. */
  onPagesGenerated?(pages: GeneratedPage[]): GeneratedPage[];

  /** Called after the site data is assembled. */
  onSiteDataAssembled?(siteData: SiteData): SiteData;

  /** Called after the build completes. */
  onBuildComplete?(outputDir: string): Promise<void>;

  /** Additional pages this plugin contributes. */
  getPages?(): GeneratedPage[];
}
