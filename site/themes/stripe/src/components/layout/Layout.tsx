"use client";

import React, { useState } from "react";
import type { NavigationTree, SiteData } from "@docspec/core";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";

interface LayoutProps {
  children: React.ReactNode;
  navigation: NavigationTree;
  siteName: string;
  logo?: string;
  currentSlug?: string;
  referenceIndex?: Record<string, string>;
}

export function Layout({
  children,
  navigation,
  siteName,
  logo,
  currentSlug,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Determine active tab from the current URL slug
  const normalizedSlug = currentSlug?.replace(/^\//, "") ?? "";
  const activeTab: "docs" | "tests" = normalizedSlug.startsWith("tests") ? "tests" : "docs";

  // Filter sidebar sections to only show those matching the active tab
  const filteredNavigation = {
    sections: navigation.sections.filter(
      (s) => !s.tab || s.tab === activeTab,
    ),
  };

  return (
    <div className="min-h-screen bg-surface">
      <Header
        siteName={siteName}
        logo={logo}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeTab={activeTab}
      />
      <div className="flex">
        {sidebarOpen && (
          <aside className="fixed top-14 left-0 bottom-0 w-[280px] border-r border-border overflow-y-auto bg-surface-secondary">
            <Sidebar
              navigation={filteredNavigation}
              currentSlug={currentSlug}
            />
          </aside>
        )}
        <main
          className={`flex-1 min-w-0 pt-14 ${sidebarOpen ? "ml-[280px]" : ""}`}
        >
          <div className="max-w-4xl mx-auto px-8 py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
