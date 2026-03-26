import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";

import type { ArtifactEntry, RepositoryConfig } from "../types/config.js";
import type { DocSpec } from "../types/docspec.js";
import type { ResolvedArtifact } from "./types.js";
import { SpecCache } from "./cache.js";

/** Maven Central base URL used when no custom repository is configured. */
const MAVEN_CENTRAL = "https://repo1.maven.org/maven2";

/**
 * Resolve a DocSpec artifact from a Maven repository.
 *
 * The resolver constructs a standard Maven repository URL:
 * ```
 * {repoUrl}/{groupId/as/path}/{artifactId}/{version}/{artifactId}-{version}-docspec.json
 * ```
 *
 * When `version` is `"LATEST"` or omitted the resolver first fetches
 * `maven-metadata.xml` from the artifact directory to determine the
 * most recent release (or snapshot) version.
 *
 * @param entry        - Artifact configuration entry (must have `groupId` set).
 * @param repositories - Named repository configurations from docspec.config.yaml.
 * @param cache        - Shared disk cache for resolved specs.
 * @returns A fully resolved artifact ready for consumption by the site.
 */
export async function resolveMaven(
  entry: ArtifactEntry,
  repositories: Record<string, RepositoryConfig>,
  cache: SpecCache,
): Promise<ResolvedArtifact> {
  if (!entry.groupId) {
    throw new Error("resolveMaven requires entry.groupId to be set");
  }
  if (!entry.artifactId) {
    throw new Error(
      `resolveMaven requires entry.artifactId for groupId="${entry.groupId}"`,
    );
  }

  // ── repository selection ──────────────────────────────────────────
  const repoConfig = resolveRepositoryConfig(entry, repositories);
  const repoUrl = (repoConfig?.url ?? MAVEN_CENTRAL).replace(/\/+$/, "");
  const headers = await buildAuthHeaders(repoConfig);

  // ── version resolution ────────────────────────────────────────────
  const groupPath = entry.groupId.replace(/\./g, "/");
  const version = await resolveVersion(
    entry.version,
    repoUrl,
    groupPath,
    entry.artifactId,
    headers,
  );

  // ── cache check ───────────────────────────────────────────────────
  const cacheKey = `maven-${entry.groupId}-${entry.artifactId}-${version}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return toArtifact(entry, cached, version);
  }

  // ── fetch docspec.json ────────────────────────────────────────────
  const artifactUrl =
    `${repoUrl}/${groupPath}/${entry.artifactId}/${version}` +
    `/${entry.artifactId}-${version}-docspec.json`;

  const spec = await fetchJson<DocSpec>(artifactUrl, headers, "docspec.json");

  cache.set(cacheKey, spec);

  return toArtifact(entry, spec, version);
}

// ── internal helpers ────────────────────────────────────────────────

/**
 * Find the {@link RepositoryConfig} referenced by an entry.
 *
 * Falls back to the first repository whose `type` is `"maven"` when the
 * entry does not explicitly reference a repository by name.  Returns
 * `undefined` when no matching repository exists (Maven Central will be
 * used as the default).
 */
function resolveRepositoryConfig(
  entry: ArtifactEntry,
  repositories: Record<string, RepositoryConfig>,
): RepositoryConfig | undefined {
  if (entry.repository && repositories[entry.repository]) {
    return repositories[entry.repository];
  }

  // Implicit lookup: pick the first repository typed as "maven".
  for (const cfg of Object.values(repositories)) {
    if (cfg.type === "maven") {
      return cfg;
    }
  }

  return undefined;
}

/**
 * Build HTTP headers required for repository authentication.
 *
 * Supported `auth.type` values:
 * - `"bearer"` -- `Authorization: Bearer <token>`
 * - `"basic"`  -- `Authorization: Basic <base64(username:password)>`
 * - `"file"`   -- reads a token from `auth.keyFile` and sends it as a Bearer token
 * - `"none"` / `undefined` -- no auth headers
 */
async function buildAuthHeaders(
  config: RepositoryConfig | undefined,
): Promise<Record<string, string>> {
  if (!config?.auth || config.auth.type === "none") {
    return {};
  }

  const auth = config.auth;

  switch (auth.type) {
    case "bearer": {
      if (!auth.token) {
        throw new Error(
          "[docspec] Maven repository auth type is 'bearer' but no token was provided.",
        );
      }
      return { Authorization: `Bearer ${auth.token}` };
    }

    case "basic": {
      const username = auth.username ?? "";
      const password = auth.password ?? auth.pat ?? "";
      const encoded = Buffer.from(`${username}:${password}`).toString(
        "base64",
      );
      return { Authorization: `Basic ${encoded}` };
    }

    case "file": {
      if (!auth.keyFile) {
        throw new Error(
          "[docspec] Maven repository auth type is 'file' but no keyFile was provided.",
        );
      }
      const filePath = resolvePath(auth.keyFile);
      let token: string;
      try {
        token = (await readFile(filePath, "utf-8")).trim();
      } catch (err) {
        throw new Error(
          `[docspec] Failed to read auth keyFile "${filePath}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      return { Authorization: `Bearer ${token}` };
    }

    default: {
      // aws, gcp, azure -- not yet implemented for Maven.
      console.warn(
        `[docspec] Maven auth type "${auth.type}" is not yet supported. Proceeding without authentication.`,
      );
      return {};
    }
  }
}

/**
 * Resolve the concrete version to fetch.
 *
 * When the caller passes `"LATEST"`, an empty string, or `undefined` the
 * resolver fetches `maven-metadata.xml` and reads the `<release>` (preferred)
 * or `<latest>` version from the metadata.
 */
async function resolveVersion(
  requestedVersion: string | undefined,
  repoUrl: string,
  groupPath: string,
  artifactId: string,
  headers: Record<string, string>,
): Promise<string> {
  if (
    requestedVersion &&
    requestedVersion.toUpperCase() !== "LATEST"
  ) {
    return requestedVersion;
  }

  const metadataUrl = `${repoUrl}/${groupPath}/${artifactId}/maven-metadata.xml`;

  let xml: string;
  try {
    const res = await fetch(metadataUrl, { headers });

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status} ${res.statusText}`,
      );
    }

    xml = await res.text();
  } catch (err) {
    throw new Error(
      `[docspec] Failed to fetch maven-metadata.xml from "${metadataUrl}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  // Try <release> first, then <latest>, then the last <version> entry.
  const release = extractXmlElement(xml, "release");
  if (release) return release;

  const latest = extractXmlElement(xml, "latest");
  if (latest) return latest;

  // Fall back to the last <version> listed inside <versions>.
  const versionEntries = xml.match(/<version>([^<]+)<\/version>/g);
  if (versionEntries && versionEntries.length > 0) {
    const last = versionEntries[versionEntries.length - 1];
    const m = /<version>([^<]+)<\/version>/.exec(last);
    if (m) return m[1].trim();
  }

  throw new Error(
    `[docspec] Unable to determine latest version from "${metadataUrl}". ` +
      "Please specify an explicit version in your artifact entry.",
  );
}

/**
 * Fetch a JSON resource from a URL and parse it.
 *
 * @param url     - The URL to fetch.
 * @param headers - Optional HTTP headers (e.g. auth).
 * @param label   - Human-readable label used in error messages.
 */
async function fetchJson<T>(
  url: string,
  headers: Record<string, string>,
  label: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    throw new Error(
      `[docspec] Network error fetching ${label} from "${url}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `[docspec] Authentication failed (HTTP ${res.status}) when fetching "${url}". ` +
        "Check your repository credentials in docspec.config.yaml.",
    );
  }

  if (res.status === 404) {
    throw new Error(
      `[docspec] Artifact not found (HTTP 404) at "${url}". ` +
        "Verify groupId, artifactId, and version are correct and that the " +
        "artifact publishes a docspec.json classifier.",
    );
  }

  if (!res.ok) {
    throw new Error(
      `[docspec] HTTP ${res.status} ${res.statusText} when fetching "${url}".`,
    );
  }

  let body: T;
  try {
    body = (await res.json()) as T;
  } catch (err) {
    throw new Error(
      `[docspec] Failed to parse JSON response from "${url}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  return body;
}

/**
 * Extract the text content of a simple XML element (single-line).
 */
function extractXmlElement(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([^<]+)</${tag}>`);
  const m = re.exec(xml);
  return m ? m[1].trim() : undefined;
}

/**
 * Build the final {@link ResolvedArtifact} from the fetched spec.
 */
function toArtifact(
  entry: ArtifactEntry,
  spec: DocSpec,
  version: string,
): ResolvedArtifact {
  const label =
    entry.label ??
    spec.project?.name ??
    `${entry.groupId}:${entry.artifactId}@${version}`;

  return {
    label,
    color: entry.color,
    source: "maven",
    spec,
  };
}
