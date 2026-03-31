"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  const allArtifactLabels = (artifacts || []).map((a) => a.label);
  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<string>>(new Set(allArtifactLabels));

  // After hydration, restore persisted artifact selection from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("docspec-artifacts");
    if (stored && stored !== "all") {
      try {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedArtifacts(new Set(parsed));
        }
      } catch {}
    }
  }, []);

  // Persist artifact selection changes to sessionStorage
  useEffect(() => {
    if (selectedArtifacts.size === allArtifactLabels.length) {
      sessionStorage.setItem("docspec-artifacts", "all");
    } else {
      sessionStorage.setItem("docspec-artifacts", JSON.stringify([...selectedArtifacts]));
    }
  }, [selectedArtifacts, allArtifactLabels.length]);

  // Toggle a single artifact in multi-select (at least 1 must remain)
  const toggleArtifact = useCallback((label: string) => {
    setSelectedArtifacts((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        if (next.size > 1) next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  // Filter navigation by lens tab AND by selected artifact
  // In tests lens: show Tests section AND Libraries section (same class tree with test badges)
  // In docs lens: show all docs sections, hide Tests
  const filteredNavigation: NavigationTree = {
    sections: navigation.sections
      .filter((s) => {
        if (!s.tab) return true;
        if (lens === "tests") return s.tab === "tests" || s.title === "Libraries";
        return s.tab === "docs";
      })
      .map((s) => {
        // If all artifacts selected, no filtering needed
        if (selectedArtifacts.size === allArtifactLabels.length) return s;
        // Filter section items to only show selected artifacts' items
        const filteredItems = s.items.filter((item) => {
          // If item label matches any selected artifact, keep it
          if (selectedArtifacts.has(item.label)) return true;
          // If item has no artifact association, keep it
          if (!item.slug || item.slug === "/" || item.slug === "/tests") return true;
          // Check if slug contains any selected artifact name
          for (const art of selectedArtifacts) {
            const artifactSlug = art.toLowerCase().replace(/\s+/g, "-");
            if (item.slug?.includes(artifactSlug)) return true;
            if (item.children?.some((c) => c.slug?.includes(artifactSlug))) return true;
          }
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
          activeArtifact={selectedArtifacts.size === allArtifactLabels.length ? undefined : [...selectedArtifacts][0]}
          onArtifactChange={(label) => {
            toggleArtifact(label);
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
              activeArtifact={selectedArtifacts.size === allArtifactLabels.length ? undefined : [...selectedArtifacts][0]}
              onArtifactChange={(label) => {
                toggleArtifact(label);
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
