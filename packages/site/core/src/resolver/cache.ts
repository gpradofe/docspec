import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import type { DocSpec } from "../types/docspec.js";

/**
 * A simple disk-based cache for resolved DocSpec artifacts.
 *
 * Each entry is stored as `{cacheDir}/{key}.json` and validated
 * via a sha-256 content hash persisted alongside it.
 */
export class SpecCache {
  private readonly cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  /**
   * Retrieve a cached spec by key.
   * Returns `null` when the cache file does not exist or the content hash
   * does not match (i.e. the file has been tampered with or corrupted).
   */
  get(key: string): DocSpec | null {
    const dataPath = this.dataPath(key);
    const hashPath = this.hashPath(key);

    if (!existsSync(dataPath) || !existsSync(hashPath)) {
      return null;
    }

    try {
      const raw = readFileSync(dataPath, "utf-8");
      const storedHash = readFileSync(hashPath, "utf-8").trim();

      const computedHash = this.hash(raw);
      if (computedHash !== storedHash) {
        return null;
      }

      return JSON.parse(raw) as DocSpec;
    } catch {
      return null;
    }
  }

  /**
   * Write a spec to the cache under the given key.
   * Creates the cache directory (recursively) if it does not exist.
   */
  set(key: string, spec: DocSpec): void {
    this.ensureDir();

    const json = JSON.stringify(spec);
    const contentHash = this.hash(json);

    writeFileSync(this.dataPath(key), json, "utf-8");
    writeFileSync(this.hashPath(key), contentHash, "utf-8");
  }

  // ── internal helpers ──────────────────────────────────────────

  private dataPath(key: string): string {
    return join(this.cacheDir, `${key}.json`);
  }

  private hashPath(key: string): string {
    return join(this.cacheDir, `${key}.sha256`);
  }

  private hash(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  private ensureDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }
}
