"use client";

import React, { useState, useEffect } from "react";
import type { NavigationTree } from "@docspec/core";
import { T } from "../../lib/tokens.js";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";
import { LensProvider, type Lens } from "../../context/LensContext.js";

interface LayoutProps {
  children: React.ReactNode;
  navigation: NavigationTree;
  siteName: string;
  logo?: string;
  currentSlug?: string;
  referenceIndex?: Record<string, string>;
  artifacts?: Array<{ label: string; color?: string; version?: string }>;
  activeArtifact?: string;
  onArtifactChange?: (label: string) => void;
  onOpenSearch?: () => void;
  initialLens?: Lens;
  lens?: Lens;
  onLensChange?: (lens: Lens) => void;
}

export function Layout({
  children,
  navigation,
  siteName,
  logo,
  currentSlug,
  artifacts,
  activeArtifact,
  onArtifactChange,
  onOpenSearch,
  initialLens,
  lens: externalLens,
  onLensChange: externalOnLensChange,
}: LayoutProps) {
  // Start with initialLens (SSR-safe), then restore from sessionStorage after hydration
  const [internalLens, setInternalLens] = useState<Lens>(initialLens || "docs");
  const lens = externalLens ?? internalLens;

  // After hydration, restore persisted lens from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("docspec-lens");
    if (stored === "docs" || stored === "tests") {
      setInternalLens(stored as Lens);
    }
  }, []);

  // Persist lens changes to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("docspec-lens", lens);
  }, [lens]);

  const setLens = externalOnLensChange ?? setInternalLens;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const filteredNavigation: NavigationTree = {
    sections: navigation.sections.filter(
      (s) => !s.tab || s.tab === lens,
    ),
  };

  return (
    <LensProvider lens={lens} setLens={setLens}>
      <div
        style={{
          fontFamily: T.sans,
          color: T.text,
          background: T.bg,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Header
          siteName={siteName}
          logo={logo}
          lens={lens}
          onLensChange={setLens}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSearch={onOpenSearch}
          artifacts={artifacts}
          activeArtifact={activeArtifact}
          onArtifactChange={onArtifactChange}
        />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {sidebarOpen && (
            <Sidebar
              navigation={filteredNavigation}
              currentSlug={currentSlug}
              lens={lens}
              artifacts={artifacts}
              activeArtifact={activeArtifact}
              onArtifactChange={onArtifactChange}
            />
          )}
          <main style={{ flex: 1, overflow: "auto" }}>
            <div style={{ padding: "32px 40px 40px" }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </LensProvider>
  );
}
