import { gunzipSync, inflateRawSync } from "node:zlib";

import type { ArtifactEntry, RepositoryConfig } from "../types/config.js";
import type { DocSpec } from "../types/docspec.js";
import type { ResolvedArtifact } from "./types.js";
import { SpecCache } from "./cache.js";

/** Default PyPI index URL. */
const PYPI_INDEX = "https://pypi.org";

/**
 * Resolve a DocSpec artifact from a PyPI-compatible package index.
 *
 * The resolver:
 * 1. Fetches package metadata from the PyPI JSON API.
 * 2. Locates a wheel (`.whl`, preferred) or sdist (`.tar.gz`) distribution.
 * 3. Downloads and extracts `docspec.json` from the distribution.
 *
 * Wheels are ZIP archives; sdist tarballs are gzipped tar archives.  Both
 * formats are parsed inline without external archive libraries.
 *
 * @param entry        - Artifact configuration entry (must have `pypiPackage` set).
 * @param repositories - Named repository configurations from docspec.config.yaml.
 * @param cache        - Shared disk cache for resolved specs.
 * @returns A fully resolved artifact ready for consumption by the site.
 */
export async function resolvePyPI(
  entry: ArtifactEntry,
  repositories: Record<string, RepositoryConfig>,
  cache: SpecCache,
): Promise<ResolvedArtifact> {
  if (!entry.pypiPackage) {
    throw new Error("resolvePyPI requires entry.pypiPackage to be set");
  }

  const packageName = entry.pypiPackage;

  // ── repository selection ──────────────────────────────────────────
  const repoConfig = resolveRepositoryConfig(entry, repositories);
  const indexUrl = (repoConfig?.url ?? PYPI_INDEX).replace(/\/+$/, "");
  const headers = buildAuthHeaders(repoConfig);

  // ── version resolution ────────────────────────────────────────────
  const requestedVersion = entry.version ?? "latest";

  // ── cache check ───────────────────────────────────────────────────
  const cacheKey = `pypi-${packageName}-${requestedVersion}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return toArtifact(entry, cached, packageName, requestedVersion);
  }

  // ── fetch package metadata ────────────────────────────────────────
  const metadataUrl =
    requestedVersion === "latest"
      ? `${indexUrl}/pypi/${packageName}/json`
      : `${indexUrl}/pypi/${packageName}/${requestedVersion}/json`;

  const metadata = await fetchJson<PyPIMetadata>(
    metadataUrl,
    headers,
    `PyPI metadata for ${packageName}`,
  );

  const resolvedVersion = metadata.info?.version ?? requestedVersion;

  // Check the cache again with the resolved version.
  if (resolvedVersion !== requestedVersion) {
    const resolvedCacheKey = `pypi-${packageName}-${resolvedVersion}`;
    const resolvedCached = cache.get(resolvedCacheKey);
    if (resolvedCached) {
      return toArtifact(entry, resolvedCached, packageName, resolvedVersion);
    }
  }

  // ── find distribution URL ─────────────────────────────────────────
  const urls = metadata.urls ?? [];
  const wheel = urls.find((u) => u.packagetype === "bdist_wheel");
  const sdist = urls.find((u) => u.packagetype === "sdist");
  const dist = wheel ?? sdist;

  if (!dist?.url) {
    throw new Error(
      `[docspec] No downloadable distribution found for "${packageName}@${resolvedVersion}". ` +
        "Ensure the package has been published with a wheel or sdist.",
    );
  }

  // ── download & extract ────────────────────────────────────────────
  const distBytes = await fetchBinary(dist.url, headers);

  let spec: DocSpec;
  if (dist.filename?.endsWith(".whl") || dist.url.split("?")[0].endsWith(".whl")) {
    spec = extractDocspecFromZip(distBytes, packageName, resolvedVersion);
  } else {
    spec = extractDocspecFromTarball(distBytes, packageName, resolvedVersion);
  }

  // Store under the concrete version so subsequent lookups hit the cache.
  const storageKey = `pypi-${packageName}-${resolvedVersion}`;
  cache.set(storageKey, spec);

  return toArtifact(entry, spec, packageName, resolvedVersion);
}

// ── types ───────────────────────────────────────────────────────────

/** Minimal shape of the PyPI JSON API response. */
interface PyPIMetadata {
  info?: {
    name?: string;
    version?: string;
  };
  urls?: Array<{
    packagetype?: string;
    url: string;
    filename?: string;
  }>;
}

// ── internal helpers ────────────────────────────────────────────────

/**
 * Find the {@link RepositoryConfig} referenced by an entry.
 *
 * Falls back to the first repository whose `type` is `"pypi"` when the
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
    if (cfg.type === "pypi") {
      return cfg;
    }
  }

  return undefined;
}

/**
 * Build HTTP headers for PyPI authentication.
 *
 * Private PyPI registries (Artifactory, Gemfury, etc.) typically accept
 * a Bearer token or Basic credentials.
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
          "[docspec] PyPI registry auth type is 'bearer' but no token was provided.",
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
        `[docspec] PyPI auth type "${auth.type}" is not yet supported. Proceeding without authentication.`,
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
        "Check your PyPI registry credentials in docspec.config.yaml.",
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
      `[docspec] Network error downloading distribution from "${url}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (!res.ok) {
    throw new Error(
      `[docspec] HTTP ${res.status} ${res.statusText} downloading distribution from "${url}".`,
    );
  }

  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

// ── tar extraction (for sdist .tar.gz) ──────────────────────────────

/**
 * Extract `docspec.json` from an sdist tarball (`.tar.gz`).
 *
 * Sdist tarballs typically contain a top-level directory named
 * `{package}-{version}/`.  We look for `docspec.json` at both
 * `{package}-{version}/docspec.json` and `docspec.json`.
 */
function extractDocspecFromTarball(
  tgzBytes: Uint8Array,
  packageName: string,
  version: string,
): DocSpec {
  let tarBytes: Buffer;
  try {
    tarBytes = gunzipSync(Buffer.from(tgzBytes));
  } catch (err) {
    throw new Error(
      `[docspec] Failed to decompress sdist for "${packageName}@${version}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  // Normalise the package name: PyPI uses hyphens in archive names.
  const normalisedName = packageName.replace(/_/g, "-");
  const targetPaths = [
    `${normalisedName}-${version}/docspec.json`,
    `${packageName}-${version}/docspec.json`,
    "docspec.json",
  ];

  let offset = 0;
  let longName: string | undefined;

  while (offset < tarBytes.length - 512) {
    const header = tarBytes.subarray(offset, offset + 512);

    if (isZeroBlock(header)) {
      break;
    }

    let name = readString(header, 0, 100);

    const prefix = readString(header, 345, 155);
    if (prefix) {
      name = `${prefix}/${name}`;
    }

    if (longName) {
      name = longName;
      longName = undefined;
    }

    const sizeStr = readString(header, 124, 12);
    const fileSize = parseInt(sizeStr, 8) || 0;

    const typeFlag = String.fromCharCode(header[156]);

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
          `[docspec] Found docspec.json in sdist for "${packageName}@${version}" but failed to parse it: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    offset += 512 + alignTo512(fileSize);
  }

  throw new Error(
    `[docspec] No docspec.json found in sdist for "${packageName}@${version}". ` +
      "Ensure the package includes a docspec.json at its root.",
  );
}

// ── ZIP extraction (for wheels .whl) ────────────────────────────────

/**
 * Extract `docspec.json` from a wheel (`.whl`) file.
 *
 * Wheels are standard ZIP archives.  This is a minimal ZIP parser that
 * reads the End of Central Directory record, walks the Central Directory
 * entries, and extracts the matching file.  It handles both stored and
 * deflated entries.
 */
function extractDocspecFromZip(
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
      `[docspec] Invalid wheel archive for "${packageName}@${version}": ` +
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

    // Check if this is docspec.json (anywhere in the archive).
    const baseName = entryName.split("/").pop();
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
        `[docspec] Found docspec.json in wheel for "${packageName}@${version}" but failed to parse it: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  throw new Error(
    `[docspec] No docspec.json found in wheel for "${packageName}@${version}". ` +
      "Ensure the package includes a docspec.json in its distribution.",
  );
}

// ── shared tar helpers ──────────────────────────────────────────────

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
    source: "pypi",
    spec,
  };
}
