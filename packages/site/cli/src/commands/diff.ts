/**
 * CLI command to diff two docspec.json files.
 */

import { readFileSync } from "fs";
import { diffSpecs } from "@docspec/core";
import type { DiffResult } from "@docspec/core";

export function runDiff(beforePath: string, afterPath: string): DiffResult {
  const before = JSON.parse(readFileSync(beforePath, "utf-8"));
  const after = JSON.parse(readFileSync(afterPath, "utf-8"));
  return diffSpecs(before, after);
}

export function formatDiff(result: DiffResult): string {
  const lines: string[] = [];
  lines.push(`Changes: +${result.summary.added} added, -${result.summary.removed} removed, ~${result.summary.modified} modified`);
  lines.push("");

  if (result.added.length > 0) {
    lines.push("Added:");
    for (const entry of result.added) {
      lines.push(`  + [${entry.type}] ${entry.qualified ?? entry.name}`);
    }
    lines.push("");
  }

  if (result.removed.length > 0) {
    lines.push("Removed:");
    for (const entry of result.removed) {
      lines.push(`  - [${entry.type}] ${entry.qualified ?? entry.name}`);
    }
    lines.push("");
  }

  if (result.modified.length > 0) {
    lines.push("Modified:");
    for (const entry of result.modified) {
      lines.push(`  ~ [${entry.type}] ${entry.qualified ?? entry.name}${entry.details ? ` (${entry.details})` : ""}`);
    }
  }

  return lines.join("\n");
}
