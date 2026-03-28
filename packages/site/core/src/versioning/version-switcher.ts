/**
 * Version switcher — generates version selector data for the UI.
 */

import type { VersionEntry } from "./version-manager.js";

export interface VersionSwitcherItem {
  version: string;
  label: string;
  url: string;
  isCurrent: boolean;
}

/**
 * Build version switcher items for the UI dropdown.
 */
export function buildVersionSwitcher(
  versions: readonly VersionEntry[],
  currentVersion: string,
  baseUrl: string = "/",
): VersionSwitcherItem[] {
  return versions.map((v) => ({
    version: v.version,
    label: v.label ?? `v${v.version}`,
    url: `${baseUrl}${v.version}/`,
    isCurrent: v.version === currentVersion,
  }));
}

/**
 * Get the URL for the latest version.
 */
export function getLatestVersionUrl(
  versions: readonly VersionEntry[],
  baseUrl: string = "/",
): string {
  const latest = versions.find((v) => v.isLatest);
  if (!latest) return baseUrl;
  return `${baseUrl}${latest.version}/`;
}
