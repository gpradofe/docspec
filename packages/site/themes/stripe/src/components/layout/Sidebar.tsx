"use client";

import React, { useState, useRef, useEffect } from "react";
import type { NavigationTree, NavigationNode } from "@docspec/core";
import { T, MC, KIND_COLORS } from "../../lib/tokens.js";

interface SidebarProps {
  navigation: NavigationTree;
  currentSlug?: string;
  lens: "docs" | "tests";
  artifacts?: Array<{ label: string; color?: string; version?: string }>;
  activeArtifact?: string;
  selectedArtifacts?: Set<string>;
  onArtifactChange?: (label: string) => void;
}

interface ExtendedNavigationNode extends NavigationNode {
  httpMethod?: string;
  kind?: string;
  testCount?: number;
  testStatus?: "pass" | "warn" | "fail";
  isdScore?: number;
}

function Tag({
  children,
  color = T.accent,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 4,
        background: color + "14",
        color,
        border: `1px solid ${color}30`,
        fontFamily: T.mono,
        letterSpacing: "0.02em",
        lineHeight: "16px",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function kindBadgeLetter(kind: string): string {
  const map: Record<string, string> = {
    class: "C",
    interface: "I",
    enum: "E",
    record: "R",
    annotation: "A",
    struct: "S",
    trait: "T",
    function: "F",
    module: "M",
    endpoint: "EP",
  };
  return map[kind] || kind.charAt(0).toUpperCase();
}

function testStatusIcon(status?: "pass" | "warn" | "fail"): string {
  if (status === "pass") return "OK";
  if (status === "warn") return "!!";
  if (status === "fail") return "X";
  return "";
}

function testStatusColor(status?: "pass" | "warn" | "fail"): string {
  if (status === "pass") return T.green;
  if (status === "warn") return T.yellow;
  if (status === "fail") return T.red;
  return T.textDim;
}

export function Sidebar({
  navigation,
  currentSlug,
  lens,
  artifacts,
  activeArtifact,
  selectedArtifacts,
  onArtifactChange,
}: SidebarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedCount = selectedArtifacts?.size ?? artifacts?.length ?? 0;
  const allSelected = selectedCount === (artifacts?.length ?? 0);
  const current = allSelected
    ? null  // show "All Projects" when all selected
    : artifacts?.find((a) => selectedArtifacts?.has(a.label)) || artifacts?.[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalItems = navigation.sections.reduce(
    (sum, s) => sum + s.items.length,
    0,
  );

  return (
    <nav
      style={{
        width: 240,
        borderRight: `1px solid ${T.surfaceBorder}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        background: T.bg,
        overflow: "hidden",
      }}
    >
      {/* Project Switcher */}
      {artifacts && artifacts.length > 0 && (
        <div
          style={{ padding: "12px 10px", position: "relative" }}
          ref={dropdownRef}
        >
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "9px 10px",
              background: T.surface,
              border: `1px solid ${T.surfaceBorder}`,
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.15s",
              fontFamily: T.sans,
              color: T.text,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = T.accent + "40")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = T.surfaceBorder)
            }
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: `linear-gradient(135deg,${current?.color || T.accent},${(current?.color || T.accent)}90)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {allSelected ? "A" : (current?.label || "P").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 640,
                  color: T.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {allSelected ? "All Projects" : selectedCount > 1 ? `${selectedCount} Projects` : (current?.label || "Select project")}
              </div>
              {!allSelected && selectedCount === 1 && current?.version && (
                <div
                  style={{
                    fontSize: 10.5,
                    color: T.textDim,
                    fontFamily: T.mono,
                  }}
                >
                  {current.version}
                </div>
              )}
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              style={{
                opacity: 0.3,
                transition: "transform 0.15s",
                transform: dropdownOpen ? "rotate(180deg)" : "none",
                flexShrink: 0,
              }}
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                zIndex: 999,
                left: 10,
                right: 10,
                top: "100%",
                marginTop: 2,
                background: T.bg,
                border: `1px solid ${T.surfaceBorder}`,
                borderRadius: 10,
                boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                padding: 4,
              }}
            >
              {artifacts.map((artifact) => {
                const isSelected = selectedArtifacts?.has(artifact.label) ?? true;
                return (
                  <button
                    key={artifact.label}
                    onClick={() => {
                      onArtifactChange?.(artifact.label);
                      // Don't close — multi-select
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 8px",
                      background: isSelected
                        ? (artifact.color || T.accent) + "14"
                        : "transparent",
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                      fontFamily: T.sans,
                      color: T.text,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = T.surfaceHover;
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {/* Selection indicator */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: `2px solid ${artifact.color || T.accent}`,
                        background: isSelected ? (artifact.color || T.accent) : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.15s",
                      }}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 550,
                          color: T.text,
                        }}
                      >
                        {artifact.label}
                      </div>
                      {artifact.version && (
                        <div
                          style={{
                            fontSize: 10,
                            color: T.textDim,
                            fontFamily: T.mono,
                          }}
                        >
                          v{artifact.version}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Scrollable nav content */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 8px 16px" }}>
        {navigation.sections.map((section) => (
          <SidebarSection
            key={section.title}
            title={section.title}
            items={section.items}
            currentSlug={currentSlug}
            lens={lens}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: `1px solid ${T.surfaceBorder}`,
          fontSize: 10,
          color: T.textDim,
        }}
      >
        Generated by{" "}
        <span style={{ fontWeight: 650, color: T.accent }}>DocSpec v3</span>
        {totalItems > 0 && (
          <span> &middot; {totalItems} classes</span>
        )}
      </div>
    </nav>
  );
}

/** Map icon identifier strings to short text labels */
const ICON_MAP: Record<string, string> = {};

function SidebarSection({
  title,
  items,
  currentSlug,
  lens,
}: {
  title: string;
  items: NavigationNode[];
  currentSlug?: string;
  lens: "docs" | "tests";
}) {
  // Hide empty sections
  if (!items || items.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 730,
          color: T.textDim,
          letterSpacing: "0.1em",
          padding: "8px 8px 4px",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {items.map((item) => (
        <SidebarItem
          key={(item as ExtendedNavigationNode).slug || item.label}
          item={item as ExtendedNavigationNode}
          currentSlug={currentSlug}
          lens={lens}
          depth={0}
        />
      ))}
    </div>
  );
}

function SidebarItem({
  item,
  currentSlug,
  lens,
  depth,
}: {
  item: ExtendedNavigationNode;
  currentSlug?: string;
  lens: "docs" | "tests";
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);
  const normalizedSlug = item.slug?.replace(/^\//, "");
  const isActive =
    currentSlug === item.slug || currentSlug === normalizedSlug;
  const hasChildren = item.children && item.children.length > 0;

  const href = item.slug
    ? item.slug.startsWith("/")
      ? item.slug
      : `/${item.slug}`
    : "#";

  return (
    <div>
      <a
        href={href}
        title={
          lens === "tests"
            ? `${item.label}${item.testCount !== undefined ? ` \u2014 ${item.testCount} tests` : ""}${item.isdScore !== undefined ? `, ISD ${(item.isdScore * 100).toFixed(0)}%` : ""}`
            : item.label
        }
        onClick={(e) => {
          if (hasChildren && !item.slug) {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: `6px 8px 6px ${8 + depth * 12}px`,
          background: isActive
            ? "rgba(129,140,248,0.1)"
            : hovered
              ? T.surfaceHover
              : "transparent",
          borderRadius: 6,
          cursor: "pointer",
          textAlign: "left",
          fontSize: 12.5,
          fontWeight: isActive ? 600 : 420,
          color: isActive ? T.accent : T.textMuted,
          transition: "all 0.12s",
          textDecoration: "none",
          fontFamily: T.sans,
        }}
      >
        {/* Collapse chevron for parent items */}
        {hasChildren && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
              opacity: 0.4,
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            <path
              d="M3.5 2l3.5 3-3.5 3"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Lens-aware badges */}
        {lens === "docs" ? (
          <>
            {item.httpMethod && MC[item.httpMethod] ? (
              <Tag color={MC[item.httpMethod].text}>{item.httpMethod}</Tag>
            ) : item.kind ? (
              <Tag color={KIND_COLORS[item.kind] || T.accent}>
                {kindBadgeLetter(item.kind)}
              </Tag>
            ) : (
              item.icon && (
                <span style={{ fontSize: 12, flexShrink: 0 }}>
                  {ICON_MAP[item.icon] || ""}
                </span>
              )
            )}
          </>
        ) : (
          <>
            {item.testCount !== undefined && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: T.mono,
                  color: testStatusColor(item.testStatus),
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <span>{testStatusIcon(item.testStatus)}</span>
                <span>{item.testCount}</span>
              </span>
            )}
            {item.isdScore !== undefined && (
              <span
                style={{
                  fontSize: 9,
                  fontFamily: T.mono,
                  fontWeight: 500,
                  color: T.textDim,
                  background: T.surface,
                  padding: "1px 5px",
                  borderRadius: 3,
                  flexShrink: 0,
                }}
              >
                {(item.isdScore * 100).toFixed(0)}%
              </span>
            )}
          </>
        )}

        {/* Label */}
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
            minWidth: 0,
          }}
        >
          {item.label}
        </span>

        {/* Child count badge for collapsible sections */}
        {hasChildren && (
          <span
            style={{
              fontSize: 10,
              fontFamily: T.mono,
              color: T.textFaint,
              flexShrink: 0,
            }}
          >
            {item.children!.length}
          </span>
        )}
      </a>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {item.children!.map((child) => (
            <SidebarItem
              key={
                (child as ExtendedNavigationNode).slug || child.label
              }
              item={child as ExtendedNavigationNode}
              currentSlug={currentSlug}
              lens={lens}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
