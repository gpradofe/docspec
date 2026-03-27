"use client";

import React from "react";

interface HeaderProps {
  siteName: string;
  logo?: string;
  onToggleSidebar: () => void;
  onOpenSearch?: () => void;
  activeTab?: "docs" | "tests";
  artifacts?: Array<{ label: string; color?: string }>;
  activeArtifact?: string;
  onArtifactChange?: (label: string) => void;
}

export function Header({
  siteName,
  logo,
  onToggleSidebar,
  onOpenSearch,
  activeTab = "docs",
  artifacts,
  activeArtifact,
  onArtifactChange,
}: HeaderProps) {
  return (
    <header style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 52,
      background: "var(--ds-surface-primary, #ffffff)",
      borderBottom: "1px solid var(--ds-border, #e2e8f0)",
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
    }}>
      {/* Left: Logo + site name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            color: "var(--ds-text-secondary, #475569)",
          }}
          className="sidebar-toggle"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {logo ? (
          <img src={logo} alt="" style={{ height: 22 }} />
        ) : (
          <div style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            background: artifacts?.[0]?.color || "var(--ds-primary, #6366f1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--font-body, 'Inter', sans-serif)",
          }}>
            {siteName.charAt(0).toUpperCase()}
          </div>
        )}

        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--ds-text-primary, #0f172a)",
          fontFamily: "var(--font-body, 'Inter', sans-serif)",
          letterSpacing: "-0.01em",
        }}>
          {siteName}
        </span>

        <span style={{
          fontSize: 13,
          color: "var(--ds-text-tertiary, #94a3b8)",
          marginLeft: 2,
        }}>
          Docs
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Center-right: Search box */}
      <button
        onClick={onOpenSearch}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          background: "var(--ds-surface-secondary, #f8fafc)",
          border: "1px solid var(--ds-border, #e2e8f0)",
          borderRadius: 6,
          cursor: "pointer",
          transition: "all 0.15s ease",
          minWidth: 200,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="var(--ds-text-tertiary, #94a3b8)" strokeWidth="1.2" />
          <path d="M9.5 9.5L13 13" stroke="var(--ds-text-tertiary, #94a3b8)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span style={{
          fontSize: 13,
          color: "var(--ds-text-tertiary, #94a3b8)",
          flex: 1,
          textAlign: "left",
        }}>
          Search docs...
        </span>
        <kbd style={{
          fontSize: 10,
          fontFamily: "var(--font-mono, monospace)",
          color: "var(--ds-text-tertiary, #94a3b8)",
          background: "var(--ds-surface-primary, #fff)",
          border: "1px solid var(--ds-border, #e2e8f0)",
          borderRadius: 3,
          padding: "1px 5px",
        }}>
          ⌘K
        </kbd>
      </button>

      {/* Far right: colored dots for each artifact */}
      {artifacts && artifacts.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 16 }}>
          {artifacts.map((artifact) => (
            <button
              key={artifact.label}
              onClick={() => onArtifactChange?.(artifact.label)}
              title={artifact.label}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: artifact.color || "var(--ds-primary, #6366f1)",
                border: artifact.label === activeArtifact
                  ? "2px solid var(--ds-text-primary, #0f172a)"
                  : "2px solid transparent",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.15s ease",
              }}
            />
          ))}
        </div>
      )}
    </header>
  );
}
