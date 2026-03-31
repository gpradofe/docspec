"use client";

import React from "react";
import { T } from "../../lib/tokens.js";

interface HeaderProps {
  siteName: string;
  logo?: string;
  lens: "docs" | "tests";
  onLensChange: (lens: "docs" | "tests") => void;
  onToggleSidebar: () => void;
  onOpenSearch?: () => void;
  artifacts?: Array<{ label: string; color?: string }>;
  activeArtifact?: string;
  selectedArtifacts?: Set<string>;
  onArtifactChange?: (label: string) => void;
}

export function Header({
  siteName,
  logo,
  lens,
  onLensChange,
  onToggleSidebar,
  onOpenSearch,
  artifacts,
  activeArtifact,
  selectedArtifacts,
  onArtifactChange,
}: HeaderProps) {
  return (
    <header
      style={{
        height: 48,
        borderBottom: `1px solid ${T.surfaceBorder}`,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
        flexShrink: 0,
      }}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        style={{
          display: "none",
          padding: 6,
          border: "none",
          background: "none",
          cursor: "pointer",
          color: T.textDim,
        }}
        className="sidebar-toggle"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M3 5h12M3 9h12M3 13h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Left: Logo + site name + v3 tag */}
      {logo ? (
        <img src={logo} alt="" style={{ height: 26 }} />
      ) : (
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: `linear-gradient(135deg,${T.accent},${T.accentDim})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          D
        </div>
      )}

      <span
        style={{
          fontSize: 15,
          fontWeight: 720,
          letterSpacing: "-0.02em",
          color: T.text,
        }}
      >
        {siteName}
      </span>

      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: "2px 7px",
          borderRadius: 4,
          background: T.accent + "14",
          color: T.accent,
          border: `1px solid ${T.accent}30`,
          fontFamily: T.mono,
          letterSpacing: "0.02em",
          lineHeight: "16px",
          display: "inline-block",
        }}
      >
        v3
      </span>

      {/* Center: Docs/Tests lens toggle */}
      <div
        style={{
          display: "flex",
          gap: 2,
          marginLeft: 12,
          background: "rgba(255,255,255,0.03)",
          borderRadius: 7,
          padding: 3,
        }}
      >
        {(["docs", "tests"] as const).map((t) => (
          <button
            key={t}
            onClick={() => onLensChange(t)}
            style={{
              padding: "5px 14px",
              fontSize: 11.5,
              fontWeight: lens === t ? 650 : 400,
              background:
                lens === t ? "rgba(129,140,248,0.12)" : "transparent",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
              color: lens === t ? T.accentText : T.textDim,
              transition: "all 0.15s",
              fontFamily: T.sans,
            }}
          >
            {t === "tests" ? "Tests" : "Docs"}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: Search box */}
      <div
        onClick={onOpenSearch}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpenSearch?.();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          background: T.surface,
          border: `1px solid ${T.surfaceBorder}`,
          borderRadius: 8,
          fontSize: 12,
          color: T.textDim,
          minWidth: 180,
          cursor: "pointer",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = T.accent + "50")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = T.surfaceBorder)
        }
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          style={{ opacity: 0.4 }}
        >
          <circle
            cx="7"
            cy="7"
            r="5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M11 11l3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Search docs...
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            fontFamily: T.mono,
            opacity: 0.4,
          }}
        >
          Ctrl+K
        </span>
      </div>

      {/* Far right: colored dots for each artifact */}
      {artifacts && artifacts.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginLeft: 8,
          }}
        >
          {artifacts.map((artifact) => {
            const isSelected = selectedArtifacts
              ? selectedArtifacts.has(artifact.label)
              : artifact.label === activeArtifact;
            return (
              <div
                key={artifact.label}
                onClick={() => onArtifactChange?.(artifact.label)}
                title={`${artifact.label}${isSelected ? " (selected)" : ""}`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  cursor: "pointer",
                  background: isSelected
                    ? artifact.color || T.accent
                    : "transparent",
                  border: `2px solid ${artifact.color || T.accent}`,
                  transition: "all 0.2s",
                  opacity: isSelected ? 1 : 0.35,
                }}
              />
            );
          })}
        </div>
      )}
    </header>
  );
}
