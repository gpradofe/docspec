import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Represents a single npm registry configuration parsed from `.npmrc`.
 */
export interface NpmRegistry {
  url: string;
  token?: string;
  username?: string;
  password?: string;
}

/**
 * Aggregated configuration parsed from an `.npmrc` file.
 */
export interface NpmrcConfig {
  /** The default registry URL (defaults to `https://registry.npmjs.org/`). */
  defaultRegistry: string;
  /** Per-scope registry overrides, keyed by scope (e.g. `@myorg`). */
  registries: Map<string, NpmRegistry>;
}

/**
 * Parse an `.npmrc` file to extract registry URLs and authentication tokens.
 *
 * Used for authenticating with private npm registries when the resolver
 * needs to fetch packages from scoped registries that require auth.
 *
 * Supports:
 * - `registry=<url>` -- default registry override
 * - `@scope:registry=<url>` -- scoped registry
 * - `//<host>/:_authToken=<token>` -- Bearer token per registry host
 * - `//<host>/:username=<user>` -- Basic auth username per registry host
 * - `//<host>/:_password=<base64>` -- Basic auth password per registry host
 *
 * @param npmrcPath - Absolute path to the `.npmrc` file.
 *   Defaults to `~/.npmrc`.
 * @returns Parsed configuration. Returns defaults (empty registries,
 *   npmjs.org as default) when the file does not exist or cannot be read.
 */
export async function parseNpmrc(npmrcPath?: string): Promise<NpmrcConfig> {
  const filePath = npmrcPath ?? join(homedir(), ".npmrc");

  const config: NpmrcConfig = {
    defaultRegistry: "https://registry.npmjs.org/",
    registries: new Map(),
  };

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    // File doesn't exist or isn't readable -- perfectly normal on machines
    // that haven't configured npm registries.
    return config;
  }

  // First pass: collect registry URLs.
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith(";"));

  for (const line of lines) {
    const eqIndex = line.indexOf("=");
    if (eqIndex < 0) continue;

    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();

    // Default registry override.
    if (key === "registry") {
      config.defaultRegistry = value;
      continue;
    }

    // Scoped registry: @scope:registry=url
    const scopedMatch = key.match(/^(@[^:]+):registry$/);
    if (scopedMatch) {
      const scope = scopedMatch[1];
      const existing = config.registries.get(scope);
      if (existing) {
        existing.url = value;
      } else {
        config.registries.set(scope, { url: value });
      }
      continue;
    }
  }

  // Second pass: attach auth tokens to matching registries.
  for (const line of lines) {
    const eqIndex = line.indexOf("=");
    if (eqIndex < 0) continue;

    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();

    // Auth token: //registry.url/:_authToken=token
    const tokenMatch = key.match(/^\/\/([^/]+(?:\/[^/]+)*)\/:_authToken$/);
    if (tokenMatch) {
      const registryHost = tokenMatch[1];
      applyToMatchingRegistries(config, registryHost, (reg) => {
        reg.token = value;
      });
      continue;
    }

    // Username: //registry.url/:username=user
    const usernameMatch = key.match(/^\/\/([^/]+(?:\/[^/]+)*)\/:username$/);
    if (usernameMatch) {
      const registryHost = usernameMatch[1];
      applyToMatchingRegistries(config, registryHost, (reg) => {
        reg.username = value;
      });
      continue;
    }

    // Password (base64-encoded): //registry.url/:_password=base64
    const passwordMatch = key.match(/^\/\/([^/]+(?:\/[^/]+)*)\/:_password$/);
    if (passwordMatch) {
      const registryHost = passwordMatch[1];
      const decoded = Buffer.from(value, "base64").toString("utf-8");
      applyToMatchingRegistries(config, registryHost, (reg) => {
        reg.password = decoded;
      });
      continue;
    }
  }

  return config;
}

/**
 * Apply a mutation function to every registry in the config whose URL
 * contains the given host string.  Also checks the default registry.
 */
function applyToMatchingRegistries(
  config: NpmrcConfig,
  registryHost: string,
  fn: (registry: NpmRegistry) => void,
): void {
  for (const [, reg] of config.registries) {
    if (reg.url.includes(registryHost)) {
      fn(reg);
    }
  }

  // Also apply to the default registry when it matches.
  if (config.defaultRegistry.includes(registryHost)) {
    // Ensure a "default" entry exists in the registries map.
    let defaultReg = config.registries.get("default");
    if (!defaultReg) {
      defaultReg = { url: config.defaultRegistry };
      config.registries.set("default", defaultReg);
    }
    fn(defaultReg);
  }
}
