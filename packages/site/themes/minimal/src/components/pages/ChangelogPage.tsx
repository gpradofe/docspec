import React from "react";
import type { ChangelogPageData } from "@docspec/core";

interface ChangelogPageProps {
  data: ChangelogPageData;
}

const STATUS_COLORS = {
  added: { bg: "#dcfce7", text: "#166534", label: "Added" },
  removed: { bg: "#fee2e2", text: "#991b1b", label: "Removed" },
  modified: { bg: "#dbeafe", text: "#1d4ed8", label: "Modified" },
};

export function ChangelogPage({ data }: ChangelogPageProps) {
  const diffs = data.diffs || [];

  return (
    <div>
      <h1
        className="text-2xl font-bold text-text-primary mb-2 tracking-tight"
      >
        Changelog
      </h1>
      <p className="text-text-secondary mb-6">
        Version history and documentation diffs
      </p>

      {diffs.length === 0 ? (
        <p className="text-text-tertiary text-center py-12">
          No version history available. Run <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-sm">docspec diff</code> to compare versions.
        </p>
      ) : (
        <div
          style={{
            position: "relative",
            paddingLeft: 24,
            borderLeft: "2px solid var(--ds-border, #e2e8f0)",
          }}
        >
          {diffs.map((diff, i) => (
            <div key={i} style={{ marginBottom: 40, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: -29,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "var(--ds-primary, #6366f1)",
                  border: "2px solid var(--ds-surface-primary, #fff)",
                }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: "var(--ds-text-primary)" }}>
                  v{diff.version?.to || "unknown"}
                </span>
                {diff.version?.from && (
                  <span style={{ fontSize: 12, color: "var(--ds-text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    from v{diff.version.from}
                  </span>
                )}
                {diff.summary && (
                  <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                    {diff.summary.added > 0 && <DiffBadge status="added" count={diff.summary.added} />}
                    {diff.summary.removed > 0 && <DiffBadge status="removed" count={diff.summary.removed} />}
                    {diff.summary.modified > 0 && <DiffBadge status="modified" count={diff.summary.modified} />}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(diff.members || []).map((m, j) => (
                  <ChangeEntry key={`m-${j}`} name={m.name || m.qualified || ""} status={m.status} detail={m.changes?.join(", ")} kind="member" />
                ))}
                {(diff.methods || []).map((m, j) => (
                  <ChangeEntry key={`mt-${j}`} name={`${m.memberName}.${m.name}`} status={m.status} detail={m.changes?.join(", ")} kind="method" />
                ))}
                {(diff.flows || []).map((f, j) => (
                  <ChangeEntry key={`f-${j}`} name={f.name} status={f.status} detail={f.stepsAdded ? `+${f.stepsAdded} steps` : undefined} kind="flow" />
                ))}
                {(diff.errors || []).map((e, j) => (
                  <ChangeEntry key={`e-${j}`} name={e.name} status={e.status} kind="error" />
                ))}
                {(diff.events || []).map((e, j) => (
                  <ChangeEntry key={`ev-${j}`} name={e.name} status={e.status} kind="event" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiffBadge({ status, count }: { status: "added" | "removed" | "modified"; count: number }) {
  const c = STATUS_COLORS[status];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: c.bg, color: c.text }}>
      {count} {c.label.toLowerCase()}
    </span>
  );
}

function ChangeEntry({ name, status, detail, kind }: { name: string; status: string; detail?: string; kind: string }) {
  const c = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.modified;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--ds-border, #e2e8f0)" }}>
      <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: c.bg, color: c.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {c.label}
      </span>
      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ds-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {kind}
      </span>
      <code style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--ds-text-primary)" }}>{name}</code>
      {detail && <span style={{ fontSize: 12, color: "var(--ds-text-tertiary)", marginLeft: "auto" }}>{detail}</span>}
    </div>
  );
}
