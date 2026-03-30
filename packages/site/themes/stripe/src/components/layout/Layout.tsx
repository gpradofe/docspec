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
  const [selectedArtifact, setSelectedArtifact] = useState<string | undefined>(activeArtifact);

  // Filter navigation by lens tab AND by selected artifact
  const filteredNavigation: NavigationTree = {
    sections: navigation.sections
      .filter((s) => !s.tab || s.tab === lens)
      .map((s) => {
        if (!selectedArtifact) return s;
        // Filter section items to only show the selected artifact's items
        const filteredItems = s.items.filter((item) => {
          // If item label matches selected artifact, keep it
          if (item.label === selectedArtifact) return true;
          // If item has no artifact association (like "Flows" container, "Dashboard"), keep it
          if (!item.slug || item.slug === "/" || item.slug === "/tests") return true;
          // Check if slug contains the artifact name
          const artifactSlug = selectedArtifact.toLowerCase().replace(/\s+/g, "-");
          if (item.slug?.includes(artifactSlug)) return true;
          // Check children
          if (item.children?.some((c) => c.slug?.includes(artifactSlug))) return true;
          return false;
        });
        return { ...s, items: filteredItems };
      })
      .filter((s) => s.items.length > 0),
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
          activeArtifact={selectedArtifact}
          onArtifactChange={(label) => {
            // Toggle: clicking same artifact deselects (shows all)
            setSelectedArtifact(selectedArtifact === label ? undefined : label);
            onArtifactChange?.(label);
          }}
        />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {sidebarOpen && (
            <Sidebar
              navigation={filteredNavigation}
              currentSlug={currentSlug}
              lens={lens}
              artifacts={artifacts}
              activeArtifact={selectedArtifact}
              onArtifactChange={(label) => {
                setSelectedArtifact(selectedArtifact === label ? undefined : label);
              }}
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
