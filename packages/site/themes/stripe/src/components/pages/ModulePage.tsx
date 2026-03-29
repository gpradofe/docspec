import React from "react";
import type { ModulePageData, Member } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface ModulePageProps {
  data: ModulePageData;
}

const KIND_ICONS: Record<string, string> = {
  class: "C",
  interface: "I",
  enum: "E",
  record: "R",
  annotation: "@",
};

export function ModulePage({ data }: ModulePageProps) {
  const { module: mod, artifact } = data;
  const members = mod.members || [];

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Libraries", href: "/libraries" },
          { label: artifact.label, href: `/libraries/${slugify(artifact.label)}` },
          { label: mod.name || mod.id },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{mod.name || mod.id}</h1>
        {mod.stereotype && <Badge variant="primary">{mod.stereotype}</Badge>}
        {mod.framework && <Badge variant="info">{mod.framework}</Badge>}
      </div>

      {mod.description && (
        <p style={{ color: T.textMuted, marginBottom: 32 }}>{mod.description}</p>
      )}

      {mod.discoveredFrom && (
        <p style={{ fontSize: 12, color: T.textDim, marginBottom: 24 }}>
          Discovered from: <span style={{ fontWeight: 500 }}>{mod.discoveredFrom}</span>
        </p>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 16 }} id="members">
        Members ({members.length})
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {members.map((member) => (
          <MemberRow key={member.qualified} member={member} artifactLabel={artifact.label} />
        ))}
      </div>
    </div>
  );
}

function MemberRow({ member, artifactLabel }: { member: Member; artifactLabel: string }) {
  const methodCount = member.methods?.length || 0;
  const kindIcon = KIND_ICONS[member.kind] || "?";
  const qualifiedSlug = member.qualified.split(".").map((p) => slugify(p)).join("/");
  const slug = `/libraries/${slugify(artifactLabel)}/members/${qualifiedSlug}`;

  return (
    <a
      href={slug}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 8,
        border: "1px solid transparent",
        textDecoration: "none",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = T.surfaceBorder;
        e.currentTarget.style.background = T.surface;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "transparent";
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: T.accentBg,
        color: T.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
      }}>
        {kindIcon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>
            {member.name}
          </span>
          <Badge>{member.kind}</Badge>
          {member.visibility && member.visibility !== "public" && (
            <Badge variant="warning">{member.visibility}</Badge>
          )}
        </div>
        {member.description && (
          <p style={{ fontSize: 12, color: T.textDim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.description}</p>
        )}
      </div>
      <span style={{ fontSize: 12, color: T.textDim, flexShrink: 0 }}>
        {methodCount} method{methodCount !== 1 ? "s" : ""}
      </span>
    </a>
  );
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
