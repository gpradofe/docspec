// @docspec:module {
//   id: "docspec-ts-plugin-config",
//   name: "Plugin Configuration Loader",
//   description: "Loads DocSpec TypeScript plugin configuration from docspec.config.yaml (with simple YAML key:value parsing) and package.json defaults. CLI flags --config and --output override file-based values.",
//   since: "3.0.0"
// }

import * as fs from "node:fs";
import * as path from "node:path";

export interface DocSpecTSConfig {
  tsConfigPath?: string;
  include?: string[];
  exclude?: string[];
  outputDir?: string;
  groupId?: string;
  artifactId?: string;
  version?: string;
}

export async function loadConfig(): Promise<DocSpecTSConfig> {
  // Check for --config flag
  const args = process.argv.slice(2);
  const configIdx = args.indexOf("--config");
  const configPath = configIdx >= 0 ? args[configIdx + 1] : "docspec.config.yaml";

  // Check for --output flag
  const outputIdx = args.indexOf("--output");
  const outputDir = outputIdx >= 0 ? args[outputIdx + 1] : undefined;

  // Try to load config file
  const config: DocSpecTSConfig = {};

  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, "utf-8");
      // Simple YAML parsing for key: value pairs
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed.includes(":")) continue;
        const [key, ...rest] = trimmed.split(":");
        const value = rest.join(":").trim();
        if (key.trim() === "tsConfigPath") config.tsConfigPath = value;
        else if (key.trim() === "outputDir") config.outputDir = value;
        else if (key.trim() === "groupId") config.groupId = value;
        else if (key.trim() === "artifactId") config.artifactId = value;
        else if (key.trim() === "version") config.version = value;
      }
    } catch {
      // Config file unreadable, use defaults
    }
  }

  // CLI flags override config file
  if (outputDir) config.outputDir = outputDir;

  // Read package.json for defaults
  const pkgPath = path.join(process.cwd(), "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (!config.artifactId) config.artifactId = pkg.name;
      if (!config.version) config.version = pkg.version;
    } catch {
      // package.json unreadable
    }
  }

  return config;
}
