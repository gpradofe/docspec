"use client";

import React, { useState } from "react";
import type { NavigationTree, NavigationNode } from "@docspec/core";

interface SidebarProps {
  navigation: NavigationTree;
  currentSlug?: string;
}

const SECTION_ICONS: Record<string, string> = {
  Learn: "📖",
  "API Reference": "🔌",
  Libraries: "📦",
  Architecture: "🏗️",
  Changelog: "📋",
};

export function Sidebar({ navigation, currentSlug }: SidebarProps) {
  return (
    <nav className="py-4 px-3">
      {navigation.sections.map((section) => (
        <SidebarSection
          key={section.title}
          title={section.title}
          items={section.items}
          currentSlug={currentSlug}
        />
      ))}
    </nav>
  );
}

function SidebarSection({
  title,
  items,
  currentSlug,
}: {
  title: string;
  items: NavigationNode[];
  currentSlug?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const icon = SECTION_ICONS[title] || "📄";

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center w-full px-2 py-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider hover:text-text-primary"
      >
        <span className="mr-1.5">{icon}</span>
        {title}
        <svg
          className={`ml-auto w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {expanded && (
        <ul className="mt-0.5">
          {items.map((item) => (
            <SidebarItem
              key={item.slug || item.label}
              item={item}
              currentSlug={currentSlug}
              depth={0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SidebarItem({
  item,
  currentSlug,
  depth,
}: {
  item: NavigationNode;
  currentSlug?: string;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const normalizedSlug = item.slug?.replace(/^\//, "");
  const isActive =
    currentSlug === item.slug ||
    currentSlug === normalizedSlug;
  const hasChildren = item.children && item.children.length > 0;

  return (
    <li>
      <div className="flex items-center">
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-5 h-5 flex items-center justify-center flex-shrink-0"
          >
            <svg
              className={`w-3 h-3 text-text-tertiary transition-transform ${expanded ? "rotate-90" : ""}`}
              viewBox="0 0 12 12"
              fill="none"
            >
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <a
          href={item.slug ? (item.slug.startsWith("/") ? item.slug : `/${item.slug}`) : "#"}
          className={`flex-1 block px-2 py-1 text-sm rounded-md transition-colors ${
            isActive
              ? "bg-primary-50 text-primary-700 font-medium"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-tertiary"
          }`}
          style={{ paddingLeft: `${(depth + (hasChildren ? 0 : 1)) * 12 + 8}px` }}
        >
          {item.label}
        </a>
      </div>
      {hasChildren && expanded && (
        <ul>
          {item.children!.map((child) => (
            <SidebarItem
              key={child.slug || child.label}
              item={child}
              currentSlug={currentSlug}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
