import { gunzipSync } from "node:zlib";

import type { ArtifactEntry, RepositoryConfig } from "../types/config.js";
import type { DocSpec } from "../types/docspec.js";
import type { ResolvedArtifact } from "./types.js";
import { SpecCache } from "./cache.js";

/** Default npm registry used when no custom registry is configured. */
const NPM_REGISTRY = "https://registry.npmjs.org";

/**
 * Resolve a DocSpec artifact from an npm registry.
 *
 * The resolver:
 * 1. Fetches package metadata from the registry to locate the tarball URL.
 * 2. Downloads the tarball (`.tgz`).
 * 3. Extracts `docspec.json` from the package root inside the tarball.
 *
 * @param entry        - Artifact configuration entry (must have `scope` and/or `package` set).
 * @param repositories - Named repository configurations from docspec.config.yaml.
 * @param cache        - Shared disk cache for resolved specs.
 * @returns A fully resolved artifact ready for consumption by the site.
 */
export async function resolveNpm(
  entry: ArtifactEntry,
  repositories: Record<string, RepositoryConfig>,
  cache: SpecCache,
): Promise<ResolvedArtifact> {
  const packageName = buildPackageName(entry);

  // ── repository selection ──────────────────────────────────────────
  const repoConfig = resolveRepositoryConfig(entry, repositories);
  const registryUrl = (repoConfig?.url ?? NPM_REGISTRY).replace(/\/+$/, "");
  const headers = buildAuthHeaders(repoConfig);

  // ── version resolution ────────────────────────────────────────────
  const version = entry.version ?? "latest";

  // ── cache check ───────────────────────────────────────────────────
  // For "latest" we still check the cache but the key will change when
  // the version bumps on the registry.  A cache miss is expected the
  // first time after a new version is published.
  const cacheKey = `npm-${packageName}-${version}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return toArtifact(entry, cached, packageName, version);
  }

  // ── fetch package metadata ────────────────────────────────────────
  const metadataUrl = `${registryUrl}/${encodeScopedName(packageName)}/${version}`;
  const metadata = await fetchJson<NpmVersionMetadata>(
    metadataUrl,
    headers,
    `package metadata for ${packageName}@${version}`,
  );

  const resolvedVersion = metadata.version ?? version;
  const tarballUrl = metadata.dist?.tarball;

  if (!tarballUrl) {
    throw new Error(
      `[docspec] npm metadata for "${packageName}@${version}" does not contain a tarball URL.`,
    );
  }

  // Check the cache again with the resolved version (in case the
  // original request used "latest" and we now know the real version).
  if (resolvedVersion !== version) {
    const resolvedCacheKey = `npm-${packageName}-${resolvedVersion}`;
    const resolvedCached = cache.get(resolvedCacheKey);
    if (resolvedCached) {
      return toArtifact(entry, resolvedCached, packageName, resolvedVersion);
    }
  }

  // ── download & extract tarball ────────────────────────────────────
  const tarballBytes = await fetchBinary(tarballUrl, headers);
  const spec = extractDocspecFromTarball(tarballBytes, packageName);

  // Store under the concrete version so subsequent lookups hit the cache.
  const storageKey = `npm-${packageName}-${resolvedVersion}`;
  cache.set(storageKey, spec);

  return toArtifact(entry, spec, packageName, resolvedVersion);
}

// ── types ───────────────────────────────────────────────────────────

/** Minimal shape of the npm registry version-specific metadata response. */
interface NpmVersionMetadata {
  version?: string;
  dist?: {
    tarball?: string;
    shasum?: string;
    integrity?: string;
  };
}

// ── internal helpers ────────────────────────────────────────────────

/**
 * Build the full npm package name from the entry's `scope` and `package`
 * fields.  Scoped packages follow the `@scope/package` convention.
 */
function buildPackageName(entry: ArtifactEntry): string {
  if (!entry.package && !entry.scope) {
    throw new Error(
      "resolveNpm requires at least entry.package or entry.scope to be set",
    );
  }

  const pkg = entry.package;
  const scope = entry.scope;

  if (scope && pkg) {
    // Normalise: accept both "@scope" and "scope" in config.
    const normalizedScope = scope.startsWith("@") ? scope : `@${scope}`;
    return `${normalizedScope}/${pkg}`;
  }

  if (pkg) {
    return pkg;
  }

  // scope-only doesn't make sense as a package identifier.
  throw new Error(
    `[docspec] npm entry has scope="${scope}" but no package name. ` +
      "Please provide a package name.",
  );
}

/**
 * URL-encode a scoped package name for use in registry URLs.
 *
 * npm registries accept `@scope%2Fpackage` in the URL path rather than
 * `@scope/package` (which would be interpreted as two path segments).
 */
function encodeScopedName(name: string): string {
  if (name.startsWith("@")) {
    return `@${encodeURIComponent(name.slice(1))}`;
  }
  return encodeURIComponent(name);
}

/**
 * Find the {@link RepositoryConfig} referenced by an entry.
 *
 * Falls back to the first repository whose `type` is `"npm"` when the
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
    if (cfg.type === "npm") {
      return cfg;
    }
  }

  return undefined;
}

/**
 * Build HTTP headers for npm registry authentication.
 *
 * npm registries typically accept a Bearer token passed via the
 * `Authorization` header.
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
          "[docspec] npm repository auth type is 'bearer' but no token was provided.",
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
        `[docspec] npm auth type "${auth.type}" is not yet supported. Proceeding without authentication.`,
      );
      return {};
    }
  }
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
        "Check your npm registry credentials in docspec.config.yaml.",
    );
  }

  if (res.status === 404) {
    throw new Error(
      `[docspec] Package not found (HTTP 404) at "${url}". ` +
        "Verify the package name and version are correct.",
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
    res = await fetch(url, { headers });
  } catch (err) {
    throw new Error(
      `[docspec] Network error downloading tarball from "${url}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (!res.ok) {
    throw new Error(
      `[docspec] HTTP ${res.status} ${res.statusText} downloading tarball from "${url}".`,
    );
  }

  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

// ── tar extraction ──────────────────────────────────────────────────

/**
 * Extract `docspec.json` from an npm package tarball (`.tgz`).
 *
 * npm tarballs are gzipped tar archives where the package contents live
 * under a `package/` directory.  We look for the entry
 * `package/docspec.json`.
 *
 * This is a minimal tar parser that understands the POSIX ustar format
 * (and the GNU extension for long names) well enough to locate a single
 * file by path.  It avoids pulling in a full tar library.
 */
function extractDocspecFromTarball(
  tgzBytes: Uint8Array,
  packageName: string,
): DocSpec {
  // Decompress gzip layer.
  let tarBytes: Buffer;
  try {
    tarBytes = gunzipSync(Buffer.from(tgzBytes));
  } catch (err) {
    throw new Error(
      `[docspec] Failed to decompress tarball for "${packageName}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  // Parse tar entries looking for docspec.json.
  const targetPaths = [
    "package/docspec.json",
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
          `[docspec] Found docspec.json in tarball for "${packageName}" but failed to parse it: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    // Advance to the next entry (header + data, data padded to 512-byte boundary).
    offset += 512 + alignTo512(fileSize);
  }

  throw new Error(
    `[docspec] No docspec.json found in the npm tarball for "${packageName}". ` +
      "Ensure the package includes a docspec.json at its root.",
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
  packageName: string,
  version: string,
): ResolvedArtifact {
  const label =
    entry.label ?? spec.project?.name ?? `${packageName}@${version}`;

  return {
    label,
    color: entry.color,
    source: "npm",
    spec,
  };
}
