"use client";

import React, { useState } from "react";
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
  lens: externalLens,
  onLensChange: externalOnLensChange,
}: LayoutProps) {
  const [internalLens, setInternalLens] = useState<Lens>("docs");
  const lens = externalLens ?? internalLens;
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
