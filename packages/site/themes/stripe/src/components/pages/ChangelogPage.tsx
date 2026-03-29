import React from "react";
import type { ChangelogPageData } from "@docspec/core";
import { T } from "../../lib/tokens.js";

interface ChangelogPageProps {
  data: ChangelogPageData;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  added: { bg: T.greenBg, text: T.green, label: "Added" },
  removed: { bg: T.redBg, text: T.red, label: "Removed" },
  modified: { bg: T.blueBg, text: T.blue, label: "Modified" },
};

export function ChangelogPage({ data }: ChangelogPageProps) {
  const diffs = data.diffs || [];

  if (diffs.length === 0) {
    return (
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 750,
            color: T.text,
            letterSpacing: "-0.025em",
            margin: "0 0 6px",
          }}
        >
          Changelog
        </h1>
        <p style={{ color: T.textMuted, fontSize: 14, lineHeight: 1.7 }}>
          No version history available. Run{" "}
          <code
            style={{
              fontFamily: T.mono,
              background: T.surface,
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 12,
              color: T.accentText,
            }}
          >
            docspec diff
          </code>{" "}
          to compare versions.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.025em",
          margin: "0 0 28px",
        }}
      >
        Changelog
      </h1>

      {/* Timeline */}
      <div
        style={{
          position: "relative" as const,
          paddingLeft: 24,
          borderLeft: `2px solid ${T.surfaceBorder}`,
        }}
      >
        {diffs.map((diff, i) => (
          <div key={i} style={{ marginBottom: 40, position: "relative" as const }}>
            {/* Timeline dot */}
            <div
              style={{
                position: "absolute" as const,
                left: -29,
                top: 4,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: T.accent,
                border: `2px solid ${T.bg}`,
              }}
            />

            {/* Version header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 650,
                  color: T.text,
                }}
              >
                v{diff.version?.to || "unknown"}
              </span>
              {diff.version?.from && (
                <span
                  style={{
                    fontSize: 12,
                    color: T.textDim,
                    fontFamily: T.mono,
                  }}
                >
                  from v{diff.version.from}
                </span>
              )}
              {diff.summary && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginLeft: "auto",
                  }}
                >
                  {diff.summary.added > 0 && (
                    <DiffBadge status="added" count={diff.summary.added} />
                  )}
                  {diff.summary.removed > 0 && (
                    <DiffBadge status="removed" count={diff.summary.removed} />
                  )}
                  {diff.summary.modified > 0 && (
                    <DiffBadge status="modified" count={diff.summary.modified} />
                  )}
                </div>
              )}
            </div>

            {/* Changes list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column" as const,
                gap: 6,
              }}
            >
              {(diff.members || []).map((m, j) => (
                <ChangeEntry
                  key={`m-${j}`}
                  name={m.name || m.qualified || ""}
                  status={m.status}
                  detail={m.changes?.join(", ")}
                  kind="member"
                />
              ))}
              {(diff.methods || []).map((m, j) => (
                <ChangeEntry
                  key={`mt-${j}`}
                  name={`${m.memberName}.${m.name}`}
                  status={m.status}
                  detail={m.changes?.join(", ")}
                  kind="method"
                />
              ))}
              {(diff.flows || []).map((f, j) => (
                <ChangeEntry
                  key={`f-${j}`}
                  name={f.name}
                  status={f.status}
                  detail={f.stepsAdded ? `+${f.stepsAdded} steps` : undefined}
                  kind="flow"
                />
              ))}
              {(diff.errors || []).map((e, j) => (
                <ChangeEntry
                  key={`e-${j}`}
                  name={e.name}
                  status={e.status}
                  kind="error"
                />
              ))}
              {(diff.events || []).map((e, j) => (
                <ChangeEntry
                  key={`ev-${j}`}
                  name={e.name}
                  status={e.status}
                  kind="event"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffBadge({
  status,
  count,
}: {
  status: "added" | "removed" | "modified";
  count: number;
}) {
  const c = STATUS_COLORS[status];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 4,
        background: c.bg,
        color: c.text,
      }}
    >
      {count} {c.label.toLowerCase()}
    </span>
  );
}

function ChangeEntry({
  name,
  status,
  detail,
  kind,
}: {
  name: string;
  status: string;
  detail?: string;
  kind: string;
}) {
  const c =
    STATUS_COLORS[status as keyof typeof STATUS_COLORS] ||
    STATUS_COLORS.modified;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 6,
        border: `1px solid ${T.surfaceBorder}`,
        background: T.cardBg,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "1px 5px",
          borderRadius: 3,
          background: c.bg,
          color: c.text,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
        }}
      >
        {c.label}
      </span>
      <span
        style={{
          fontSize: 11,
          fontFamily: T.mono,
          color: T.textDim,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
        }}
      >
        {kind}
      </span>
      <code
        style={{
          fontSize: 13,
          fontFamily: T.mono,
          color: T.text,
        }}
      >
        {name}
      </code>
      {detail && (
        <span
          style={{
            fontSize: 12,
            color: T.textDim,
            marginLeft: "auto",
          }}
        >
          {detail}
        </span>
      )}
    </div>
  );
}
