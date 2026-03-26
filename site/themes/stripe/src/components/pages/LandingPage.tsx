import React from "react";
import type { LandingPageData, ArtifactSummary } from "@docspec/core";
import { Badge } from "../ui/Badge.js";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface LandingPageProps {
  data: LandingPageData;
}

export function LandingPage({ data }: LandingPageProps) {
  const { artifacts } = data;

  const totalModules = artifacts.reduce((sum, a) => sum + a.moduleCount, 0);
  const totalMembers = artifacts.reduce((sum, a) => sum + a.memberCount, 0);
  const totalEndpoints = artifacts.reduce((sum, a) => sum + a.endpointCount, 0);

  return (
    <div>
      <Breadcrumb items={[{ label: "Home" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">Documentation</h1>
      <p className="text-text-secondary mb-4">
        Browse all documented artifacts, modules, and API endpoints.
      </p>

      {/* Overview Stats */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{artifacts.length}</div>
          <div className="text-xs text-text-tertiary">Artifacts</div>
        </div>
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{totalModules}</div>
          <div className="text-xs text-text-tertiary">Modules</div>
        </div>
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{totalMembers}</div>
          <div className="text-xs text-text-tertiary">Members</div>
        </div>
        <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border">
          <div className="text-2xl font-bold text-text-primary">{totalEndpoints}</div>
          <div className="text-xs text-text-tertiary">Endpoints</div>
        </div>
      </div>

      {/* Artifact Cards */}
      <h2 className="text-lg font-semibold text-text-primary mb-4" id="artifacts">
        Artifacts ({artifacts.length})
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {artifacts.map((artifact) => (
          <ArtifactCard key={artifact.slug} artifact={artifact} />
        ))}
      </div>
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: ArtifactSummary }) {
  return (
    <a
      href={`/${artifact.slug}`}
      className="block p-5 rounded-lg border border-border hover:border-primary-300 hover:bg-surface-secondary transition-colors group"
    >
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-base font-semibold text-text-primary group-hover:text-primary-600">
          {artifact.label}
        </h3>
        {artifact.coveragePercent !== undefined && (
          <Badge variant={artifact.coveragePercent >= 80 ? "success" : artifact.coveragePercent >= 50 ? "warning" : "error"}>
            {artifact.coveragePercent}% coverage
          </Badge>
        )}
      </div>

      {artifact.description && (
        <p className="text-sm text-text-secondary mb-4 line-clamp-2">{artifact.description}</p>
      )}

      <div className="flex gap-4 text-xs text-text-tertiary">
        <span>
          <span className="font-medium text-text-secondary">{artifact.moduleCount}</span> modules
        </span>
        <span>
          <span className="font-medium text-text-secondary">{artifact.memberCount}</span> members
        </span>
        <span>
          <span className="font-medium text-text-secondary">{artifact.endpointCount}</span> endpoints
        </span>
      </div>
    </a>
  );
}
