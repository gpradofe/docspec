import { gunzipSync } from "node:zlib";

import type { ArtifactEntry, RepositoryConfig } from "../types/config.js";
import type { DocSpec } from "../types/docspec.js";
import type { ResolvedArtifact } from "./types.js";
import { SpecCache } from "./cache.js";

/** Default crates.io API base URL. */
const CRATES_IO = "https://crates.io/api/v1/crates";

/**
 * Resolve a DocSpec artifact from a crates.io-compatible registry.
 *
 * The resolver:
 * 1. Fetches crate metadata from the registry to determine the download URL
 *    and resolve `"latest"` to a concrete version.
 * 2. Downloads the `.crate` file (a gzipped tar archive).
 * 3. Extracts `docspec.json` from the crate root inside the archive.
 *
 * @param entry        - Artifact configuration entry (must have `crate` set).
 * @param repositories - Named repository configurations from docspec.config.yaml.
 * @param cache        - Shared disk cache for resolved specs.
 * @returns A fully resolved artifact ready for consumption by the site.
 */
export async function resolveCrates(
  entry: ArtifactEntry,
  repositories: Record<string, RepositoryConfig>,
  cache: SpecCache,
): Promise<ResolvedArtifact> {
  if (!entry.crate) {
    throw new Error("resolveCrates requires entry.crate to be set");
  }

  const crateName = entry.crate;

  // ── repository selection ──────────────────────────────────────────
  const repoConfig = resolveRepositoryConfig(entry, repositories);
  const registryUrl = (repoConfig?.url ?? CRATES_IO).replace(/\/+$/, "");
  const headers = buildAuthHeaders(repoConfig);

  // crates.io requires a User-Agent header for all API requests.
  headers["User-Agent"] = headers["User-Agent"] ?? "docspec-resolver/3.0.0";

  // ── version resolution ────────────────────────────────────────────
  const requestedVersion = entry.version ?? "latest";

  // ── cache check ───────────────────────────────────────────────────
  const cacheKey = `crates-${crateName}-${requestedVersion}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return toArtifact(entry, cached, crateName, requestedVersion);
  }

  // ── fetch crate metadata ──────────────────────────────────────────
  const version = await resolveVersion(
    requestedVersion,
    registryUrl,
    crateName,
    headers,
  );

  // Check the cache again with the resolved version (in case the
  // original request used "latest" and we now know the real version).
  if (version !== requestedVersion) {
    const resolvedCacheKey = `crates-${crateName}-${version}`;
    const resolvedCached = cache.get(resolvedCacheKey);
    if (resolvedCached) {
      return toArtifact(entry, resolvedCached, crateName, version);
    }
  }

  // ── download & extract .crate ─────────────────────────────────────
  const downloadUrl = `${registryUrl}/${crateName}/${version}/download`;
  const crateBytes = await fetchBinary(downloadUrl, headers);
  const spec = extractDocspecFromCrate(crateBytes, crateName, version);

  // Store under the concrete version so subsequent lookups hit the cache.
  const storageKey = `crates-${crateName}-${version}`;
  cache.set(storageKey, spec);

  return toArtifact(entry, spec, crateName, version);
}

// ── types ───────────────────────────────────────────────────────────

/** Minimal shape of the crates.io crate metadata response. */
interface CrateMetadata {
  crate?: {
    max_version?: string;
    max_stable_version?: string;
  };
  versions?: Array<{
    num: string;
    yanked: boolean;
    dl_path?: string;
  }>;
}

/** Minimal shape of a single crate version response. */
interface CrateVersionResponse {
  version?: {
    num?: string;
    dl_path?: string;
    yanked?: boolean;
  };
}

// ── internal helpers ────────────────────────────────────────────────

/**
 * Find the {@link RepositoryConfig} referenced by an entry.
 *
 * Falls back to the first repository whose `type` is `"crates"` when the
 * entry does not explicitly reference a repository by name.
 */
function resolveRepositoryConfig(
  entry: ArtifactEntry,
  repositories: Record<string, RepositoryConfig>,
): RepositoryConfig | undefined {
  if (entry.repository && repositories[entry.repository]) {
    return repositories[entry.repository];
  }

  for (const cfg of Object.values(repositories)) {
    if (cfg.type === "crates") {
      return cfg;
    }
  }

  return undefined;
}

/**
 * Build HTTP headers for crates.io registry authentication.
 *
 * crates.io itself does not require auth for public crates, but
 * private registries (e.g. Cloudsmith, Artifactory) may require
 * a Bearer or Basic token.
 */
function buildAuthHeaders(
  config: RepositoryConfig | undefined,
): Record<string, string> {
  if (!config?.auth || config.auth.type === "none") {
    return {};
  }

  const auth = config.auth;

  switch (auth.type) {
    case "bearer": {
      if (!auth.token) {
        throw new Error(
          "[docspec] Crates registry auth type is 'bearer' but no token was provided.",
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

    default: {
      console.warn(
        `[docspec] Crates auth type "${auth.type}" is not yet supported. Proceeding without authentication.`,
      );
      return {};
    }
  }
}

/**
 * Resolve the concrete version to fetch.
 *
 * When the caller passes `"latest"`, an empty string, or `undefined` the
 * resolver fetches the crate metadata and uses `max_stable_version`
 * (preferred) or `max_version`.
 */
async function resolveVersion(
  requestedVersion: string,
  registryUrl: string,
  crateName: string,
  headers: Record<string, string>,
): Promise<string> {
  if (requestedVersion && requestedVersion.toLowerCase() !== "latest") {
    return requestedVersion;
  }

  // Fetch top-level crate metadata to determine the latest version.
  const metadataUrl = `${registryUrl}/${crateName}`;
  const metadata = await fetchJson<CrateMetadata>(
    metadataUrl,
    headers,
    `crate metadata for ${crateName}`,
  );

  const version =
    metadata.crate?.max_stable_version ?? metadata.crate?.max_version;

  if (!version) {
    throw new Error(
      `[docspec] Unable to determine latest version for crate "${crateName}". ` +
        "Please specify an explicit version in your artifact entry.",
    );
  }

  return version;
}

/**
 * Fetch a JSON resource and return the parsed body.
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
        "Check your crates registry credentials in docspec.config.yaml.",
    );
  }

  if (res.status === 404) {
    throw new Error(
      `[docspec] Crate not found (HTTP 404) at "${url}". ` +
        "Verify the crate name and version are correct.",
    );
  }

  if (!res.ok) {
    throw new Error(
      `[docspec] HTTP ${res.status} ${res.statusText} when fetching "${url}".`,
    );
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new Error(
      `[docspec] Failed to parse JSON from "${url}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/**
 * Fetch a binary resource and return it as a `Uint8Array`.
 */
async function fetchBinary(
  url: string,
  headers: Record<string, string>,
): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(url, { headers, redirect: "follow" });
  } catch (err) {
    throw new Error(
      `[docspec] Network error downloading crate from "${url}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (!res.ok) {
    throw new Error(
      `[docspec] HTTP ${res.status} ${res.statusText} downloading crate from "${url}".`,
    );
  }

  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

// ── tar extraction ──────────────────────────────────────────────────

/**
 * Extract `docspec.json` from a `.crate` file (gzipped tar archive).
 *
 * Crate archives contain a top-level directory named
 * `{crate}-{version}/`.  We look for `docspec.json` at both
 * `{crate}-{version}/docspec.json` and `docspec.json`.
 *
 * This is a minimal tar parser that understands the POSIX ustar format
 * (and the GNU extension for long names) well enough to locate a single
 * file by path.  It avoids pulling in a full tar library.
 */
function extractDocspecFromCrate(
  crateBytes: Uint8Array,
  crateName: string,
  version: string,
): DocSpec {
  // Decompress gzip layer.
  let tarBytes: Buffer;
  try {
    tarBytes = gunzipSync(Buffer.from(crateBytes));
  } catch (err) {
    throw new Error(
      `[docspec] Failed to decompress .crate file for "${crateName}@${version}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  // Parse tar entries looking for docspec.json.
  const targetPaths = [
    `${crateName}-${version}/docspec.json`,
    "docspec.json",
  ];

  let offset = 0;
  let longName: string | undefined;

  while (offset < tarBytes.length - 512) {
    // Each tar entry starts with a 512-byte header.
    const header = tarBytes.subarray(offset, offset + 512);

    // An all-zero header signals the end of the archive.
    if (isZeroBlock(header)) {
      break;
    }

    // Read the file name from the header (bytes 0-99).
    let name = readString(header, 0, 100);

    // Check for POSIX ustar prefix (bytes 345-499).
    const prefix = readString(header, 345, 155);
    if (prefix) {
      name = `${prefix}/${name}`;
    }

    // GNU long name extension: the previous entry was a long-name
    // marker, so the real name is stored in the data block.
    if (longName) {
      name = longName;
      longName = undefined;
    }

    // Read file size from the header (octal, bytes 124-135).
    const sizeStr = readString(header, 124, 12);
    const fileSize = parseInt(sizeStr, 8) || 0;

    // Read the type flag (byte 156).
    const typeFlag = String.fromCharCode(header[156]);

    // GNU long name marker (type 'L').
    if (typeFlag === "L") {
      const dataStart = offset + 512;
      longName = readString(tarBytes, dataStart, fileSize).replace(
        /\0+$/,
        "",
      );
      offset += 512 + alignTo512(fileSize);
      continue;
    }

    const dataStart = offset + 512;

    // Check if this is the file we're looking for (regular file entry
    // whose path matches one of the expected locations).
    if (
      (typeFlag === "0" || typeFlag === "\0") &&
      targetPaths.includes(name)
    ) {
      const fileData = tarBytes.subarray(dataStart, dataStart + fileSize);
      const jsonStr = new TextDecoder().decode(fileData);

      try {
        return JSON.parse(jsonStr) as DocSpec;
      } catch (err) {
        throw new Error(
          `[docspec] Found docspec.json in crate "${crateName}@${version}" but failed to parse it: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    // Advance to the next entry (header + data, data padded to 512-byte boundary).
    offset += 512 + alignTo512(fileSize);
  }

  throw new Error(
    `[docspec] No docspec.json found in crate "${crateName}@${version}". ` +
      "Ensure the crate includes a docspec.json at its root.",
  );
}

/** Check whether a 512-byte block is entirely zero (end-of-archive marker). */
function isZeroBlock(block: Uint8Array): boolean {
  for (let i = 0; i < block.length; i++) {
    if (block[i] !== 0) return false;
  }
  return true;
}

/** Read a null-terminated ASCII string from a buffer region. */
function readString(
  buf: Uint8Array,
  offset: number,
  length: number,
): string {
  const end = Math.min(offset + length, buf.length);
  const bytes: number[] = [];
  for (let i = offset; i < end; i++) {
    if (buf[i] === 0) break;
    bytes.push(buf[i]);
  }
  return String.fromCharCode(...bytes);
}

/** Round a byte length up to the next 512-byte boundary. */
function alignTo512(size: number): number {
  const remainder = size % 512;
  return remainder === 0 ? size : size + (512 - remainder);
}

/**
 * Build the final {@link ResolvedArtifact}.
 */
function toArtifact(
  entry: ArtifactEntry,
  spec: DocSpec,
  crateName: string,
  version: string,
): ResolvedArtifact {
  const label =
    entry.label ?? spec.project?.name ?? `${crateName}@${version}`;

  return {
    label,
    color: entry.color,
    source: "crates",
    spec,
  };
}
