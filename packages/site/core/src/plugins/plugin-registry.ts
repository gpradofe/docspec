import type { DocSpecPlugin } from "./plugin-api.js";
import type { GeneratedPage, SiteData } from "../types/page.js";
import type { DocSpec } from "../types/docspec.js";

/**
 * Registry that manages plugin lifecycle and hook execution.
 */
export class PluginRegistry {
  private plugins: DocSpecPlugin[] = [];

  async register(plugins: DocSpecPlugin[]): Promise<void> {
    this.plugins = plugins;
    for (const plugin of this.plugins) {
      if (plugin.initialize) {
        await plugin.initialize();
      }
    }
  }

  applySpecResolved(spec: DocSpec): DocSpec {
    let result = spec;
    for (const plugin of this.plugins) {
      if (plugin.onSpecResolved) {
        result = plugin.onSpecResolved(result);
      }
    }
    return result;
  }

  applyPagesGenerated(pages: GeneratedPage[]): GeneratedPage[] {
    let result = pages;
    for (const plugin of this.plugins) {
      if (plugin.onPagesGenerated) {
        result = plugin.onPagesGenerated(result);
      }
      if (plugin.getPages) {
        result = [...result, ...plugin.getPages()];
      }
    }
    return result;
  }

  applySiteDataAssembled(siteData: SiteData): SiteData {
    let result = siteData;
    for (const plugin of this.plugins) {
      if (plugin.onSiteDataAssembled) {
        result = plugin.onSiteDataAssembled(result);
      }
    }
    return result;
  }

  async applyBuildComplete(outputDir: string): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onBuildComplete) {
        await plugin.onBuildComplete(outputDir);
      }
    }
  }

  getPluginNames(): string[] {
    return this.plugins.map(p => p.name);
  }
}
