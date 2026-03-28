import React from "react";
import type { ModulePageData, Member } from "@docspec/core";
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

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-text-primary">{mod.name || mod.id}</h1>
        {mod.stereotype && <Badge variant="primary">{mod.stereotype}</Badge>}
        {mod.framework && <Badge variant="info">{mod.framework}</Badge>}
      </div>

      {mod.description && (
        <p className="text-text-secondary mb-8">{mod.description}</p>
      )}

      {mod.discoveredFrom && (
        <p className="text-xs text-text-tertiary mb-6">
          Discovered from: <span className="font-medium">{mod.discoveredFrom}</span>
        </p>
      )}

      <h2 className="text-lg font-semibold text-text-primary mb-4" id="members">
        Members ({members.length})
      </h2>

      <div className="space-y-1">
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
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent hover:border-border hover:bg-surface-secondary transition-colors group"
    >
      <span className="w-7 h-7 rounded-md bg-primary-50 text-primary-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {kindIcon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary group-hover:text-primary-500">
            {member.name}
          </span>
          <Badge>{member.kind}</Badge>
          {member.visibility && member.visibility !== "public" && (
            <Badge variant="warning">{member.visibility}</Badge>
          )}
        </div>
        {member.description && (
          <p className="text-xs text-text-tertiary mt-0.5 truncate">{member.description}</p>
        )}
      </div>
      <span className="text-xs text-text-tertiary flex-shrink-0">
        {methodCount} method{methodCount !== 1 ? "s" : ""}
      </span>
    </a>
  );
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
