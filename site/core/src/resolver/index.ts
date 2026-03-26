import type { DocSpecConfig, ArtifactEntry } from "../types/config.js";
import type { ResolvedArtifact } from "./types.js";
import { resolveLocal } from "./local.js";
import { resolveMaven } from "./maven.js";
import { resolveNpm } from "./npm.js";
import { SpecCache } from "./cache.js";

/**
 * Resolve every configured artifact entry into a {@link ResolvedArtifact}.
 *
 * Dispatches each entry to the appropriate resolver based on which
 * identifier fields are present:
 *
 * | Field(s)         | Resolver         |
 * |------------------|------------------|
 * | `path`           | Local filesystem |
 * | `groupId`        | Maven repository |
 * | `scope`/`package`| npm registry     |
 * | `crate`          | crates.io (stub) |
 *
 * @param artifacts - List of artifact entries from docspec.config.yaml.
 * @param cacheDir  - Directory used for disk caching of remote artifacts.
 * @param configDir - Directory the config file lives in (used to resolve relative paths).
 * @param config    - Full site configuration (optional); provides repository definitions.
 * @returns All successfully resolved artifacts.
 */
export async function resolveArtifacts(
  artifacts: ArtifactEntry[],
  cacheDir: string,
  configDir: string,
  config?: DocSpecConfig,
): Promise<ResolvedArtifact[]> {
  const resolved: ResolvedArtifact[] = [];
  const cache = new SpecCache(cacheDir);
  const repositories = config?.repositories ?? {};

  for (const entry of artifacts) {
    if (entry.path) {
      resolved.push(await resolveLocal(entry, configDir));
    } else if (entry.groupId) {
      resolved.push(await resolveMaven(entry, repositories, cache));
    } else if (entry.scope || entry.package) {
      resolved.push(await resolveNpm(entry, repositories, cache));
    } else if (entry.crate) {
      console.warn(
        `[docspec] Crates resolution not yet implemented (crate="${entry.crate}").`,
      );
    } else {
      console.warn(
        "[docspec] Artifact entry has no recognised source (path, groupId, scope/package, or crate). Skipping.",
      );
    }
  }

  return resolved;
}

export type { ResolvedArtifact } from "./types.js";
