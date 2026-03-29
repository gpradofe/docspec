"use client";

import React, { useState } from "react";
import type { LandingPageData } from "@docspec/core";
import { T, CH, SC, KIND_COLORS } from "../../lib/tokens.js";

interface LandingPageProps {
  data: LandingPageData;
}

const DEFAULT_CARD_COLORS = [T.accent, T.blue, T.orange, T.green, T.pink, T.yellow];

export function LandingPage({ data }: LandingPageProps) {
  const { artifacts } = data;
  const [hoveredIdx, setHoveredIdx] = useState(-1);

  const totalMembers = artifacts.reduce((sum, a) => sum + a.memberCount, 0);
  const totalModules = artifacts.reduce((sum, a) => sum + a.moduleCount, 0);
  const totalEndpoints = artifacts.reduce((sum, a) => sum + a.endpointCount, 0);
  const avgCoverage = artifacts.length > 0
    ? Math.round(artifacts.reduce((sum, a) => sum + (a.coveragePercent ?? 0), 0) / artifacts.length)
    : 0;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      {/* Meta-dogfooding badge */}
      <div
        style={{
          display: "inline-block",
          padding: "3px 10px",
          borderRadius: 6,
          background: T.accentBg,
          border: `1px solid ${T.accentBorder}`,
          color: T.accent,
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        Meta-dogfooding · DocSpec documents itself
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 750,
          color: T.text,
          letterSpacing: "-0.03em",
          margin: "0 0 8px",
        }}
      >
        DocSpec Documentation
      </h1>

      {/* Description */}
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.7,
          color: T.textMuted,
          margin: "0 0 32px",
          maxWidth: 560,
        }}
      >
        Universal documentation specification & test intelligence engine. Browse
        all documented artifacts, modules, and API endpoints.
      </p>

      {/* Project cards — 3-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: artifacts.length >= 3 ? "1fr 1fr 1fr" : `repeat(${Math.min(artifacts.length, 3)}, 1fr)`,
          gap: 12,
          marginBottom: 28,
        }}
      >
        {artifacts.map((artifact, i) => {
          const color = artifact.color || DEFAULT_CARD_COLORS[i % DEFAULT_CARD_COLORS.length];
          const initial = artifact.label.split(" ").pop()?.[0] ?? "D";
          return (
            <a
              key={artifact.slug}
              href={`/${artifact.slug}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(-1)}
              style={{
                display: "block",
                padding: "20px 18px",
                borderRadius: 10,
                border: `1px solid ${hoveredIdx === i ? color + "60" : T.surfaceBorder}`,
                background: T.cardBg,
                cursor: "pointer",
                transition: "all 0.25s ease",
                transform: hoveredIdx === i ? "translateY(-3px)" : "none",
                boxShadow: hoveredIdx === i ? `0 8px 30px ${color}15` : "none",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                {/* Colored gradient icon */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: `linear-gradient(135deg,${color},${color}90)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initial}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 650, color: T.text }}>
                    {artifact.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: T.textDim,
                      fontFamily: T.mono,
                    }}
                  >
                    {artifact.coveragePercent !== undefined
                      ? `${artifact.coveragePercent}% coverage`
                      : `${artifact.moduleCount} modules`}
                  </div>
                </div>
              </div>
              {artifact.description && (
                <p
                  style={{
                    fontSize: 12.5,
                    color: T.textMuted,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {artifact.description}
                </p>
              )}
            </a>
          );
        })}
      </div>

      {/* Quick Stats row */}
      <div
        style={{
          padding: "20px 24px",
          borderRadius: 10,
          background: T.surface,
          border: `1px solid ${T.surfaceBorder}`,
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: T.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 14,
          }}
        >
          Quick Stats
        </div>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          {[
            [String(totalMembers), "Classes", T.accent],
            [String(totalEndpoints), "Methods", T.blue],
            [String(totalModules), "Modules", T.orange],
            [String(Object.keys(CH).length), "Channels", T.green],
            [`${avgCoverage}%`, "Coverage", T.green],
            [String(artifacts.length), "Artifacts", T.accentText],
          ].map(([v, l, c]) => (
            <div key={l}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 780,
                  color: c,
                  letterSpacing: "-0.02em",
                }}
              >
                {v}
              </div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
