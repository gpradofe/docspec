/**
 * Compares two DocSpec artifacts and reports changes.
 *
 * Provides both the legacy flat diff (diffSpecs) and the new structured
 * diff (computeDiff) used by the ChangelogPage timeline.
 */

import type { DocSpec, Member, Method } from "../types/docspec.js";

// ── Legacy types (kept for backward compatibility) ──────────────────

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

// ── New structured diff types ───────────────────────────────────────

export interface StructuredDiffResult {
  version: { from: string; to: string };
  summary: DiffSummary;
  members: MemberDiff[];
  methods: MethodDiff[];
  flows: FlowDiff[];
  errors: EntityDiff[];
  events: EntityDiff[];
}

export interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
  totalChanges: number;
}

export interface MemberDiff {
  qualified: string;
  name: string;
  status: "added" | "removed" | "modified";
  changes?: string[];
}

export interface MethodDiff {
  qualified: string;
  name: string;
  memberName: string;
  status: "added" | "removed" | "modified";
  changes?: string[];
}

export interface FlowDiff {
  id: string;
  name: string;
  status: "added" | "removed" | "modified";
  stepsAdded?: number;
  stepsRemoved?: number;
}

export interface EntityDiff {
  id: string;
  name: string;
  status: "added" | "removed" | "modified";
}

// ── computeDiff (new structured API) ────────────────────────────────

export function computeDiff(oldSpec: DocSpec, newSpec: DocSpec): StructuredDiffResult {
  const members = diffMemberEntries(oldSpec, newSpec);
  const methods = diffMethodEntries(oldSpec, newSpec);
  const flows = diffFlowEntries(oldSpec, newSpec);
  const errors = diffEntityList(
    (oldSpec.errors || []).map(e => ({ id: e.code, name: e.code })),
    (newSpec.errors || []).map(e => ({ id: e.code, name: e.code })),
  );
  const events = diffEntityList(
    (oldSpec.events || []).map(e => ({ id: e.name, name: e.name })),
    (newSpec.events || []).map(e => ({ id: e.name, name: e.name })),
  );

  const added =
    members.filter(m => m.status === "added").length +
    methods.filter(m => m.status === "added").length +
    flows.filter(f => f.status === "added").length +
    errors.filter(e => e.status === "added").length +
    events.filter(e => e.status === "added").length;
  const removed =
    members.filter(m => m.status === "removed").length +
    methods.filter(m => m.status === "removed").length +
    flows.filter(f => f.status === "removed").length +
    errors.filter(e => e.status === "removed").length +
    events.filter(e => e.status === "removed").length;
  const modified =
    members.filter(m => m.status === "modified").length +
    methods.filter(m => m.status === "modified").length +
    flows.filter(f => f.status === "modified").length;

  return {
    version: { from: oldSpec.artifact.version, to: newSpec.artifact.version },
    summary: { added, removed, modified, totalChanges: added + removed + modified },
    members,
    methods,
    flows,
    errors,
    events,
  };
}

function diffMemberEntries(oldSpec: DocSpec, newSpec: DocSpec): MemberDiff[] {
  const oldMembers = collectMembers(oldSpec);
  const newMembers = collectMembers(newSpec);
  return diffByKey<Member, MemberDiff>(
    oldMembers,
    newMembers,
    m => m.qualified,
    m => m.name,
    (old, cur) => {
      const changes: string[] = [];
      if (old.description !== cur.description) changes.push("description changed");
      if ((old.methods?.length || 0) !== (cur.methods?.length || 0)) changes.push("methods changed");
      if ((old.fields?.length || 0) !== (cur.fields?.length || 0)) changes.push("fields changed");
      if (old.deprecated !== cur.deprecated) changes.push("deprecation changed");
      return changes.length > 0
        ? { qualified: cur.qualified, name: cur.name, status: "modified" as const, changes }
        : null;
    },
  );
}

function diffMethodEntries(oldSpec: DocSpec, newSpec: DocSpec): MethodDiff[] {
  const oldMethods = collectMethods(oldSpec);
  const newMethods = collectMethods(newSpec);

  const oldMap = new Map(oldMethods.map(m => [m.key, m]));
  const newMap = new Map(newMethods.map(m => [m.key, m]));
  const result: MethodDiff[] = [];

  for (const [key, entry] of newMap) {
    if (!oldMap.has(key)) {
      result.push({ qualified: key, name: entry.method.name, memberName: entry.memberName, status: "added" });
    } else {
      const old = oldMap.get(key)!;
      const changes: string[] = [];
      if (old.method.description !== entry.method.description) changes.push("description changed");
      if ((old.method.params?.length || 0) !== (entry.method.params?.length || 0)) changes.push("parameters changed");
      if (old.method.returns?.type !== entry.method.returns?.type) changes.push("return type changed");
      if (old.method.deprecated !== entry.method.deprecated) changes.push("deprecation changed");
      if (changes.length > 0) {
        result.push({ qualified: key, name: entry.method.name, memberName: entry.memberName, status: "modified", changes });
      }
    }
  }

  for (const [key, entry] of oldMap) {
    if (!newMap.has(key)) {
      result.push({ qualified: key, name: entry.method.name, memberName: entry.memberName, status: "removed" });
    }
  }

  return result;
}

function diffFlowEntries(oldSpec: DocSpec, newSpec: DocSpec): FlowDiff[] {
  const oldFlows = new Map((oldSpec.flows || []).map(f => [f.id, f]));
  const newFlows = new Map((newSpec.flows || []).map(f => [f.id, f]));
  const result: FlowDiff[] = [];

  for (const [id, flow] of newFlows) {
    if (!oldFlows.has(id)) {
      result.push({ id, name: flow.name || id, status: "added" });
    } else {
      const old = oldFlows.get(id)!;
      const oldLen = old.steps.length;
      const newLen = flow.steps.length;
      if (oldLen !== newLen || old.description !== flow.description) {
        result.push({
          id,
          name: flow.name || id,
          status: "modified",
          stepsAdded: Math.max(0, newLen - oldLen),
          stepsRemoved: Math.max(0, oldLen - newLen),
        });
      }
    }
  }

  for (const [id, flow] of oldFlows) {
    if (!newFlows.has(id)) {
      result.push({ id, name: flow.name || id, status: "removed" });
    }
  }

  return result;
}

function diffEntityList(
  oldList: { id: string; name: string }[],
  newList: { id: string; name: string }[],
): EntityDiff[] {
  const oldSet = new Set(oldList.map(e => e.id));
  const newSet = new Set(newList.map(e => e.id));
  const result: EntityDiff[] = [];
  for (const e of newList) {
    if (!oldSet.has(e.id)) result.push({ ...e, status: "added" });
  }
  for (const e of oldList) {
    if (!newSet.has(e.id)) result.push({ ...e, status: "removed" });
  }
  return result;
}

// ── Helpers ─────────────────────────────────────────────────────────

function collectMembers(spec: DocSpec): Member[] {
  return (spec.modules || []).flatMap(m => m.members || []);
}

function collectMethods(spec: DocSpec): Array<{ key: string; method: Method; memberName: string }> {
  return (spec.modules || []).flatMap(mod =>
    (mod.members || []).flatMap(member =>
      (member.methods || []).map(method => ({
        key: `${member.qualified}#${method.name}`,
        method,
        memberName: member.name,
      })),
    ),
  );
}

function diffByKey<T, R extends { status: "added" | "removed" | "modified" }>(
  oldItems: T[],
  newItems: T[],
  getKey: (item: T) => string,
  getName: (item: T) => string,
  compare: (old: T, cur: T) => R | null,
): R[] {
  const oldMap = new Map(oldItems.map(i => [getKey(i), i]));
  const newMap = new Map(newItems.map(i => [getKey(i), i]));
  const result: R[] = [];

  for (const [key, item] of newMap) {
    if (!oldMap.has(key)) {
      result.push({ qualified: key, name: getName(item), status: "added" } as unknown as R);
    } else {
      const diff = compare(oldMap.get(key)!, item);
      if (diff) result.push(diff);
    }
  }

  for (const [key, item] of oldMap) {
    if (!newMap.has(key)) {
      result.push({ qualified: key, name: getName(item), status: "removed" } as unknown as R);
    }
  }

  return result;
}

// ── Legacy diffSpecs (flat diff for backward compatibility) ─────────

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
      const beforeMod = beforeModules.get(id)!;
      diffMembersLegacy(beforeMod.members ?? [], mod.members ?? [], added, removed, modified);
    }
  }

  for (const [id, mod] of beforeModules) {
    if (!afterModules.has(id)) {
      removed.push({ type: "module", name: mod.name ?? id });
    }
  }

  // Diff flows
  diffByFieldLegacy(before.flows ?? [], after.flows ?? [], "id", "flow", added, removed);

  // Diff errors
  diffByFieldLegacy(before.errors ?? [], after.errors ?? [], "code", "error", added, removed);

  // Diff events
  diffByFieldLegacy(before.events ?? [], after.events ?? [], "name", "event", added, removed);

  // Diff data models
  diffByFieldLegacy(before.dataModels ?? [], after.dataModels ?? [], "qualified", "dataModel", added, removed);

  return {
    added,
    removed,
    modified,
    summary: { added: added.length, removed: removed.length, modified: modified.length },
  };
}

function diffMembersLegacy(
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

function diffByFieldLegacy(
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
