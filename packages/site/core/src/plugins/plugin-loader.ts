import type { DocSpecPlugin } from "./plugin-api.js";

/**
 * Load plugins from configuration.
 */
export async function loadPlugins(pluginConfigs: PluginConfig[]): Promise<DocSpecPlugin[]> {
  const plugins: DocSpecPlugin[] = [];

  for (const config of pluginConfigs) {
    try {
      const mod = await import(config.module);
      const PluginClass = mod.default ?? mod[config.exportName ?? "default"];

      if (typeof PluginClass === "function") {
        const plugin = new PluginClass(config.options ?? {});
        plugins.push(plugin);
      } else if (typeof PluginClass === "object" && PluginClass.name) {
        plugins.push(PluginClass);
      } else {
        console.warn(`Plugin ${config.module} does not export a valid plugin.`);
      }
    } catch (err) {
      console.error(`Failed to load plugin ${config.module}:`, err);
    }
  }

  return plugins;
}

export interface PluginConfig {
  module: string;
  exportName?: string;
  options?: Record<string, unknown>;
}
