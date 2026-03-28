/**
 * Version manager — tracks and compares multiple spec versions.
 */

import type { DocSpec } from "../types/docspec.js";

export interface VersionEntry {
  version: string;
  label?: string;
  timestamp: string;
  specPath: string;
  isLatest: boolean;
}

export interface VersionDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

export class VersionManager {
  private versions: VersionEntry[] = [];

  addVersion(entry: Omit<VersionEntry, "isLatest">): void {
    // Mark all existing as not latest
    for (const v of this.versions) {
      v.isLatest = false;
    }
    this.versions.push({ ...entry, isLatest: true });
    this.versions.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
  }

  getVersions(): readonly VersionEntry[] {
    return this.versions;
  }

  getLatest(): VersionEntry | undefined {
    return this.versions.find((v) => v.isLatest);
  }

  getVersion(version: string): VersionEntry | undefined {
    return this.versions.find((v) => v.version === version);
  }

  /**
   * Compare two spec objects and return a summary of differences.
   */
  diffSpecs(oldSpec: DocSpec, newSpec: DocSpec): VersionDiff {
    const oldModuleIds = new Set((oldSpec.modules ?? []).map((m) => m.id));
    const newModuleIds = new Set((newSpec.modules ?? []).map((m) => m.id));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    for (const id of newModuleIds) {
      if (!oldModuleIds.has(id)) {
        added.push(`module:${id}`);
      }
    }

    for (const id of oldModuleIds) {
      if (!newModuleIds.has(id)) {
        removed.push(`module:${id}`);
      }
    }

    for (const id of newModuleIds) {
      if (oldModuleIds.has(id)) {
        const oldMod = (oldSpec.modules ?? []).find((m) => m.id === id);
        const newMod = (newSpec.modules ?? []).find((m) => m.id === id);
        if (oldMod && newMod) {
          const oldMembers = new Set((oldMod.members ?? []).map((m) => m.qualified));
          const newMembers = new Set((newMod.members ?? []).map((m) => m.qualified));
          for (const q of newMembers) {
            if (!oldMembers.has(q)) added.push(`member:${q}`);
          }
          for (const q of oldMembers) {
            if (!newMembers.has(q)) removed.push(`member:${q}`);
          }
          if (JSON.stringify(oldMod) !== JSON.stringify(newMod)) {
            modified.push(`module:${id}`);
          }
        }
      }
    }

    return { added, removed, modified };
  }
}
