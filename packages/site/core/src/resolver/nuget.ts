import { inflateRawSync } from "node:zlib";

import type { ArtifactEntry, RepositoryConfig } from "../types/config.js";
import type { DocSpec } from "../types/docspec.js";
import type { ResolvedArtifact } from "./types.js";
import { SpecCache } from "./cache.js";

/** Default NuGet V3 service index URL. */
const NUGET_INDEX = "https://api.nuget.org/v3/index.json";

/**
 * Resolve a DocSpec artifact from a NuGet-compatible package feed.
 *
 * The resolver:
 * 1. Fetches the NuGet V3 service index to discover the package-content
 *    (flat container) base URL.
 * 2. Resolves `"latest"` to a concrete version using the package
 *    registration endpoint.
 * 3. Downloads the `.nupkg` (a ZIP archive).
 * 4. Extracts `docspec.json` from the package root inside the archive.
 *
 * `.nupkg` files are standard ZIP archives, parsed inline without
 * external archive libraries.
 *
 * @param entry        - Artifact configuration entry (must have `nugetPackage` set).
 * @param repositories - Named repository configurations from docspec.config.yaml.
 * @param cache        - Shared disk cache for resolved specs.
 * @returns A fully resolved artifact ready for consumption by the site.
 */
export async function resolveNuGet(
  entry: ArtifactEntry,
  repositories: Record<string, RepositoryConfig>,
  cache: SpecCache,
): Promise<ResolvedArtifact> {
  if (!entry.nugetPackage) {
    throw new Error("resolveNuGet requires entry.nugetPackage to be set");
  }

  const packageName = entry.nugetPackage;

  // ── repository selection ──────────────────────────────────────────
  const repoConfig = resolveRepositoryConfig(entry, repositories);
  const serviceIndexUrl = repoConfig?.url ?? NUGET_INDEX;
  const headers = buildAuthHeaders(repoConfig);

  // ── version resolution ────────────────────────────────────────────
  const requestedVersion = entry.version ?? "latest";

  // ── cache check ───────────────────────────────────────────────────
  const cacheKey = `nuget-${packageName}-${requestedVersion}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return toArtifact(entry, cached, packageName, requestedVersion);
  }

  // ── discover service endpoints ────────────────────────────────────
  const serviceIndex = await fetchJson<NuGetServiceIndex>(
    serviceIndexUrl,
    headers,
    "NuGet service index",
  );

  const flatContainerBase = findServiceResource(
    serviceIndex,
    "PackageBaseAddress/3.0.0",
  );
  if (!flatContainerBase) {
    throw new Error(
      "[docspec] NuGet service index does not contain a PackageBaseAddress/3.0.0 resource. " +
        "Ensure the configured NuGet URL points to a valid V3 feed.",
    );
  }
  const baseUrl = flatContainerBase.replace(/\/+$/, "");

  // ── resolve version ───────────────────────────────────────────────
  const version = await resolveVersion(
    requestedVersion,
    baseUrl,
    packageName,
    headers,
  );

  // Check the cache again with the resolved version.
  if (version !== requestedVersion) {
    const resolvedCacheKey = `nuget-${packageName}-${version}`;
    const resolvedCached = cache.get(resolvedCacheKey);
    if (resolvedCached) {
      return toArtifact(entry, resolvedCached, packageName, version);
    }
  }

  // ── download & extract .nupkg ─────────────────────────────────────
  // NuGet flat container URL pattern:
  // {baseUrl}/{lowerId}/{version}/{lowerId}.{version}.nupkg
  const lowerId = packageName.toLowerCase();
  const lowerVersion = version.toLowerCase();
  const nupkgUrl = `${baseUrl}/${lowerId}/${lowerVersion}/${lowerId}.${lowerVersion}.nupkg`;

  const nupkgBytes = await fetchBinary(nupkgUrl, headers);
  const spec = extractDocspecFromNupkg(nupkgBytes, packageName, version);

  // Store under the concrete version so subsequent lookups hit the cache.
  const storageKey = `nuget-${packageName}-${version}`;
  cache.set(storageKey, spec);

  return toArtifact(entry, spec, packageName, version);
}

// ── types ───────────────────────────────────────────────────────────

/** Minimal shape of the NuGet V3 service index. */
interface NuGetServiceIndex {
  resources?: Array<{
    "@id"?: string;
    "@type"?: string;
  }>;
}

/** Minimal shape of the NuGet flat container version index. */
interface NuGetVersionIndex {
  versions?: string[];
}

// ── internal helpers ────────────────────────────────────────────────

/**
 * Find the URL for a given resource type in the NuGet service index.
 */
function findServiceResource(
  index: NuGetServiceIndex,
  resourceType: string,
): string | undefined {
  const resources = index.resources ?? [];
  const resource = resources.find((r) => r["@type"] === resourceType);
  return resource?.["@id"];
}

/**
 * Find the {@link RepositoryConfig} referenced by an entry.
 *
 * Falls back to the first repository whose `type` is `"nuget"` when the
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
    if (cfg.type === "nuget") {
      return cfg;
    }
  }

  return undefined;
}

/**
 * Build HTTP headers for NuGet feed authentication.
 *
 * Azure DevOps feeds use Basic auth; private NuGet servers may accept
 * an API key via the `X-NuGet-ApiKey` header or a Bearer token.
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
          "[docspec] NuGet feed auth type is 'bearer' but no token was provided.",
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
        `[docspec] NuGet auth type "${auth.type}" is not yet supported. Proceeding without authentication.`,
      );
      return {};
    }
  }
}

/**
 * Resolve the concrete version to fetch.
 *
 * When the caller passes `"latest"` the resolver fetches the version
 * index from the flat container and uses the last entry (highest version).
 */
async function resolveVersion(
  requestedVersion: string,
  baseUrl: string,
  packageName: string,
  headers: Record<string, string>,
): Promise<string> {
  if (requestedVersion && requestedVersion.toLowerCase() !== "latest") {
    return requestedVersion;
  }

  const lowerId = packageName.toLowerCase();
  const indexUrl = `${baseUrl}/${lowerId}/index.json`;

  const index = await fetchJson<NuGetVersionIndex>(
    indexUrl,
    headers,
    `NuGet version index for ${packageName}`,
  );

  const versions = index.versions;
  if (!versions || versions.length === 0) {
    throw new Error(
      `[docspec] Unable to determine latest version for NuGet package "${packageName}". ` +
        "Please specify an explicit version in your artifact entry.",
    );
  }

  // The flat container version list is sorted in ascending order;
  // the last entry is the latest.
  return versions[versions.length - 1];
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
        "Check your NuGet feed credentials in docspec.config.yaml.",
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
      `[docspec] Network error downloading .nupkg from "${url}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (!res.ok) {
    throw new Error(
      `[docspec] HTTP ${res.status} ${res.statusText} downloading .nupkg from "${url}".`,
    );
  }

  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

// ── ZIP extraction ──────────────────────────────────────────────────

/**
 * Extract `docspec.json` from a `.nupkg` file (ZIP archive).
 *
 * NuGet packages are ZIP files that contain the library DLLs, metadata,
 * and (when present) a `docspec.json` file.  This is a minimal ZIP
 * parser that reads the End of Central Directory record, walks the
 * Central Directory entries, and extracts the matching file.
 */
function extractDocspecFromNupkg(
  zipBytes: Uint8Array,
  packageName: string,
  version: string,
): DocSpec {
  const buf = Buffer.from(zipBytes);

  // Locate End of Central Directory (EOCD) record.
  // Signature: 0x06054b50.  Search backwards from the end.
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 &&
      buf[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error(
      `[docspec] Invalid .nupkg archive for "${packageName}@${version}": ` +
        "no End of Central Directory record found.",
    );
  }

  // Read EOCD fields.
  const cdEntryCount = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  // Walk central directory entries.
  let pos = cdOffset;
  for (let i = 0; i < cdEntryCount; i++) {
    if (pos + 46 > buf.length) break;

    // Central directory file header signature: 0x02014b50
    if (
      buf[pos] !== 0x50 ||
      buf[pos + 1] !== 0x4b ||
      buf[pos + 2] !== 0x01 ||
      buf[pos + 3] !== 0x02
    ) {
      break;
    }

    const compressionMethod = buf.readUInt16LE(pos + 10);
    const compressedSize = buf.readUInt32LE(pos + 20);
    const uncompressedSize = buf.readUInt32LE(pos + 24);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);

    const entryName = buf.subarray(pos + 46, pos + 46 + nameLen).toString("utf-8");
    pos += 46 + nameLen + extraLen + commentLen;

    // Check if this is docspec.json (at the root or anywhere in the archive).
    const baseName = entryName.split("/").pop()?.split("\\").pop();
    if (baseName !== "docspec.json") continue;

    // Read from the local file header to get the actual data offset.
    const localPos = localHeaderOffset;
    if (localPos + 30 > buf.length) continue;

    const localNameLen = buf.readUInt16LE(localPos + 26);
    const localExtraLen = buf.readUInt16LE(localPos + 28);
    const dataOffset = localPos + 30 + localNameLen + localExtraLen;

    let fileData: Buffer;
    if (compressionMethod === 0) {
      // Stored (no compression).
      fileData = buf.subarray(dataOffset, dataOffset + uncompressedSize);
    } else if (compressionMethod === 8) {
      // Deflated.
      const compressed = buf.subarray(dataOffset, dataOffset + compressedSize);
      fileData = inflateRawSync(compressed);
    } else {
      // Unsupported compression method -- skip this entry.
      continue;
    }

    const jsonStr = fileData.toString("utf-8");
    try {
      return JSON.parse(jsonStr) as DocSpec;
    } catch (err) {
      throw new Error(
        `[docspec] Found docspec.json in .nupkg for "${packageName}@${version}" but failed to parse it: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  throw new Error(
    `[docspec] No docspec.json found in .nupkg for "${packageName}@${version}". ` +
      "Ensure the package includes a docspec.json in its distribution.",
  );
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
    source: "nuget",
    spec,
  };
}
