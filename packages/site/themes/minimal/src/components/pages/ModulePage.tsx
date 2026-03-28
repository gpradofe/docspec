import React from "react";
import type { ModulePageData, Member } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface ModulePageProps {
  data: ModulePageData;
}

export function ModulePage({ data }: ModulePageProps) {
  const { module: mod, artifact } = data;
  const members = mod.members || [];

  return (
    <div>
      <Breadcrumb items={[{ label: artifact.label, href: `/libraries/${slugify(artifact.label)}` }, { label: mod.name || mod.id }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">{mod.name || mod.id}</h1>
      {mod.stereotype && <Badge variant="primary">{mod.stereotype}</Badge>}
      {mod.description && <p className="text-text-secondary mt-3 mb-6 leading-relaxed">{mod.description}</p>}

      <h2 className="text-lg font-semibold text-text-primary mb-3" id="members">Members ({members.length})</h2>

      <div className="divide-y divide-border">
        {members.map((member) => (
          <MemberRow key={member.qualified} member={member} artifactLabel={artifact.label} />
        ))}
      </div>
    </div>
  );
}

function MemberRow({ member, artifactLabel }: { member: Member; artifactLabel: string }) {
  const qualifiedSlug = member.qualified.split(".").map((p) => slugify(p)).join("/");
  const slug = `/libraries/${slugify(artifactLabel)}/members/${qualifiedSlug}`;

  return (
    <a href={slug} className="block py-3 hover:bg-surface-secondary -mx-4 px-4 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-primary">{member.name}</span>
        <Badge>{member.kind}</Badge>
      </div>
      {member.description && <p className="text-xs text-text-tertiary mt-0.5">{member.description}</p>}
    </a>
  );
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
