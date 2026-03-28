import React from "react";
import type { LandingPageData, ArtifactSummary } from "@docspec/core";
import { Badge } from "../ui/Badge.js";

interface LandingPageProps {
  data: LandingPageData;
}

export function LandingPage({ data }: LandingPageProps) {
  const { artifacts } = data;

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-3 tracking-tight">Documentation</h1>
      <p className="text-text-secondary mb-8 text-lg leading-relaxed">
        Browse all documented artifacts, modules, and API endpoints.
      </p>

      <div className="space-y-4">
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
      className="block py-4 border-b border-border hover:bg-surface-secondary -mx-4 px-4 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-base font-semibold text-text-primary">{artifact.label}</h3>
        {artifact.coveragePercent !== undefined && (
          <Badge variant={artifact.coveragePercent >= 80 ? "success" : artifact.coveragePercent >= 50 ? "warning" : "error"}>
            {artifact.coveragePercent}%
          </Badge>
        )}
      </div>
      {artifact.description && (
        <p className="text-sm text-text-secondary mb-2">{artifact.description}</p>
      )}
      <div className="flex gap-4 text-xs text-text-tertiary">
        <span>{artifact.moduleCount} modules</span>
        <span>{artifact.memberCount} members</span>
        <span>{artifact.endpointCount} endpoints</span>
      </div>
    </a>
  );
}
