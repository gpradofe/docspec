import React from "react";
import type { TestDashboardPageData, TestDashboardArtifact } from "@docspec/core";
import { Breadcrumb } from "../layout/Breadcrumb.js";

interface TestDashboardPageProps {
  data: TestDashboardPageData;
}

function isdColor(score: number): string {
  if (score >= 0.6) return "text-emerald-600";
  if (score >= 0.3) return "text-amber-600";
  return "text-red-600";
}

function isdBgColor(score: number): string {
  if (score >= 0.6) return "bg-emerald-500";
  if (score >= 0.3) return "bg-amber-400";
  return "bg-red-500";
}

export function TestDashboardPage({ data }: TestDashboardPageProps) {
  const { artifacts } = data;

  const totalMethods = artifacts.reduce((sum, a) => sum + a.methodCount, 0);
  const overallAvgIsd =
    totalMethods > 0
      ? artifacts.reduce((sum, a) => sum + a.avgIsd * a.methodCount, 0) / totalMethods
      : 0;
  const overallCoverage =
    totalMethods > 0
      ? Math.round(
          artifacts.reduce((sum, a) => sum + (a.coveragePercent / 100) * a.methodCount, 0) /
            totalMethods *
            100,
        )
      : 0;

  return (
    <div>
      <Breadcrumb items={[{ label: "Tests" }, { label: "Dashboard" }]} />

      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Test Dashboard
      </h1>
      <p className="text-text-secondary mb-8">
        DSTI test intelligence overview across all artifacts.
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="px-5 py-4 rounded-lg bg-surface-secondary border border-border">
          <div className="text-3xl font-bold text-text-primary">{totalMethods}</div>
          <div className="text-xs text-text-tertiary mt-1">Methods Analyzed</div>
        </div>
        <div className="px-5 py-4 rounded-lg bg-surface-secondary border border-border">
          <div className={`text-3xl font-bold ${isdColor(overallAvgIsd)}`}>
            {overallAvgIsd.toFixed(2)}
          </div>
          <div className="text-xs text-text-tertiary mt-1">Average ISD Score</div>
        </div>
        <div className="px-5 py-4 rounded-lg bg-surface-secondary border border-border">
          <div className="text-3xl font-bold text-text-primary">{overallCoverage}%</div>
          <div className="text-xs text-text-tertiary mt-1">DSTI Coverage</div>
        </div>
      </div>

      {/* Per-artifact cards */}
      <h2 className="text-lg font-semibold text-text-primary mb-4">
        Artifacts
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {artifacts.map((art) => (
          <ArtifactCard key={art.label} artifact={art} />
        ))}
      </div>

      {artifacts.length === 0 && (
        <div className="text-center py-12 text-text-tertiary">
          No artifacts with DSTI intent data found. Run the processor with DSTI
          enabled to populate intent signals.
        </div>
      )}
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: TestDashboardArtifact }) {
  return (
    <a
      href={`/${artifact.slug}`}
      className="block p-5 rounded-xl border border-border hover:border-primary-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-3 mb-3">
        {artifact.color && (
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: artifact.color }}
          />
        )}
        <h3 className="text-base font-semibold text-text-primary group-hover:text-primary-600 truncate">
          {artifact.label}
        </h3>
      </div>

      <div className="space-y-3">
        {/* ISD Score */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-tertiary">Avg. ISD</span>
            <span className={`text-sm font-mono font-medium ${isdColor(artifact.avgIsd)}`}>
              {artifact.avgIsd.toFixed(2)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
            <div
              className={`h-full rounded-full ${isdBgColor(artifact.avgIsd)} transition-all`}
              style={{ width: `${Math.round(artifact.avgIsd * 100)}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-xs text-text-tertiary">
          <span>{artifact.methodCount} methods</span>
          <span>{artifact.coveragePercent}% coverage</span>
        </div>
      </div>
    </a>
  );
}
