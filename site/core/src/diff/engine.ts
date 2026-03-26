/**
 * Compares two DocSpec artifacts and reports changes.
 */

import type { DocSpec, Member } from "../types/docspec.js";

export interface DiffResult {
  added: DiffEntry[];
  removed: DiffEntry[];
  modified: DiffEntry[];
  summary: { added: number; removed: number; modified: number };
}

export interface DiffEntry {
  type: "module" | "member" | "method" | "endpoint" | "flow" | "error" | "event" | "dataModel";
  name: string;
  qualified?: string;
  details?: string;
}

export function diffSpecs(before: DocSpec, after: DocSpec): DiffResult {
  const added: DiffEntry[] = [];
  const removed: DiffEntry[] = [];
  const modified: DiffEntry[] = [];

  // Diff modules
  const beforeModules = new Map((before.modules ?? []).map(m => [m.id, m]));
  const afterModules = new Map((after.modules ?? []).map(m => [m.id, m]));

  for (const [id, mod] of afterModules) {
    if (!beforeModules.has(id)) {
      added.push({ type: "module", name: mod.name ?? id });
    } else {
      // Check for member changes within module
      const beforeMod = beforeModules.get(id)!;
      diffMembers(beforeMod.members ?? [], mod.members ?? [], added, removed, modified);
    }
  }

  for (const [id, mod] of beforeModules) {
    if (!afterModules.has(id)) {
      removed.push({ type: "module", name: mod.name ?? id });
    }
  }

  // Diff flows
  diffByField(before.flows ?? [], after.flows ?? [], "id", "flow", added, removed);

  // Diff errors
  diffByField(before.errors ?? [], after.errors ?? [], "code", "error", added, removed);

  // Diff events
  diffByField(before.events ?? [], after.events ?? [], "name", "event", added, removed);

  // Diff data models
  diffByField(before.dataModels ?? [], after.dataModels ?? [], "qualified", "dataModel", added, removed);

  return {
    added,
    removed,
    modified,
    summary: { added: added.length, removed: removed.length, modified: modified.length },
  };
}

function diffMembers(
  before: Member[],
  after: Member[],
  added: DiffEntry[],
  removed: DiffEntry[],
  modified: DiffEntry[],
): void {
  const beforeMap = new Map(before.map(m => [m.qualified, m]));
  const afterMap = new Map(after.map(m => [m.qualified, m]));

  for (const [qual, member] of afterMap) {
    if (!beforeMap.has(qual)) {
      added.push({ type: "member", name: member.name, qualified: qual });
    } else {
      // Check method changes
      const bMember = beforeMap.get(qual)!;
      const bMethods = new Set((bMember.methods ?? []).map(m => m.name));
      const aMethods = new Set((member.methods ?? []).map(m => m.name));

      for (const name of aMethods) {
        if (!bMethods.has(name)) {
          added.push({ type: "method", name, qualified: `${qual}.${name}` });
        }
      }
      for (const name of bMethods) {
        if (!aMethods.has(name)) {
          removed.push({ type: "method", name, qualified: `${qual}.${name}` });
        }
      }

      // Check if description changed
      if (bMember.description !== member.description) {
        modified.push({ type: "member", name: member.name, qualified: qual, details: "description changed" });
      }
    }
  }

  for (const [qual, member] of beforeMap) {
    if (!afterMap.has(qual)) {
      removed.push({ type: "member", name: member.name, qualified: qual });
    }
  }
}

function diffByField(
  before: any[],
  after: any[],
  keyField: string,
  type: DiffEntry["type"],
  added: DiffEntry[],
  removed: DiffEntry[],
): void {
  const beforeKeys = new Set(before.map(item => item[keyField]));
  const afterKeys = new Set(after.map(item => item[keyField]));

  for (const item of after) {
    if (!beforeKeys.has(item[keyField])) {
      added.push({ type, name: item.name ?? item[keyField], qualified: item.qualified ?? item[keyField] });
    }
  }
  for (const item of before) {
    if (!afterKeys.has(item[keyField])) {
      removed.push({ type, name: item.name ?? item[keyField], qualified: item.qualified ?? item[keyField] });
    }
  }
}
