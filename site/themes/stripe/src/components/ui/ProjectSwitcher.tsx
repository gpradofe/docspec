"use client";

import React, { useState, useRef, useEffect } from "react";

interface ProjectSwitcherProps {
  artifacts: Array<{ label: string; color?: string; version?: string }>;
  active?: string;
  onChange?: (label: string) => void;
}

export function ProjectSwitcher({ artifacts, active, onChange }: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = artifacts.find((a) => a.label === active) || artifacts[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 12 }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          border: "1px solid var(--ds-border, #e2e8f0)",
          borderRadius: 6,
          background: "var(--ds-surface-primary, #fff)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        {/* Colored square icon */}
        <div style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          background: current?.color || "var(--ds-primary, #6366f1)",
          flexShrink: 0,
        }} />
        <span style={{
          flex: 1,
          textAlign: "left",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--ds-text-primary, #0f172a)",
        }}>
          {current?.label || "Select project"}
        </span>
        {current?.version && (
          <span style={{
            fontSize: 11,
            color: "var(--ds-text-tertiary, #94a3b8)",
            fontFamily: "var(--font-mono)",
          }}>
            v{current.version}
          </span>
        )}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--ds-surface-primary, #fff)",
          border: "1px solid var(--ds-border, #e2e8f0)",
          borderRadius: 6,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          zIndex: 50,
          padding: 4,
        }}>
          {artifacts.map((artifact) => (
            <button
              key={artifact.label}
              onClick={() => { onChange?.(artifact.label); setOpen(false); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                border: "none",
                borderRadius: 4,
                background: artifact.label === active ? "var(--ds-primary-light, #eef2ff)" : "transparent",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              <div style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: artifact.color || "var(--ds-primary, #6366f1)",
                flexShrink: 0,
              }} />
              <span style={{
                flex: 1,
                textAlign: "left",
                fontSize: 12,
                color: "var(--ds-text-primary, #0f172a)",
                fontWeight: artifact.label === active ? 500 : 400,
              }}>
                {artifact.label}
              </span>
              {artifact.version && (
                <span style={{
                  fontSize: 10,
                  color: "var(--ds-text-tertiary)",
                  fontFamily: "var(--font-mono)",
                }}>
                  {artifact.version}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
