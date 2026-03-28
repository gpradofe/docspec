import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ArtifactEntry } from "../types/config.js";
import type { DocSpec } from "../types/docspec.js";
import type { ResolvedArtifact } from "./types.js";

/**
 * Resolve a DocSpec artifact from a local JSON file.
 *
 * @param entry  - Artifact configuration entry (must have `path` set).
 * @param configDir - Directory the config file lives in; paths are resolved relative to it.
 * @returns A fully resolved artifact ready for consumption by the site.
 */
export async function resolveLocal(
  entry: ArtifactEntry,
  configDir: string,
): Promise<ResolvedArtifact> {
  if (!entry.path) {
    throw new Error("resolveLocal requires entry.path to be set");
  }

  const absolutePath = resolve(configDir, entry.path);

  let raw: string;
  try {
    raw = await readFile(absolutePath, "utf-8");
  } catch (err) {
    throw new Error(
      `Failed to read local docspec file at "${absolutePath}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let spec: DocSpec;
  try {
    spec = JSON.parse(raw) as DocSpec;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from "${absolutePath}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const label =
    entry.label ?? spec.project?.name ?? spec.artifact.artifactId;

  return {
    label,
    color: entry.color,
    source: "local",
    path: absolutePath,
    spec,
  };
}
